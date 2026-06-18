import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
import Stripe from 'stripe';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { sendBookingConfirmation, sendReviewRequest } from './email.js';
import { ensureProperties } from '../db/ensure-properties.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://blueskiesboatrentals.com';
const app = express();

// CORS: in production, restrict to the live origin. In dev, allow anything.
const allowedOrigin = process.env.APP_URL || true;
app.use(cors({ origin: allowedOrigin }));

// Stripe webhook needs raw body — must come before express.json()
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingRef = session.metadata?.bookingRef;

      if (bookingRef) {
        // Idempotency: if we've already processed this Stripe event, skip.
        // Stripe retries webhooks; without this, user stats double-count.
        const [alreadyProcessed] = await db.select()
          .from(schema.bookings)
          .where(eq(schema.bookings.stripeEventId, event.id));
        if (alreadyProcessed) {
          console.log(`Webhook ${event.id} already processed, skipping.`);
          return res.json({ received: true, duplicate: true });
        }

        // Mark booking as paid and confirmed, stamp the event ID
        await db.update(schema.bookings)
          .set({
            paymentStatus: 'paid',
            status: 'confirmed',
            stripePaymentId: session.payment_intent as string,
            stripeSessionId: session.id,
            stripeEventId: event.id,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.bookings.bookingRef, bookingRef));

        // Update user stats
        const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, bookingRef));
        if (booking && booking.userId) {
          const [user] = await db.select().from(schema.users).where(eq(schema.users.id, booking.userId));
          if (user) {
            await db.update(schema.users).set({
              bookingCount: user.bookingCount + 1,
              totalSpent: user.totalSpent + booking.total,
              loyaltyPoints: user.loyaltyPoints + (booking.loyaltyPointsEarned ?? 0),
              updatedAt: new Date().toISOString(),
            }).where(eq(schema.users.id, user.id));
          }
        }

        // Handle referral transaction
        if (booking?.referralCode && booking.referralDiscount && booking.referralDiscount > 0) {
          const [partner] = await db.select().from(schema.partners)
            .where(eq(schema.partners.referralCode, booking.referralCode));
          if (partner) {
            const commission = booking.total * (partner.commissionRate / 100);
            await db.insert(schema.referralTransactions).values({
              partnerId: partner.id,
              bookingId: booking.id,
              amount: booking.total,
              commission: Math.round(commission * 100) / 100,
            });
          }
        }

        // Send confirmation emails after successful payment
        if (booking) {
          const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, booking.boatId));
          if (boat) {
            sendBookingConfirmation({
              bookingRef,
              customerName: booking.customerName,
              customerEmail: booking.customerEmail,
              customerPhone: booking.customerPhone ?? undefined,
              boatName: boat.name,
              boatModel: boat.model,
              charterDate: booking.charterDate,
              duration: booking.duration,
              charterType: booking.charterType,
              guestCount: booking.guestCount,
              departurePort: booking.departurePort ?? undefined,
              specialRequests: booking.specialRequests ?? undefined,
              captainRequested: booking.captainRequested,
              subtotal: booking.subtotal,
              captainFee: booking.captainFee,
              tax: booking.tax,
              total: booking.total,
            });
          }
        }

        console.log(`Payment confirmed for booking ${bookingRef}`);
      }
    }

    res.json({ received: true });
  });
}

app.use(express.json());

// Weather proxy (to avoid CORS issues on client)
app.get('/api/weather', async (_req, res) => {
  try {
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=24.77&longitude=-80.84&temperature_unit=fahrenheit&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=America/New_York'
    );
    const data = await response.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Weather fetch failed' });
  }
});

