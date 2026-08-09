import { z } from 'zod';
import { router, adminProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { desc, eq, sql, gte, and, inArray } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import {
  AGENT_TOOLS, runAgentTool, isStagingTool, executeAction, retryAction,
  checkEmailBody, DEPOSIT_PLACEHOLDER, WAIVER_PLACEHOLDER, linkButton, stripGreetingAndSignoff,
} from '../agent-tools.js';
import { renderMarketingEmail } from '../email.js';
import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { Resend } from 'resend';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AGENT_MODEL = 'claude-sonnet-5';

// Safety stop for the tool loop — a runaway agent burns tokens, not money.
const MAX_TOOL_TURNS = 8;

// Structured outputs: the API enforces these schemas, so the model physically
// cannot answer with a markdown-fenced or truncated object. This replaces the
// old "Return ONLY valid JSON" prompt + bare JSON.parse, which threw whenever
// the model wrapped its reply in ```json or ran past max_tokens.
const SOCIAL_POST_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Post text, no hashtags.' },
      hashtags: { type: 'string', description: 'Hashtags, or empty string.' },
      image_suggestion: { type: 'string', description: 'Ideal photo description.' },
    },
    required: ['content', 'hashtags', 'image_suggestion'],
    additionalProperties: false,
  },
} as const;

const BLOG_POST_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      slug: { type: 'string' },
      excerpt: { type: 'string' },
      content: { type: 'string', description: 'Full HTML blog post body.' },
      category: { type: 'string' },
      tags: { type: 'string', description: 'Comma-separated tags.' },
    },
    required: ['title', 'slug', 'excerpt', 'content', 'category', 'tags'],
    additionalProperties: false,
  },
} as const;

// Structured outputs make malformed JSON impossible, but a truncated response
// (stop_reason 'max_tokens') still can't be parsed — surface that as a clear
// error instead of an unhandled throw that reaches the UI as "nothing happened".
function parseModelJson<T>(response: Anthropic.Message, label: string): T {
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`The ${label} was cut off before it finished. Try a shorter one, or raise max_tokens.`);
  }
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error(`[agent] could not parse ${label} response:`, text.slice(0, 500));
    throw new Error(`The model returned an unreadable ${label}. Please try again.`);
  }
}
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'bookings@blueskiesboatrentals.com';
const ADMIN_EMAIL = 'info@blueskiescharter.com';

async function notifyAdmin(subject: string, html: string) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
  } catch (err) {
    console.error('[Notify] Failed to send admin notification:', err);
  }
}

// Google Drive setup
const DRIVE_FOLDERS: Record<string, string> = {
  boats: '1Z8fpXMvTPcAGVMDn8dXQMeS7Gup65NNE',
  photos: '1u9i7fo_cg5LFokVAIqVhNhyWOWf-1KvV',
  trips: '1MXB7jELxmppFix1yaUiYma59t-Bp0JeZ',
  drone: '1TRhOQm6a9DyDW0f9p3d3_yu8HT4AMjJ-',
  fishing: '1d6FBeaHQio6NEyAmYGoo1COVJpNWtK2y',
};

const THEME_FOLDERS: Record<string, string[]> = {
  boat_feature: ['boats', 'drone'],
  local_spots: ['trips', 'photos'],
  testimonial: ['photos', 'trips'],
  booking_promo: ['boats', 'photos'],
  lifestyle: ['photos', 'trips', 'drone'],
  availability: ['boats', 'photos'],
  review_highlight: ['photos', 'trips'],
};

let driveClient: drive_v3.Drive | null = null;

function getDriveAuth(): InstanceType<typeof google.auth.GoogleAuth> | null {
  // Option 1: Key file path (local dev)
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    return new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  }
  // Option 2: Key JSON as env var (Render production)
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  if (keyJson) {
    const tmpPath = path.join(os.tmpdir(), 'gsa-key.json');
    fs.writeFileSync(tmpPath, keyJson);
    return new google.auth.GoogleAuth({
      keyFile: tmpPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  }
  return null;
}

async function getDrive(): Promise<drive_v3.Drive | null> {
  if (driveClient) return driveClient;
  const auth = getDriveAuth();
  if (!auth) return null;
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

async function pickPhotoForTheme(theme: string): Promise<{ fileId: string; fileName: string } | null> {
  const drive = await getDrive();
  if (!drive) return null;

  const folderKeys = THEME_FOLDERS[theme] || ['photos'];
  for (const key of folderKeys) {
    const folderId = DRIVE_FOLDERS[key];
    if (!folderId) continue;
    try {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/')`,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        corpora: 'allDrives',
        fields: 'files(id, name)',
        pageSize: 50,
      });
      const images = res.data.files || [];
      if (images.length > 0) {
        const pick = images[Math.floor(Math.random() * images.length)];
        return { fileId: pick.id!, fileName: pick.name! };
      }
    } catch (err) {
      console.error(`Drive folder ${key} error:`, err);
    }
  }
  return null;
}

export async function proxyDrivePhoto(fileId: string): Promise<Buffer | null> {
  const drive = await getDrive();
  if (!drive) return null;
  try {
    const res = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data as ArrayBuffer);
  } catch {
    return null;
  }
}

// Search Console API
const SEARCH_CONSOLE_SITE = 'https://blueskiesboatrentals.com';

