import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  : null;

function generateRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'BSC-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const bookingsRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(schema.bookings).orderBy(desc(schema.bookings.createdAt)).all();
  }),

  getByRef: publicProcedure.input(z.string()).query(async ({ input }) => {
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, input));
    return booking ?? null;
  }),

  getByEmail: publicProcedure.input(z.string()).query(async ({ input }) => {
    return db.select().from(schema.bookings).where(eq(schema.bookings.customerEmail, input)).orderBy(desc(schema.bookings.createdAt)).all();
  }),

  checkAvailability: publicProcedure.input(z.object({
    boatId: z.number(),
    date: z.string(),
  })).query(async ({ input }) => {
    const existing = await db.select().from(schema.bookings)
      .where(eq(schema.bookings.boatId, input.boatId))
      .all();
    const booked = existing.filter(b =>
      b.charterDate === input.date &&
      b.status !== 'cancelled'
    );
    return {
      available: booked.length === 0,
      bookedSlots: booked.map(b => b.duration),
    };
  }),

  create: publicProcedure.input(z.object({
    boatId: z.number(),
    captainId: z.number().optional(),
    captainRequested: z.boolean().default(false),
    customerName: z.string(),
    customerEmail: z.string(),
    customerPhone: z.string().optional(),
    charterDate: z.string(),
    duration: z.enum(['half_day_am', 'half_day_pm', 'full_day', 'multi_day', 'custom']),
    charterType: z.enum(['fishing', 'cruising', 'snorkeling', 'sunset', 'sandbar', 'custom']),
    guestCount: z.number(),
    departurePort: z.string().optional(),
    specialRequests: z.string().optional(),
    referralCode: z.string().optional(),
  })).mutation(async ({ input }) => {
    // Get boat pricing
    const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, input.boatId));
    if (!boat) throw new Error('Boat not found');

    // Calculate pricing
    let subtotal = input.duration === 'full_day' || input.duration === 'multi_day'
      ? boat.priceFullDay
      : boat.priceHalfDay;

    // Captain fee
    let captainFee = 0;
    if (input.captainRequested && input.captainId) {
      const [captain] = await db.select().from(schema.captains).where(eq(schema.captains.id, input.captainId));
      if (captain) {
        captainFee = input.duration === 'full_day' || input.duration === 'multi_day'
          ? captain.dailyRate
          : captain.halfDayRate;
      }
    }

    // Check referral code
    let referralDiscount = 0;
    if (input.referralCode) {
      const [partner] = await db.select().from(schema.partners)
        .where(eq(schema.partners.referralCode, input.referralCode));
      if (partner && partner.status === 'active') {
        referralDiscount = (subtotal + captainFee) * 0.05;
      }
    }

    const beforeTax = subtotal + captainFee - referralDiscount;
    const tax = beforeTax * 0.075;
    const total = beforeTax + tax;
    const loyaltyPointsEarned = Math.floor(total / 5);

    const bookingRef = generateRef();

    // Create or update user record
    const existingUsers = await db.select().from(schema.users).where(eq(schema.users.email, input.customerEmail));
    let userId: number;
    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      userId = user.id;
    } else {
      const userResult = db.insert(schema.users).values({
        name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone,
        bookingCount: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
      }).run();
      userId = Number(userResult.lastInsertRowid);
    }

    // Create booking as pending
    const result = db.insert(schema.bookings).values({
      bookingRef,
      boatId: input.boatId,
      userId,
      captainId: input.captainRequested ? input.captainId : undefined,
      captainRequested: input.captainRequested,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      charterDate: input.charterDate,
      duration: input.duration,
      charterType: input.charterType,
      guestCount: input.guestCount,
      departurePort: input.departurePort,
      specialRequests: input.specialRequests,
      subtotal,
      captainFee,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      referralCode: input.referralCode,
      referralDiscount: Math.round(referralDiscount * 100) / 100,
      loyaltyPointsEarned,
      paymentStatus: 'pending',
      status: 'pending',
    }).run();

    // If Stripe is configured, create a Checkout session
    if (stripe) {
      const durationLabel = input.duration.replace(/_/g, ' ');
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: input.customerEmail,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${boat.name} — ${durationLabel}`,
              description: `${input.charterDate} | ${input.charterType} | ${input.guestCount} guests`,
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.APP_URL || 'http://localhost:5173'}/booking/success/${bookingRef}`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:5173'}/book`,
        metadata: {
          bookingRef,
          bookingId: String(result.lastInsertRowid),
        },
      });

      // Store the session ID on the booking
      db.update(schema.bookings)
        .set({ stripeSessionId: session.id })
        .where(eq(schema.bookings.bookingRef, bookingRef))
        .run();

      return { bookingRef, total: Math.round(total * 100) / 100, checkoutUrl: session.url };
    }

    // No Stripe configured — auto-confirm (dev mode)
    db.update(schema.bookings)
      .set({ paymentStatus: 'paid', status: 'confirmed' })
      .where(eq(schema.bookings.bookingRef, bookingRef))
      .run();

    // Update user stats
    const user = existingUsers[0];
    if (user) {
      db.update(schema.users).set({
        bookingCount: user.bookingCount + 1,
        totalSpent: user.totalSpent + Math.round(total * 100) / 100,
        loyaltyPoints: user.loyaltyPoints + loyaltyPointsEarned,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.users.id, user.id)).run();
    }

    // Handle referral transaction
    if (input.referralCode && referralDiscount > 0) {
      const [partner] = await db.select().from(schema.partners)
        .where(eq(schema.partners.referralCode, input.referralCode));
      if (partner) {
        const commission = total * (partner.commissionRate / 100);
        db.insert(schema.referralTransactions).values({
          partnerId: partner.id,
          bookingId: Number(result.lastInsertRowid),
          amount: total,
          commission: Math.round(commission * 100) / 100,
        }).run();
      }
    }

    return { bookingRef, total: Math.round(total * 100) / 100, checkoutUrl: null };
  }),

  updateStatus: publicProcedure.input(z.object({
    id: z.number(),
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  })).mutation(async ({ input }) => {
    return db.update(schema.bookings).set({ status: input.status }).where(eq(schema.bookings.id, input.id)).run();
  }),

  assignCaptain: publicProcedure.input(z.object({
    id: z.number(),
    captainId: z.number(),
  })).mutation(async ({ input }) => {
    return db.update(schema.bookings).set({ captainId: input.captainId }).where(eq(schema.bookings.id, input.id)).run();
  }),
});
