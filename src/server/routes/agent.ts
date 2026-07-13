import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { desc, eq, sql, gte, and } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import os from 'os';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

function getDriveAuth(): google.auth.GoogleAuth | null {
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
  chat: publicProcedure
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

      const messages = history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: `You are the AI business assistant for Blue Skies Boat Rentals, a premium Grady White boat rental company in Islamorada, Florida Keys. The owner is Serge.

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

CONTENT SCHEDULE (what Serge wants):
- Blog: 2 posts per week (1 SEO evergreen + 1 trip recap)
- Social: daily posts across Instagram, Facebook, Google Business
- Content calendar: Mon=boat feature, Tue=local spots, Wed=testimonial, Thu=booking promo, Fri=lifestyle, Sat=availability, Sun=review highlight

SEO TARGETS: rank for "boat rental islamorada", "florida keys boat rental", "grady white rental", "islamorada fishing charter", and long-tail variations. Blog posts should target specific keywords.

Be direct, no fluff. Talk like a sharp business partner, not a chatbot. Proactively flag issues — don't wait to be asked.

${context}`,
        messages,
      });

      const reply = response.content[0].type === 'text' ? response.content[0].text : '';

      // Save assistant reply
      await db.insert(schema.agentChats).values({ role: 'assistant', content: reply });

      return { reply };
    }),

  // Get chat history
  chatHistory: publicProcedure.query(async () => {
    const messages = await db.select()
      .from(schema.agentChats)
      .orderBy(desc(schema.agentChats.id))
      .limit(50);
    return messages.reverse();
  }),

  // Clear chat history
  clearChat: publicProcedure.mutation(async () => {
    await db.delete(schema.agentChats);
    return { ok: true };
  }),

  // Generate social media posts
  generatePosts: publicProcedure
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
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `You are a social media content creator for Blue Skies Boat Rentals, a premium Grady White boat rental company in Islamorada, Florida Keys.

${themePrompt}

${platformGuidance[platform]}

Business: Blue Skies Boat Rentals | Islamorada, FL | @blueskiescharter
Boats: Grady White Freedom 285, Grady White Canyon 306
Services: bareboat rental, captain charter, fishing, sunset cruise, snorkeling, sandbar trip
Website: https://www.blueskiesboatrentals.com

Respond in JSON: { "content": "post text without hashtags", "hashtags": "hashtags string or empty", "image_suggestion": "ideal photo description" }
Return ONLY valid JSON.`,
          }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
        const parsed = JSON.parse(text);

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

      return { theme, posts: results };
    }),

  // List social posts by status
  listPosts: publicProcedure
    .input(z.object({ status: z.string().default('pending') }))
    .query(async ({ input }) => {
      return db.select()
        .from(schema.socialPosts)
        .where(eq(schema.socialPosts.status, input.status as any))
        .orderBy(desc(schema.socialPosts.createdAt));
    }),

  // Approve a post
  approvePost: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(schema.socialPosts)
        .set({ status: 'approved', scheduledFor: new Date().toISOString() })
        .where(eq(schema.socialPosts.id, input.id));
      return { ok: true };
    }),

  // Reject a post
  rejectPost: publicProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.update(schema.socialPosts)
        .set({ status: 'rejected', rejectedReason: input.reason || '' })
        .where(eq(schema.socialPosts.id, input.id));
      return { ok: true };
    }),

  // Edit a post
  editPost: publicProcedure
    .input(z.object({ id: z.number(), content: z.string(), hashtags: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.update(schema.socialPosts)
        .set({ content: input.content, hashtags: input.hashtags || '' })
        .where(eq(schema.socialPosts.id, input.id));
      return { ok: true };
    }),

  // Generate a blog post draft
  generateBlog: publicProcedure
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

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are the content writer for Blue Skies Boat Rentals, a premium Grady White boat rental company in Islamorada, Florida Keys.

Write a full SEO-optimized blog post${topic ? ` about: ${topic}` : ' on a topic that would drive organic traffic for boat rental searches in the Florida Keys'}.

EXISTING POSTS (avoid repeating these topics):
${existingTitles || 'None yet'}

REQUIREMENTS:
- H1 title with primary target keyword
- 800-1500 words
- Write in HTML format (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags)
- Include internal links: <a href="/book">Book your trip</a>, <a href="/experiences">our experiences</a>
- Mention "Blue Skies Boat Rentals" naturally 2-3 times
- Mention Islamorada, Florida Keys, and nearby locations
- End with a clear CTA to book
- Boats: Grady White Freedom 285, Grady White Canyon 306
- Services: bareboat rental, captain charter, fishing, sunset cruise, snorkeling, sandbar trip
- Instagram: @blueskiescharter
- Phone: text or call us

Respond in JSON:
{
  "title": "SEO-optimized title with keyword",
  "slug": "url-friendly-slug",
  "excerpt": "150-160 char meta description with keyword",
  "content": "full HTML blog post content",
  "category": "${category}",
  "tags": "comma,separated,tags"
}
Return ONLY valid JSON.`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const parsed = JSON.parse(text);

      // Check for duplicate slug
      const existingSlugs = existingPosts.map(p => p.slug);
      let slug = parsed.slug || 'untitled';
      if (existingSlugs.includes(slug)) {
        slug = `${slug}-${Date.now()}`;
      }

      const [inserted] = await db.insert(schema.posts).values({
        title: parsed.title || 'Untitled',
        slug,
        excerpt: parsed.excerpt || '',
        content: parsed.content || '',
        category: parsed.category || category,
        tags: parsed.tags ? JSON.stringify(parsed.tags.split(',').map((t: string) => t.trim())) : null,
        author: 'Blue Skies Crew',
        status: 'draft',
      }).returning({ id: schema.posts.id });

      return { id: inserted.id, title: parsed.title, slug };
    }),

  // List blog drafts
  listBlogDrafts: publicProcedure.query(async () => {
    return db.select()
      .from(schema.posts)
      .where(eq(schema.posts.status, 'draft'))
      .orderBy(desc(schema.posts.createdAt));
  }),

  // Publish a blog draft
  publishBlog: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(schema.posts)
        .set({ status: 'published' })
        .where(eq(schema.posts.id, input.id));
      return { ok: true };
    }),

  // Get business health alerts (proactive)
  healthCheck: publicProcedure.query(async () => {
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
});