function getSearchConsoleAuth(): InstanceType<typeof google.auth.GoogleAuth> | null {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    return new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
  }
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  if (keyJson) {
    const tmpPath = path.join(os.tmpdir(), 'gsa-key-sc.json');
    fs.writeFileSync(tmpPath, keyJson);
    return new google.auth.GoogleAuth({
      keyFile: tmpPath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
  }
  return null;
}

export async function fetchAndStoreSeoData(): Promise<{ queries: number; alerts: number; error?: string }> {
  const auth = getSearchConsoleAuth();
  if (!auth) {
    console.error('[SEO] No Google auth configured');
    return { queries: 0, alerts: 0, error: 'No Google auth configured' };
  }

  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Search Console data has ~3 day lag
  const endDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // Try both URL variants
  const siteUrls = [SEARCH_CONSOLE_SITE, 'https://www.blueskiesboatrentals.com', 'sc-domain:blueskiesboatrentals.com'];
  let response: any = null;
  let usedUrl = '';

  for (const siteUrl of siteUrls) {
    try {
      response = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions: ['query', 'page'],
          rowLimit: 100,
        },
      });
      usedUrl = siteUrl;
      console.log(`[SEO] Successfully fetched from ${siteUrl}`);
      break;
    } catch (err: any) {
      console.error(`[SEO] Failed with ${siteUrl}: ${err.message}`);
      continue;
    }
  }

  if (!response) {
    return { queries: 0, alerts: 0, error: 'Could not fetch from any Search Console property' };
  }

  try {

    const rows = response.data.rows || [];

    // Store snapshot
    for (const row of rows) {
      const query = row.keys?.[0] || '';
      const page = row.keys?.[1] || '';
      await db.insert(schema.seoSnapshots).values({
        date: today,
        query,
        page,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }

    // Detect changes vs previous snapshot
    const alerts: Array<{ type: string; message: string }> = [];
    const prevDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevData = await db.select()
      .from(schema.seoSnapshots)
      .where(eq(schema.seoSnapshots.date, prevDate));
    const prevMap = new Map(prevData.map(r => [r.query, r]));

    for (const row of rows) {
      const query = row.keys?.[0] || '';
      const prev = prevMap.get(query);
      if (!prev) {
        if ((row.clicks || 0) > 0) {
          alerts.push({ type: 'new_query', message: `New query: "${query}" (${row.clicks} clicks, pos ${(row.position || 0).toFixed(1)})` });
        }
        continue;
      }
      const posDiff = prev.position - (row.position || 0);
      if (posDiff > 5) {
        alerts.push({ type: 'rank_up', message: `"${query}" jumped ${posDiff.toFixed(1)} positions (now ${(row.position || 0).toFixed(1)})` });
      } else if (posDiff < -5) {
        alerts.push({ type: 'rank_down', message: `"${query}" dropped ${Math.abs(posDiff).toFixed(1)} positions (now ${(row.position || 0).toFixed(1)})` });
      }
    }

    for (const alert of alerts) {
      await db.insert(schema.seoAlerts).values({ date: today, type: alert.type, message: alert.message });
    }

    console.log(`[SEO] Snapshot: ${rows.length} queries, ${alerts.length} alerts`);
    return { queries: rows.length, alerts: alerts.length };
  } catch (err: any) {
    console.error('[SEO] Search Console processing failed:', err);
    return { queries: 0, alerts: 0, error: err.message || 'Processing failed' };
  }
}

// Content calendar themes
const CONTENT_CALENDAR: Record<number, string> = {
  1: 'boat_feature', 2: 'local_spots', 3: 'testimonial',
  4: 'booking_promo', 5: 'lifestyle', 6: 'availability', 0: 'review_highlight',
};

const THEME_PROMPTS: Record<string, string> = {
  boat_feature: 'Write a social media post featuring one of our Grady White boats (Freedom 285 or Canyon 306). Highlight specs, comfort, what makes it great for a day on the water.',
  local_spots: 'Write a post about a great local spot in the Florida Keys that customers can visit by boat — sandbars, Alligator Reef, snorkeling spots, Key Largo, Marathon.',
  testimonial: 'Write a post styled as sharing a customer experience. Create a realistic customer story about an amazing day on the water.',
  booking_promo: 'Write a post promoting booking with Blue Skies. Clear call-to-action, mention ease of online booking, flexible options.',
  lifestyle: 'Write a post capturing the Florida Keys boating lifestyle. Turquoise water, ocean breeze, freedom, family memories.',
  availability: 'Write a post about upcoming availability. "Spots still open" style. Create urgency.',
  review_highlight: 'Write a post highlighting a customer review. Frame it as "Review of the Week".',
};

// Gather business context for the AI chat
async function getBusinessContext(): Promise<string> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const today = now.toISOString().split('T')[0];

  const [
    totalCustomers,
    totalBookings,
    recentBookings,
    upcomingBookings,
    monthRevenue,
    prevMonthRevenue,
    pendingPosts,
    boats,
    recentEmails,
    pendingDeposits,
    partners,
    reviews,
    blackouts,
    quotes,
    blogPosts,
    completedBookings,
    cancelledBookings,
    topCustomers,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(schema.users),
    db.select({ count: sql<number>`count(*)` }).from(schema.bookings),
    db.select().from(schema.bookings).where(gte(schema.bookings.createdAt, weekAgo)).orderBy(desc(schema.bookings.createdAt)),
    db.select().from(schema.bookings).where(
      and(gte(schema.bookings.charterDate, today), eq(schema.bookings.status, 'confirmed'))
    ).orderBy(schema.bookings.charterDate),
    db.select({ total: sql<number>`COALESCE(sum(total), 0)` }).from(schema.bookings).where(
      and(gte(schema.bookings.createdAt, monthAgo), eq(schema.bookings.paymentStatus, 'paid'))
    ),
    // Previous month revenue for comparison
    db.select({ total: sql<number>`COALESCE(sum(total), 0)` }).from(schema.bookings).where(
      and(
        gte(schema.bookings.createdAt, new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()),
        sql`created_at < ${monthAgo}`,
        eq(schema.bookings.paymentStatus, 'paid')
      )
    ),
    db.select({ count: sql<number>`count(*)` }).from(schema.socialPosts).where(eq(schema.socialPosts.status, 'pending')),
    db.select().from(schema.boats).where(eq(schema.boats.status, 'active')),
    db.select().from(schema.emailLogs).orderBy(desc(schema.emailLogs.createdAt)).limit(15),
    db.select().from(schema.bookings).where(
      and(eq(schema.bookings.depositStatus, 'requested'), eq(schema.bookings.status, 'confirmed'))
    ),
    db.select().from(schema.partners).where(eq(schema.partners.status, 'active')),
    db.select().from(schema.reviews).orderBy(desc(schema.reviews.createdAt)).limit(10),
    db.select().from(schema.boatBlackouts).where(gte(schema.boatBlackouts.endDate, today)),
    db.select().from(schema.quotes).where(eq(schema.quotes.status, 'pending')).orderBy(desc(schema.quotes.createdAt)).limit(10),
    db.select({ count: sql<number>`count(*)` }).from(schema.posts).where(eq(schema.posts.status, 'published')),
    db.select({ count: sql<number>`count(*)` }).from(schema.bookings).where(eq(schema.bookings.status, 'completed')),
    db.select({ count: sql<number>`count(*)` }).from(schema.bookings).where(eq(schema.bookings.status, 'cancelled')),
    db.select().from(schema.users).orderBy(desc(schema.users.totalSpent)).limit(10),
  ]);

  const upcomingList = upcomingBookings.slice(0, 15).map(b => {
    const depositInfo = b.depositStatus === 'paid' ? 'deposit PAID' :
      b.depositStatus === 'requested' ? 'deposit PENDING' : 'no deposit';
    const payInfo = b.paymentStatus === 'paid' ? 'trip PAID' : 'trip UNPAID';
    const reviewInfo = b.reviewRequestedAt ? 'review sent' : '';
    const preTripInfo = b.preTripReminderAt ? 'pre-trip sent' : '';
    return `  - ${b.charterDate}: ${b.customerName} (${b.customerEmail}, ${b.customerPhone || 'no phone'}) — $${b.total} (${b.charterType}, ${b.duration}, ${b.guestCount} guests, boat #${b.boatId}) [${payInfo}, ${depositInfo}] ${reviewInfo} ${preTripInfo}`.trim();
  }).join('\n');

  const recentList = recentBookings.slice(0, 10).map(b =>
    `  - ${b.createdAt?.split('T')[0]}: ${b.customerName} (${b.customerEmail}) — $${b.total} (${b.status}, ${b.paymentStatus}, deposit: ${b.depositStatus}, source: ${b.source})`
  ).join('\n');

  const boatList = boats.map(b =>
    `  - ${b.name} (${b.model}, ${b.lengthFt}ft, ${b.capacity} guests) — $${b.priceHalfDay} half / $${b.priceFullDay} full`
  ).join('\n');

  const emailList = recentEmails.slice(0, 10).map(e =>
    `  - ${e.createdAt?.split('T')[0]}: ${e.type} → ${e.customerEmail} (${e.status}) "${e.subject}"`
  ).join('\n');

  const depositList = pendingDeposits.map(b =>
    `  - ${b.customerName} (${b.customerEmail}, ${b.customerPhone || 'no phone'}): $${b.depositAmount} deposit pending (trip ${b.charterDate}, $${b.total} total, ref: ${b.bookingRef})`
  ).join('\n');

  const partnerList = partners.map(p =>
    `  - ${p.businessName} (${p.contactName}, ${p.type}) — code: ${p.referralCode}, ${p.totalReferrals} referrals, $${Math.round(p.totalRevenue)} revenue, $${Math.round(p.totalCommission)} commission owed`
  ).join('\n');

  const reviewList = reviews.slice(0, 5).map(r =>
    `  - ${r.customerName}: ${r.rating}/5 — "${(r.comment || '').slice(0, 100)}" (${r.status})`
  ).join('\n');

  const blackoutList = blackouts.map(b =>
    `  - Boat #${b.boatId}: ${b.startDate} to ${b.endDate} (${b.reason || 'no reason'})`
  ).join('\n');

  const quoteList = quotes.map(q =>
    `  - ${q.customerName || 'unnamed'} (${q.customerPhone || q.customerEmail || 'no contact'}): ${q.charterDate}, ${q.duration}, $${q.price} (code: ${q.code}, platform: ${q.platform || 'direct'})`
  ).join('\n');

  const topCustomerList = topCustomers.filter(u => u.totalSpent > 0).slice(0, 10).map(u =>
    `  - ${u.name || 'unnamed'} (${u.email || 'no email'}, ${u.phone || 'no phone'}): $${Math.round(u.totalSpent)} spent, ${u.bookingCount} bookings, ${u.loyaltyPoints} points`
  ).join('\n');

  const thisMonth = Math.round(monthRevenue[0]?.total || 0);
  const lastMonth = Math.round(prevMonthRevenue[0]?.total || 0);
  const revenueChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

  return `TODAY: ${today}

BUSINESS SNAPSHOT:
- Total customers: ${totalCustomers[0]?.count || 0}
- Total bookings (all time): ${totalBookings[0]?.count || 0}
- Completed trips: ${completedBookings[0]?.count || 0}
- Cancelled bookings: ${cancelledBookings[0]?.count || 0}
- Revenue this month: $${thisMonth.toLocaleString()} (${revenueChange >= 0 ? '+' : ''}${revenueChange}% vs last month's $${lastMonth.toLocaleString()})
- Pending social posts: ${pendingPosts[0]?.count || 0}
- Pending deposits to collect: ${pendingDeposits.length}
- Published blog posts: ${blogPosts[0]?.count || 0}
- Active referral partners: ${partners.length}

FLEET:
${boatList || '  No active boats'}

BOAT BLACKOUTS/MAINTENANCE:
${blackoutList || '  None — all boats available'}

UPCOMING BOOKINGS (next 15):
${upcomingList || '  None'}

RECENT BOOKINGS (last 7 days):
${recentList || '  None'}

PENDING DEPOSITS (not yet paid):
${depositList || '  None — all deposits collected'}

OPEN QUOTES (not yet booked):
${quoteList || '  None'}

TOP CUSTOMERS (by spend):
${topCustomerList || '  No customer data yet'}

REFERRAL PARTNERS:
${partnerList || '  No active partners'}

RECENT REVIEWS:
${reviewList || '  No reviews yet'}

RECENT EMAILS SENT:
${emailList || '  None recently'}

AUTOMATED EMAIL SCHEDULE:
- Pre-trip reminders: sent 1 day before charter date (if not already sent)
- Review requests: sent 2 days after trip completion (Google review link)
- Rebook nudges: sent ~7 days after trip (loyalty points + referral invite)
- Deposit collection: Stripe link sent automatically after booking confirmation
- All automations scan every 6 hours`;
}

