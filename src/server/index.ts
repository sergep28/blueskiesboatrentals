import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
import Stripe from 'stripe';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());

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
      const bookingId = session.metadata?.bookingId;

      if (bookingRef) {
        // Mark booking as paid and confirmed
        db.update(schema.bookings)
          .set({
            paymentStatus: 'paid',
            status: 'confirmed',
            stripePaymentId: session.payment_intent as string,
            stripeSessionId: session.id,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.bookings.bookingRef, bookingRef))
          .run();

        // Update user stats
        const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, bookingRef));
        if (booking && booking.userId) {
          const [user] = await db.select().from(schema.users).where(eq(schema.users.id, booking.userId));
          if (user) {
            db.update(schema.users).set({
              bookingCount: user.bookingCount + 1,
              totalSpent: user.totalSpent + booking.total,
              loyaltyPoints: user.loyaltyPoints + (booking.loyaltyPointsEarned ?? 0),
              updatedAt: new Date().toISOString(),
            }).where(eq(schema.users.id, user.id)).run();
          }
        }

        // Handle referral transaction
        if (booking?.referralCode && booking.referralDiscount && booking.referralDiscount > 0) {
          const [partner] = await db.select().from(schema.partners)
            .where(eq(schema.partners.referralCode, booking.referralCode));
          if (partner) {
            const commission = booking.total * (partner.commissionRate / 100);
            db.insert(schema.referralTransactions).values({
              partnerId: partner.id,
              bookingId: booking.id,
              amount: booking.total,
              commission: Math.round(commission * 100) / 100,
            }).run();
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

app.use('/api/trpc', createExpressMiddleware({ router: appRouter }));

// Serve static files in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