// Daily cron: send review request emails for yesterday's completed trips
app.get('/api/cron/review-requests', async (req, res) => {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // Calculate yesterday's date in YYYY-MM-DD format (Eastern time)
    const now = new Date();
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    eastern.setDate(eastern.getDate() - 1);
    const yesterday = eastern.toISOString().split('T')[0];

    // Find confirmed, paid bookings from yesterday
    const bookings = await db.select({
      customerName: schema.bookings.customerName,
      customerEmail: schema.bookings.customerEmail,
      charterDate: schema.bookings.charterDate,
      boatId: schema.bookings.boatId,
    })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.charterDate, yesterday),
          eq(schema.bookings.status, 'confirmed'),
          eq(schema.bookings.paymentStatus, 'paid')
        )
      );

    let sent = 0;
    for (const booking of bookings) {
      const [boat] = await db.select({ name: schema.boats.name })
        .from(schema.boats)
        .where(eq(schema.boats.id, booking.boatId));

      if (boat) {
        await sendReviewRequest({
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          boatName: boat.name,
          charterDate: booking.charterDate,
        });
        sent++;
      }
    }

    console.log(`Review request cron: sent ${sent} emails for date ${yesterday}`);
    res.json({ success: true, emailsSent: sent, date: yesterday });
  } catch (err) {
    console.error('Review request cron error:', err);
    res.status(500).json({ error: 'Failed to send review requests' });
  }
});

app.use('/api/trpc', createExpressMiddleware({ router: appRouter }));