export const agentRouter = router({
  // Chat with the AI agent
  chat: adminProcedure
    .input(z.object({ message: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // Save user message
      await db.insert(schema.agentChats).values({ role: 'user', content: input.message });

      // Get recent chat history
      const history = await db.select()
        .from(schema.agentChats)
        .orderBy(desc(schema.agentChats.id))
        .limit(20);
      history.reverse();

      // Get business context
      const context = await getBusinessContext();

      const messages: Anthropic.MessageParam[] = history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const system = `You are the AI business assistant for Blue Skies Boat Rentals, a premium Grady White boat rental company in Islamorada, Florida Keys. The owner is Serge.

You have full access to every piece of business data. Be concise, actionable, and proactive. When Serge asks about the business, use the real data below. When he asks you to do something, confirm and act.

YOUR CAPABILITIES:
- Answer questions about bookings, revenue, customers, partners, reviews
- Generate social media posts (Instagram, Facebook, Google Business)
- Write full SEO blog posts (saved as drafts for approval)
- Track deposit collection and flag urgent ones
- Monitor blog freshness and SEO health
- Identify empty weekends and suggest promos
- Find customers who haven't rebooked and suggest outreach
- Draft marketing emails and follow-up messages
- Analyze booking trends, revenue patterns, seasonal patterns
- Give strategic business advice for boat rentals in the Keys

TOOLS — how you actually get things done:
- Use look_up_booking / list_bookings whenever a question depends on real booking
  data. Never guess a name, email, amount, or date that a tool can tell you.
- To email a customer, call draft_email. To request a security deposit, call
  draft_deposit_link.
- IMPORTANT: draft_email and draft_deposit_link do NOT send anything. They stage
  the action for Serge's approval. Never tell Serge you "sent" an email or
  "created" a link — say you have drafted it and it is waiting for his approval
  in the panel. Claiming you sent something you only staged is a serious error.
- Always look a booking up before drafting anything for it, so the details are real.

CONTENT SCHEDULE (what Serge wants):
- Blog: 2 posts per week (1 SEO evergreen + 1 trip recap)
- Social: daily posts across Instagram, Facebook, Google Business
- Content calendar: Mon=boat feature, Tue=local spots, Wed=testimonial, Thu=booking promo, Fri=lifestyle, Sat=availability, Sun=review highlight

SEO TARGETS: rank for "boat rental islamorada", "florida keys boat rental", "grady white rental", "islamorada fishing charter", and long-tail variations. Blog posts should target specific keywords.

Be direct, no fluff. Talk like a sharp business partner, not a chatbot. Proactively flag issues — don't wait to be asked.

${context}`;

      // Agentic loop: call the model, run any tools it asks for, feed the results
      // back, repeat until it stops calling tools. Read tools hit the database;
      // draft_* tools only stage rows in agent_actions — they cannot send.
      const stagedIds: number[] = [];
      let reply = '';

      let finished = false;
      let truncated = false;

      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        const response = await anthropic.messages.create({
          model: AGENT_MODEL,
          max_tokens: 4096,
          system,
          tools: AGENT_TOOLS,
          messages,
        });

        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('\n')
          .trim();
        if (text) reply = text;

        if (response.stop_reason === 'max_tokens') {
          truncated = true;
          finished = true;
          break;
        }

        if (response.stop_reason !== 'tool_use') {
          finished = true;
          break;
        }

        const toolUses = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );

        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const call of toolUses) {
          let result: unknown;
          try {
            result = await runAgentTool(call.name, call.input as Record<string, unknown>);
            if (isStagingTool(call.name)) {
              const id = (result as { action_id?: number }).action_id;
              if (typeof id === 'number') stagedIds.push(id);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[agent] tool ${call.name} failed:`, message);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: call.id,
              content: `Error: ${message}`,
              is_error: true,
            });
            continue;
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: JSON.stringify(result),
          });
        }

        messages.push({ role: 'user', content: toolResults });
      }

      // Never present a half-finished turn as a complete answer. If the loop hit its
      // step limit or the reply was cut off mid-sentence, say so — otherwise a stale
      // partial reply gets persisted next to a live approval card as if it were done.
      if (truncated) {
        reply = `${reply}\n\n_(cut off — my reply hit the length limit. Ask me to continue.)_`.trim();
      } else if (!finished) {
        reply = reply
          ? `${reply}\n\n_(I hit my step limit before finishing. Anything staged above is still waiting for your approval — ask me to continue if something is missing.)_`
          : 'I hit my step limit before I could finish that. Can you narrow it down?';
      }

      // Save assistant reply
      await db.insert(schema.agentChats).values({ role: 'assistant', content: reply });

      // Hand back anything staged so the UI can render approval cards.
      const staged = stagedIds.length
        ? await db.select().from(schema.agentActions)
            .where(inArray(schema.agentActions.id, stagedIds))
        : [];

      return { reply, staged };
    }),

  // Everything still on screen: awaiting approval, mid-flight, failed (retryable),
  // or succeeded but not yet dismissed — an approved deposit link must stay visible
  // so its Stripe URL can actually be copied and texted.
  pendingActions: adminProcedure.query(async () => {
    return db.select().from(schema.agentActions)
      .where(and(
        eq(schema.agentActions.dismissed, false),
        inArray(schema.agentActions.status, ['pending', 'executing', 'approved', 'failed']),
      ))
      .orderBy(desc(schema.agentActions.id));
  }),

  // THE approval gate. This is the only path from the agent to Resend or Stripe,
  // and adminProcedure means it requires the admin password.
  approveAction: adminProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ input }) => {
      const { result } = await executeAction(input.actionId);
      return { ok: true, result };
    }),

  // Safe because a failed action never delivered anything: send_email throws
  // before Resend accepts it, and a failed deposit_link means no Stripe session.
  retryAction: adminProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ input }) => {
      const { result } = await retryAction(input.actionId);
      return { ok: true, result };
    }),

  rejectAction: adminProcedure
    .input(z.object({ actionId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const rejected = await db.update(schema.agentActions)
        .set({
          status: 'rejected',
          result: JSON.stringify({ reason: input.reason ?? 'Discarded by Serge.' }),
          resolvedAt: new Date().toISOString(),
        })
        .where(and(
          eq(schema.agentActions.id, input.actionId),
          inArray(schema.agentActions.status, ['pending', 'failed']),
        ))
        .returning();

      if (rejected.length === 0) throw new Error('That action can no longer be discarded.');
      return { ok: true };
    }),

  // Edit a staged email before approving it. Re-runs the same link guard, so an
  // edit cannot smuggle in a fabricated payment URL either.
  updateAction: adminProcedure
    .input(z.object({
      actionId: z.number(),
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const [action] = await db.select().from(schema.agentActions)
        .where(eq(schema.agentActions.id, input.actionId));
      if (!action) throw new Error('Action not found.');
      if (action.status !== 'pending') throw new Error(`Action is already ${action.status}.`);
      if (action.kind !== 'send_email') throw new Error('Only emails can be edited.');

      const rejection = checkEmailBody(input.body);
      if (rejection) throw new Error(rejection);

      // The template owns the greeting and sign-off — strip them here too, so a
      // hand-edit can't reintroduce the duplicate "Hey Michael, / Hi Michael,".
      const body = stripGreetingAndSignoff(input.body);
      const payload = { ...JSON.parse(action.payload), to: input.to, subject: input.subject, body };

      await db.update(schema.agentActions).set({
        payload: JSON.stringify(payload),
        summary: `Email to ${input.to} — "${input.subject}"`,
      }).where(eq(schema.agentActions.id, input.actionId));

      return { ok: true };
    }),

  // Renders the exact branded HTML the customer would receive, so it can be seen
  // before it is sent. Link placeholders are shown as labelled markers, since the
  // real URL is only minted at send time.
  previewEmail: adminProcedure
    .input(z.object({ actionId: z.number() }))
    .query(async ({ input }) => {
      const [action] = await db.select().from(schema.agentActions)
        .where(eq(schema.agentActions.id, input.actionId));
      if (!action || action.kind !== 'send_email') throw new Error('Not an email action.');

      const payload = JSON.parse(action.payload);
      // Render the real buttons so the preview matches what lands in the inbox.
      // They're inert here — the live URL is only minted on approval.
      const shown = String(payload.body)
        .replaceAll(DEPOSIT_PLACEHOLDER, linkButton('#', 'Pay Security Deposit'))
        .replaceAll(WAIVER_PLACEHOLDER, linkButton('#', 'Sign Your Rental Agreement'));

      return {
        to: payload.to,
        subject: payload.subject,
        html: renderMarketingEmail({
          to: payload.to,
          name: payload.customerName,
          subject: payload.subject,
          message: shown,
          template: 'custom',
        }),
      };
    }),

  // Clears a resolved card off the screen once Serge is done with it.
  dismissAction: adminProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(schema.agentActions)
        .set({ dismissed: true })
        .where(eq(schema.agentActions.id, input.actionId));
      return { ok: true };
    }),

  // Get chat history
  chatHistory: adminProcedure.query(async () => {
    const messages = await db.select()
      .from(schema.agentChats)
      .orderBy(desc(schema.agentChats.id))
      .limit(50);
    return messages.reverse();
  }),

  // Clear chat history
  clearChat: adminProcedure.mutation(async () => {
    await db.delete(schema.agentChats);
    return { ok: true };
  }),

  // Generate social media posts
  generatePosts: adminProcedure
    .input(z.object({ theme: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const theme = input?.theme || CONTENT_CALENDAR[new Date().getDay()];
      const themePrompt = THEME_PROMPTS[theme] || THEME_PROMPTS.lifestyle;
      const platforms = ['instagram', 'facebook', 'google_business'] as const;

      const results: Array<{ platform: string; id: number }> = [];

      // Pick a photo from Drive for this theme
      const photo = await pickPhotoForTheme(theme);

      for (const platform of platforms) {
        const platformGuidance: Record<string, string> = {
          instagram: 'For Instagram: engaging caption, 1-3 short paragraphs, CTA, 10-15 hashtags on separate line. Casual, aspirational.',
          facebook: 'For Facebook: conversational, include link to https://www.blueskiesboatrentals.com/book, 3-5 hashtags. Encourage shares.',
          google_business: 'For Google Business: short, professional, under 300 words, clear CTA. No hashtags.',
        };

        const response = await anthropic.messages.create({
          model: AGENT_MODEL,
          max_tokens: 2048,
          output_config: { format: SOCIAL_POST_FORMAT },
          messages: [{
            role: 'user',
            content: `You are a social media content creator for Blue Skies Boat Rentals, a premium Grady White boat rental company in Islamorada, Florida Keys.

${themePrompt}

${platformGuidance[platform]}

Business: Blue Skies Boat Rentals | Islamorada, FL | @blueskiescharter
Boats: Grady White Freedom 285, Grady White Canyon 306
Services: bareboat rental, captain charter, fishing, sunset cruise, snorkeling, sandbar trip
Website: https://www.blueskiesboatrentals.com`,
          }],
        });

        const parsed = parseModelJson<{ content: string; hashtags: string; image_suggestion: string }>(
          response, `social post (${platform})`,
        );

        const [inserted] = await db.insert(schema.socialPosts).values({
          platform,
          theme,
          content: parsed.content || '',
          hashtags: parsed.hashtags || '',
          imageSuggestion: parsed.image_suggestion || '',
          photoFileId: photo?.fileId || null,
          photoName: photo?.fileName || null,
          status: 'pending',
        }).returning({ id: schema.socialPosts.id });

        results.push({ platform, id: inserted.id });
      }

      // Notify Serge
      notifyAdmin(
        `${results.length} Social Posts Ready for Review`,
        `<h2>New ${theme.replace('_', ' ')} posts generated</h2>
        <p>${results.length} posts across ${results.map(r => r.platform).join(', ')} are waiting for your approval.</p>
        <p><a href="https://www.blueskiesboatrentals.com/admin/agent" style="background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Review Posts</a></p>`
      );

      return { theme, posts: results };
    }),

  // List social posts by status
  listPosts: adminProcedure
    .input(z.object({ status: z.string().default('pending') }))
    .query(async ({ input }) => {
      return db.select()
        .from(schema.socialPosts)
        .where(eq(schema.socialPosts.status, input.status as any))
        .orderBy(desc(schema.socialPosts.createdAt));
    }),

  // Approve a post
  approvePost: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(schema.socialPosts)
        .set({ status: 'approved', scheduledFor: new Date().toISOString() })
        .where(eq(schema.socialPosts.id, input.id));
      return { ok: true };
    }),

  // Reject a post
  rejectPost: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.update(schema.socialPosts)
        .set({ status: 'rejected', rejectedReason: input.reason || '' })
        .where(eq(schema.socialPosts.id, input.id));
      return { ok: true };
    }),

  // Edit a post
  editPost: adminProcedure
    .input(z.object({ id: z.number(), content: z.string(), hashtags: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.update(schema.socialPosts)
        .set({ content: input.content, hashtags: input.hashtags || '' })
        .where(eq(schema.socialPosts.id, input.id));
      return { ok: true };
    }),

  // Generate a blog post draft
  generateBlog: adminProcedure
    .input(z.object({
      topic: z.string().optional(),
      category: z.string().default('general'),
    }).optional())
    .mutation(async ({ input }) => {
      // Get recent blog posts to avoid repetition
      const existingPosts = await db.select({ title: schema.posts.title, slug: schema.posts.slug })
        .from(schema.posts).orderBy(desc(schema.posts.createdAt)).limit(10);
      const existingTitles = existingPosts.map(p => p.title).join('\n');

      const topic = input?.topic || '';
      const category = input?.category || 'general';

      // Pick a cover photo from Google Drive
      const blogThemeFolders = ['photos', 'boats', 'trips', 'drone', 'fishing'];
      let coverPhoto: { fileId: string; fileName: string } | null = null;
      const drive = await getDrive();
      if (drive) {
        for (const key of blogThemeFolders) {
          const folderId = DRIVE_FOLDERS[key];
          if (!folderId) continue;
          try {
            const res = await drive.files.list({
              q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/')`,
              includeItemsFromAllDrives: true,
              supportsAllDrives: true,
              corpora: 'allDrives',
              fields: 'files(id, name)',
              pageSize: 50,
            });
            const images = res.data.files || [];
            if (images.length > 0) {
              const pick = images[Math.floor(Math.random() * images.length)];
              coverPhoto = { fileId: pick.id!, fileName: pick.name! };
              break;
            }
          } catch (err) {
            console.error(`[blog] Drive folder ${key} error:`, err);
          }
        }
      }

      const coverImageUrl = coverPhoto ? `/api/drive-photo/${coverPhoto.fileId}` : null;

      // max_tokens must comfortably fit 800-1500 words of HTML plus JSON string
      // escaping. The old 4096 truncated the response mid-object every time.
      const response = await anthropic.messages.create({
        model: AGENT_MODEL,
        max_tokens: 16000,
        output_config: { format: BLOG_POST_FORMAT },
        messages: [{
          role: 'user',
          content: `You are an expert SEO content writer for Blue Skies Boat Rentals, a premium Grady White boat rental company in Islamorada, Florida Keys.

Write a full SEO-optimized blog post${topic ? ` about: ${topic}` : ' on a topic that would drive organic traffic for boat rental searches in the Florida Keys'}.

EXISTING POSTS (avoid repeating these topics):
${existingTitles || 'None yet'}

=== SEO REQUIREMENTS (CRITICAL) ===
1. TITLE: Must contain a high-volume search keyword. Use formats like:
   - "Best [Activity] in [Location] — [Year] Guide"
   - "How to [Do Something] in the Florida Keys"
   - "[Number] Best [Things] in [Location] for [Audience]"
   Target keywords across ALL Florida Keys locations:
   PRIMARY: "boat rental islamorada", "florida keys boat rental", "grady white rental"
   KEY LARGO: "key largo boat rental", "key largo snorkeling", "john pennekamp boat",
     "key largo fishing charter", "molasses reef snorkeling", "things to do key largo by boat"
   ISLAMORADA: "islamorada boat rental", "islamorada fishing charter", "islamorada sandbar",
     "alligator reef snorkeling", "things to do islamorada", "indian key boat trip"
   MARATHON: "marathon boat rental", "marathon fishing", "sombrero reef snorkeling",
     "seven mile bridge boat", "things to do marathon fl", "marathon keys boat charter"
   UPPER/MIDDLE KEYS: "upper keys boat rental", "tavernier boat rental", "duck key boat rental",
     "florida keys fishing guide", "florida keys snorkeling spots", "keys boating guide"
   ACTIVITIES: "florida keys sunset cruise", "florida keys sandbar", "lobster season florida keys",
     "best fishing spots florida keys", "florida keys island hopping"

   IMPORTANT: Rotate locations! Do NOT always write about Islamorada. Write about Key Largo,
   Marathon, Duck Key, Tavernier, and the broader Florida Keys equally. Check the existing posts
   and pick a location/topic that is UNDERREPRESENTED.

2. SLUG: Short, keyword-rich, lowercase, hyphens only (e.g. "best-snorkeling-key-largo")

3. EXCERPT: 150-160 chars. Must read like a Google meta description — compelling, keyword-rich,
   action-oriented. This IS the meta description that appears in search results.

4. CONTENT: 1000-1800 words in semantic HTML:
   - Do NOT include <h1> — the title is displayed separately by the page template
   - Start content directly with the first <p> paragraph
   - Use <h2> for major sections (include keywords naturally)
   - Use <h3> for subsections
   - Use <p>, <ul>, <li>, <ol>, <strong>, <em>
   - First paragraph must contain the primary keyword within the first 100 words
   - Include internal links to MULTIPLE location pages:
     <a href="/book">book your boat rental</a>,
     <a href="/experiences">explore our experiences</a>,
     <a href="/islamorada">Islamorada boating</a>,
     <a href="/key-largo">Key Largo adventures</a>,
     <a href="/marathon">Marathon boat rentals</a>,
     <a href="/tavernier">Tavernier</a>,
     <a href="/duck-key">Duck Key</a>,
     <a href="/guide">Florida Keys travel guide</a>,
     <a href="/gallery">see our photo gallery</a>
   - Use at least 4-5 internal links spread throughout, linking to relevant locations
   - Mention "Blue Skies Boat Rentals" naturally 2-3 times
   - Reference specific landmarks by location:
     KEY LARGO: John Pennekamp, Molasses Reef, Christ of the Abyss, Largo Sound,
       Florida Keys Wild Bird Center, The Fish House, Mrs. Mac's Kitchen
     ISLAMORADA: Alligator Reef, Indian Key, Robbie's, Theater of the Sea, Cheeca Lodge,
       Anne's Beach, Whale Harbor, Morada Bay, Islamorada Fish Company, Lorelei
     MARATHON: Sombrero Reef, Seven Mile Bridge, Turtle Hospital, Keys Fisheries,
       Bahia Honda, Pigeon Key, Boot Key Harbor
     TAVERNIER: Harry Harris Park, Tavernier Creek, Florida Keys Brewing Company
     DUCK KEY: Hawks Cay, Tom's Harbor, calm Gulf-side waters
   - Include a FAQ section with 2-3 questions using <h3> tags (these get picked up by
     Google's "People also ask" and AI search engines)
   - End with a strong CTA paragraph linking to /book
   - Write for humans first, but structure for search engines

5. CATEGORY: Pick the most fitting from: fishing_report, keys_guide, experiences,
   behind_the_scenes, general

6. TAGS: Comma-separated, 5-8 tags targeting long-tail keywords including the specific
   location (e.g. "key largo boat rental, key largo snorkeling, molasses reef, florida keys fishing")

=== BUSINESS CONTEXT ===
- Boats: Grady White Freedom 285 (28ft, 10 guests), Grady White Canyon 306 (30ft, 10 guests)
- Home base: Safe Harbor Marina, Islamorada, FL 33036
- Service area: Key Largo (20 min north), Islamorada (home base), Tavernier (15 min north),
  Duck Key (20 min south), Marathon (45 min south), and everywhere in between
- Services: bareboat rental, captain charter, fishing, sunset cruise, snorkeling, sandbar trip
- Instagram: @blueskiescharter | Website: blueskiesboatrentals.com
- Founders: Serge Parakhnevich & Robert Garan
- Differentiator: Premium Grady White boats (most rentals use pontoons or center consoles)

=== AI SEARCH OPTIMIZATION ===
Write in a way that AI assistants (ChatGPT, Perplexity, Claude) would cite when answering
questions about boat rentals in the Florida Keys. Be specific with facts, prices, locations,
and recommendations. AI search engines prefer content that directly answers questions with
concrete details rather than vague marketing copy. Include the specific location name in
answers to location-specific questions.`,
        }],
      });

      const parsed = parseModelJson<{
        title: string; slug: string; excerpt: string;
        content: string; category: string; tags: string;
      }>(response, 'blog post');

      // Check for duplicate slug
      const existingSlugs = existingPosts.map(p => p.slug);
      let slug = parsed.slug || 'untitled';
      if (existingSlugs.includes(slug)) {
        slug = `${slug}-${Date.now()}`;
      }

      // Strip any <h1> from content — the page template renders the title separately
      const cleanContent = (parsed.content || '').replace(/<h1[^>]*>.*?<\/h1>\s*/gi, '').trim();

      const [inserted] = await db.insert(schema.posts).values({
        title: parsed.title || 'Untitled',
        slug,
        excerpt: parsed.excerpt || '',
        content: cleanContent,
        coverImage: coverImageUrl,
        category: parsed.category || category,
        tags: parsed.tags ? JSON.stringify(parsed.tags.split(',').map((t: string) => t.trim())) : null,
        author: 'Serge Parakhnevich',
        status: 'draft',
      }).returning({ id: schema.posts.id });

      // Notify Serge
      notifyAdmin(
        `Blog Draft Ready: ${parsed.title}`,
        `<h2>New blog post draft</h2>
        <p><strong>${parsed.title}</strong></p>
        <p>${parsed.excerpt || ''}</p>
        <p><a href="https://www.blueskiesboatrentals.com/admin/agent" style="background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Review & Publish</a></p>`
      );

      return { id: inserted.id, title: parsed.title, slug };
    }),

  // List blog drafts
  listBlogDrafts: adminProcedure.query(async () => {
    return db.select()
      .from(schema.posts)
      .where(eq(schema.posts.status, 'draft'))
      .orderBy(desc(schema.posts.createdAt));
  }),

  // Publish a blog draft
  publishBlog: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(schema.posts)
        .set({ status: 'published' })
        .where(eq(schema.posts.id, input.id));
      return { ok: true };
    }),

  // Get business health alerts (proactive)
  healthCheck: adminProcedure.query(async () => {
    const alerts: Array<{ type: 'warning' | 'info' | 'success'; message: string }> = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Check blog freshness
    const [latestBlog] = await db.select()
      .from(schema.posts)
      .where(eq(schema.posts.status, 'published'))
      .orderBy(desc(schema.posts.createdAt))
      .limit(1);
    if (latestBlog) {
      const daysSinceBlog = Math.floor((now.getTime() - new Date(latestBlog.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceBlog > 7) {
        alerts.push({ type: 'warning', message: `Blog is ${daysSinceBlog} days stale. Last post: "${latestBlog.title}". Target is 2 posts/week.` });
      } else {
        alerts.push({ type: 'success', message: `Blog is fresh. Last post ${daysSinceBlog} day(s) ago.` });
      }
    } else {
      alerts.push({ type: 'warning', message: 'No published blog posts yet. SEO needs content.' });
    }

    // Check social post pipeline
    const [pendingSocial] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.socialPosts).where(eq(schema.socialPosts.status, 'pending'));
    if ((pendingSocial?.count || 0) > 6) {
      alerts.push({ type: 'warning', message: `${pendingSocial.count} social posts pending approval. Review them before they get stale.` });
    }

    // Check pending deposits
    const pendingDeps = await db.select()
      .from(schema.bookings)
      .where(and(eq(schema.bookings.depositStatus, 'requested'), eq(schema.bookings.status, 'confirmed')));
    if (pendingDeps.length > 0) {
      const urgentDeps = pendingDeps.filter(b => {
        const tripDate = new Date(b.charterDate);
        const daysUntil = Math.floor((tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 3;
      });
      if (urgentDeps.length > 0) {
        alerts.push({ type: 'warning', message: `${urgentDeps.length} deposit(s) still unpaid with trips in the next 3 days! ${urgentDeps.map(b => b.customerName).join(', ')}` });
      } else if (pendingDeps.length > 0) {
        alerts.push({ type: 'info', message: `${pendingDeps.length} deposit(s) pending collection.` });
      }
    }

    // Check for empty upcoming weekends
    const nextSat = new Date(now);
    nextSat.setDate(nextSat.getDate() + (6 - nextSat.getDay()));
    const nextSun = new Date(nextSat);
    nextSun.setDate(nextSun.getDate() + 1);
    const satStr = nextSat.toISOString().split('T')[0];
    const sunStr = nextSun.toISOString().split('T')[0];
    const weekendBookings = await db.select({ count: sql<number>`count(*)` })
      .from(schema.bookings)
      .where(and(
        sql`charter_date IN (${satStr}, ${sunStr})`,
        eq(schema.bookings.status, 'confirmed')
      ));
    if ((weekendBookings[0]?.count || 0) === 0) {
      alerts.push({ type: 'warning', message: `No bookings for this weekend (${satStr}/${sunStr}). Push availability posts and promos.` });
    }

    // Check open quotes not converted
    const openQuotes = await db.select({ count: sql<number>`count(*)` })
      .from(schema.quotes).where(eq(schema.quotes.status, 'pending'));
    if ((openQuotes[0]?.count || 0) > 0) {
      alerts.push({ type: 'info', message: `${openQuotes[0].count} open quote(s) — follow up to convert.` });
    }

    // Check review volume
    const [reviewCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.reviews);
    if ((reviewCount?.count || 0) < 50) {
      alerts.push({ type: 'info', message: `${reviewCount?.count || 0} reviews total. Goal: 100+ Google reviews. Keep pushing review requests.` });
    }

    return alerts;
  }),

  // SEO: Get latest ranking data
  seoData: adminProcedure.query(async () => {
    // Get the most recent snapshot date
    const [latest] = await db.select({ date: schema.seoSnapshots.date })
      .from(schema.seoSnapshots)
      .orderBy(desc(schema.seoSnapshots.createdAt))
      .limit(1);
    if (!latest) return { queries: [], alerts: [], lastUpdated: null };

    const queries = await db.select()
      .from(schema.seoSnapshots)
      .where(eq(schema.seoSnapshots.date, latest.date))
      .orderBy(desc(schema.seoSnapshots.clicks));

    const alerts = await db.select()
      .from(schema.seoAlerts)
      .orderBy(desc(schema.seoAlerts.createdAt))
      .limit(20);

    return { queries, alerts, lastUpdated: latest.date };
  }),

  // SEO: Manually trigger a Search Console fetch
  seoRefresh: adminProcedure.mutation(async () => {
    const result = await fetchAndStoreSeoData();
    return result;
  }),

  // Drive: Organize photos into categorized folders
  organizePhotos: adminProcedure.mutation(async () => {
    const drive = await getDrive();
    if (!drive) return { error: 'Drive not connected' };

    const MEDIA_DRIVE_ID = '0AB9eibW4J5xVUk9PVA';
    const CATEGORIES: Record<string, { keywords: string[]; folder: string }> = {
      boats: { keywords: ['boat', 'grady', 'freedom', 'canyon', 'helm', 'bow', 'stern', 'marina'], folder: 'Organized/Boats' },
      catches: { keywords: ['snapper', 'fish', 'catch', 'mahi', 'tuna', 'grouper', 'tarpon', 'fishing'], folder: 'Organized/Fish & Catches' },
      reef: { keywords: ['aligator', 'alligator', 'reef', 'snorkel', 'molasses', 'coral'], folder: 'Organized/Reef & Snorkeling' },
      landmarks: { keywords: ['lighthouse', 'sombrero', 'bridge'], folder: 'Organized/Landmarks' },
      aerial: { keywords: ['ariel', 'aerial', 'drone', 'dji'], folder: 'Organized/Aerial' },
      lifestyle: { keywords: ['sunset', 'sunrise', 'sandbar', 'beach', 'lifestyle'], folder: 'Organized/Lifestyle' },
    };

    // Create organized folders
    const folderIds: Record<string, string> = {};

    // Create root "Organized" folder
    const [existingOrg] = (await drive.files.list({
      q: `name='Organized' and mimeType='application/vnd.google-apps.folder' and '${MEDIA_DRIVE_ID}' in parents and trashed=false`,
      driveId: MEDIA_DRIVE_ID,
      corpora: 'drive',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields: 'files(id)',
    })).data.files || [];

    const orgFolderId = existingOrg?.id || (await drive.files.create({
      requestBody: { name: 'Organized', mimeType: 'application/vnd.google-apps.folder', parents: [MEDIA_DRIVE_ID] },
      supportsAllDrives: true,
      fields: 'id',
    })).data.id!;

    for (const [key, cat] of Object.entries(CATEGORIES)) {
      const folderName = cat.folder.split('/')[1];
      const [existing] = (await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${orgFolderId}' in parents and trashed=false`,
        driveId: MEDIA_DRIVE_ID,
        corpora: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: 'files(id)',
      })).data.files || [];

      folderIds[key] = existing?.id || (await drive.files.create({
        requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [orgFolderId] },
        supportsAllDrives: true,
        fields: 'id',
      })).data.id!;
    }

    // Scan all images in Photos folder and categorize by copying
    const photosFolder = DRIVE_FOLDERS.photos;
    const images = (await drive.files.list({
      q: `'${photosFolder}' in parents and trashed=false and (mimeType contains 'image/')`,
      driveId: MEDIA_DRIVE_ID,
      corpora: 'drive',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields: 'files(id, name)',
      pageSize: 100,
    })).data.files || [];

    let organized = 0;
    for (const img of images) {
      const lower = (img.name || '').toLowerCase();
      for (const [key, cat] of Object.entries(CATEGORIES)) {
        if (cat.keywords.some(kw => lower.includes(kw))) {
          try {
            await drive.files.copy({
              fileId: img.id!,
              requestBody: { name: img.name, parents: [folderIds[key]] },
              supportsAllDrives: true,
            });
            organized++;
          } catch { /* skip duplicates */ }
          break;
        }
      }
    }

    return { organized, totalScanned: images.length, folders: Object.keys(folderIds) };
  }),
});
