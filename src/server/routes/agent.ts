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
    pendingPosts,
    boats,
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
    db.select({ count: sql<number>`count(*)` }).from(schema.socialPosts).where(eq(schema.socialPosts.status, 'pending')),
    db.select().from(schema.boats).where(eq(schema.boats.status, 'active')),
  ]);

  const upcomingList = upcomingBookings.slice(0, 10).map(b =>
    `  - ${b.charterDate}: ${b.customerName} (${b.charterType}, ${b.duration}, ${b.guestCount} guests, boat #${b.boatId})`
  ).join('\n');

  const recentList = recentBookings.slice(0, 5).map(b =>
    `  - ${b.createdAt?.split('T')[0]}: ${b.customerName} — $${b.total} (${b.status}, ${b.paymentStatus})`
  ).join('\n');

  const boatList = boats.map(b =>
    `  - ${b.name} (${b.model}, ${b.lengthFt}ft, ${b.capacity} guests) — $${b.priceHalfDay} half / $${b.priceFullDay} full`
  ).join('\n');

  return `TODAY: ${today}

BUSINESS SNAPSHOT:
- Total customers: ${totalCustomers[0]?.count || 0}
- Total bookings (all time): ${totalBookings[0]?.count || 0}
- Revenue this month: $${Math.round(monthRevenue[0]?.total || 0).toLocaleString()}
- Pending social posts for approval: ${pendingPosts[0]?.count || 0}

FLEET:
${boatList || '  No active boats'}

UPCOMING BOOKINGS (next 10):
${upcomingList || '  None'}

RECENT BOOKINGS (last 7 days):
${recentList || '  None'}`;
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

You have full access to the business data. Be concise, actionable, and proactive. When Serge asks about the business, use the real data below. When he asks you to do something (generate posts, send emails, etc.), confirm and act.

You can:
- Answer questions about bookings, revenue, customers
- Suggest marketing strategies
- Help with content creation
- Flag things that need attention (empty weekends, slow periods, customers to follow up with)
- Give business advice specific to boat rentals in the Keys

Be direct, no fluff. Talk like a sharp business partner, not a chatbot.

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
});