// Dynamic sitemap with blog posts and boats
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const posts = await db.select({
      slug: schema.posts.slug,
      createdAt: schema.posts.createdAt,
    }).from(schema.posts).where(eq(schema.posts.status, 'published'));

    const boats = await db.select({
      id: schema.boats.id,
    }).from(schema.boats).where(eq(schema.boats.status, 'active'));

    const stays = await db.select({
      slug: schema.properties.slug,
    }).from(schema.properties).where(eq(schema.properties.status, 'active'));

    const staticUrls = [
      { loc: '/', priority: '1.0', freq: 'weekly' },
      { loc: '/book', priority: '0.9', freq: 'weekly' },
      { loc: '/islamorada', priority: '0.9', freq: 'monthly' },
      { loc: '/key-largo', priority: '0.9', freq: 'monthly' },
      { loc: '/marathon', priority: '0.9', freq: 'monthly' },
      { loc: '/blog', priority: '0.8', freq: 'daily' },
      { loc: '/about', priority: '0.8', freq: 'monthly' },
      { loc: '/experiences', priority: '0.8', freq: 'monthly' },
      { loc: '/guide', priority: '0.8', freq: 'weekly' },
      { loc: '/gallery', priority: '0.7', freq: 'weekly' },
      { loc: '/stays', priority: '0.7', freq: 'monthly' },
      { loc: '/gift', priority: '0.6', freq: 'monthly' },
      { loc: '/loyalty', priority: '0.5', freq: 'monthly' },
      { loc: '/partners', priority: '0.5', freq: 'monthly' },
    ];

    const urls = staticUrls.map(u =>
      `  <url><loc>${SITE}${u.loc}</loc><priority>${u.priority}</priority><changefreq>${u.freq}</changefreq></url>`
    );

    for (const post of posts) {
      const lastmod = post.createdAt ? `<lastmod>${post.createdAt.split('T')[0]}</lastmod>` : '';
      urls.push(`  <url><loc>${SITE}/blog/${post.slug}</loc><priority>0.7</priority><changefreq>monthly</changefreq>${lastmod}</url>`);
    }

    for (const boat of boats) {
      urls.push(`  <url><loc>${SITE}/boat/${boat.id}</loc><priority>0.7</priority><changefreq>weekly</changefreq></url>`);
    }

    for (const stay of stays) {
      urls.push(`  <url><loc>${SITE}/stays/${stay.slug}</loc><priority>0.6</priority><changefreq>monthly</changefreq></url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

// Serve static files in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Bot user-agent detection for SEO meta injection
const BOT_UA = /googlebot|bingbot|yandex|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora|pinterest|slackbot|vkShare|W3C_Validator|whatsapp|telegrambot|iMessageBot|applebot/i;

// Location page SEO data
const locationSEO: Record<string, { title: string; description: string; image: string }> = {
  'key-largo': {
    title: 'Boat Rentals Key Largo FL | Blue Skies Boat Rentals',
    description: 'Rent a Grady White boat and explore Key Largo — John Pennekamp, Molasses Reef, and the diving capital of the world. 20 minutes from our Islamorada dock.',
    image: '/keys-sunset.jpeg',
  },
  islamorada: {
    title: 'Boat Rentals Islamorada FL | Blue Skies Boat Rentals',
    description: 'Boat rentals in Islamorada, the sport fishing capital of the world. Sandbars, Alligator Reef, offshore fishing, sunset cruises. Our home base in the Florida Keys.',
    image: '/boat-alligator-reef.jpeg',
  },
  marathon: {
    title: 'Boat Rentals Marathon FL | Blue Skies Boat Rentals',
    description: 'Rent a boat and cruise to Marathon — Sombrero Reef, Seven Mile Bridge, and the heart of the Florida Keys. 45 minutes from our Islamorada dock.',
    image: '/boat-night.jpeg',
  },
};

// Static page SEO data
const staticPageSEO: Record<string, { title: string; description: string }> = {
  '/blog': {
    title: 'Florida Keys Boating Blog — Fishing Reports & Guides | Blue Skies Boat Rentals',
    description: 'Tips, guides, fishing reports, and stories from the water. Everything you need to plan your Florida Keys boat rental adventure from Islamorada.',
  },
  '/about': {
    title: 'About Us | Boat Rentals Islamorada FL | Blue Skies Boat Rentals',
    description: 'Meet the team behind Blue Skies Boat Rentals. Founded in Islamorada, we run a fleet of pristine Grady White boats in the Florida Keys.',
  },
  '/experiences': {
    title: 'Boat Rental Experiences in the Florida Keys | Blue Skies Boat Rentals',
    description: 'Offshore fishing, sandbar trips, sunset cruises, snorkeling — explore all the ways to enjoy a Grady White boat rental in Islamorada and the Florida Keys.',
  },
  '/book': {
    title: 'Book a Boat Rental in the Florida Keys | Blue Skies Boat Rentals',
    description: 'Check availability and book a premium Grady White boat rental in Islamorada. Half-day, full-day, or multi-day. Bareboat or with a captain.',
  },
  '/gallery': {
    title: 'Photos & Videos — Florida Keys Boat Rentals | Blue Skies Boat Rentals',
    description: 'See real photos and videos from Blue Skies boat rentals in the Florida Keys. Grady White boats, fishing catches, sandbars, sunsets, and more.',
  },
  '/guide': {
    title: 'Florida Keys Travel Guide — Best Spots by Boat | Blue Skies Boat Rentals',
    description: 'Your guide to the Florida Keys by boat. Best reefs, sandbars, fishing spots, restaurants, and hidden gems from Key Largo to Marathon.',
  },
  '/stays': {
    title: 'Where to Stay in the Florida Keys | Blue Skies Boat Rentals',
    description: 'Find the best places to stay near our boats in Islamorada, Key Largo, and Marathon. Vacation rentals, hotels, and resorts in the Florida Keys.',
  },
  '/gift': {
    title: 'Boat Rental Gift Cards | Florida Keys | Blue Skies Boat Rentals',
    description: 'Give the gift of a day on the water. Blue Skies Boat Rentals gift cards for Grady White boat rentals in the Florida Keys.',
  },
  '/loyalty': {
    title: 'Loyalty Rewards Program | Blue Skies Boat Rentals',
    description: 'Earn points on every boat rental and redeem for free trips, upgrades, and gear. Blue Skies Boat Rentals loyalty rewards program.',
  },
};

function injectMeta(html: string, meta: { title: string; description: string; image?: string; url: string; type?: string }) {
  const img = meta.image?.startsWith('http') ? meta.image : `${SITE}${meta.image || '/boat-alligator-reef.jpeg'}`;
  const ogType = meta.type || 'website';

  // Replace title
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${meta.description}" />`
  );

  // Inject OG + Twitter + canonical before </head>
  const tags = `
    <link rel="canonical" href="${meta.url}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:url" content="${meta.url}" />
    <meta property="og:site_name" content="Blue Skies Boat Rentals" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${meta.title}" />
    <meta name="twitter:description" content="${meta.description}" />
    <meta name="twitter:image" content="${img}" />`;

  html = html.replace('</head>', `${tags}\n  </head>`);
  return html;
}

app.get('*', async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOT_UA.test(ua);

  if (!isBot) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }

  // Bot detected — inject proper meta tags
  let html: string;
  try {
    html = (await import('fs')).readFileSync(path.join(distPath, 'index.html'), 'utf-8');
  } catch {
    return res.sendFile(path.join(distPath, 'index.html'));
  }

  const urlPath = req.path;

  try {
    // Blog post pages: /blog/:slug
    const blogMatch = urlPath.match(/^\/blog\/(.+)$/);
    if (blogMatch) {
      const [post] = await db.select().from(schema.posts).where(eq(schema.posts.slug, blogMatch[1]));
      if (post) {
        html = injectMeta(html, {
          title: `${post.title} | Blue Skies Boat Rentals`,
          description: post.excerpt || `${post.title} — Read on the Blue Skies Boat Rentals blog.`,
          image: post.coverImage || '/boat-alligator-reef.jpeg',
          url: `${SITE}/blog/${post.slug}`,
          type: 'article',
        });
        return res.send(html);
      }
    }

    // Boat detail pages: /boat/:id
    const boatMatch = urlPath.match(/^\/boat\/(\d+)$/);
    if (boatMatch) {
      const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, parseInt(boatMatch[1])));
      if (boat) {
        html = injectMeta(html, {
          title: `${boat.name} — ${boat.model} | Blue Skies Boat Rentals`,
          description: (boat.description || '').slice(0, 160),
          image: boat.imageUrl || '/boat-alligator-reef.jpeg',
          url: `${SITE}/boat/${boat.id}`,
        });
        return res.send(html);
      }
    }

    // Property detail pages: /stays/:slug
    const stayMatch = urlPath.match(/^\/stays\/(.+)$/);
    if (stayMatch) {
      const [property] = await db.select().from(schema.properties).where(eq(schema.properties.slug, stayMatch[1]));
      if (property) {
        html = injectMeta(html, {
          title: `${property.name} — ${property.location} | Blue Skies Boat Rentals`,
          description: (property.description || `${property.type} in ${property.location}.`).slice(0, 160),
          image: property.imageUrl || '/boat-alligator-reef.jpeg',
          url: `${SITE}/stays/${property.slug}`,
        });
        return res.send(html);
      }
    }

    // Location pages: /key-largo, /islamorada, /marathon
    const locSlug = urlPath.replace(/^\//, '');
    if (locationSEO[locSlug]) {
      const loc = locationSEO[locSlug];
      html = injectMeta(html, {
        title: loc.title,
        description: loc.description,
        image: loc.image,
        url: `${SITE}/${locSlug}`,
      });
      return res.send(html);
    }

    // Static pages
    if (staticPageSEO[urlPath]) {
      const page = staticPageSEO[urlPath];
      html = injectMeta(html, {
        title: page.title,
        description: page.description,
        url: `${SITE}${urlPath}`,
      });
      return res.send(html);
    }

    // Homepage
    if (urlPath === '/') {
      html = injectMeta(html, {
        title: 'Blue Skies Boat Rentals | Boat Rentals in Islamorada & the Florida Keys',
        description: 'Best boat rentals in the Florida Keys. Premium Grady White boats available bareboat or with a USCG-licensed captain. Based in Islamorada, serving Key Largo to Marathon. Book online today.',
        url: SITE,
      });
      return res.send(html);
    }
  } catch (err) {
    console.error('SEO meta injection error:', err);
  }

  // Fallback: serve as-is
  res.send(html);
});

const PORT = parseInt(process.env.PORT || '3001');

(async () => {
  try {
    await ensureProperties();
  } catch (err) {
    console.error('ensureProperties failed (continuing to serve):', err);
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
