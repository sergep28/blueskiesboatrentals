import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';
import Stripe from 'stripe';
import { sendBookingConfirmation } from '../email.js';
import { getDiscount } from '../../lib/loyalty.js';

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
    return db.select().from(schema.bookings).orderBy(desc(schema.bookings.createdAt));
  }),

  getByRef: publicProcedure.input(z.string()).query(async ({ input }) => {
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, input));
    return booking ?? null;
  }),

  getByEmail: publicProcedure.input(z.string()).query(async ({ input }) => {
    return db.select().from(schema.bookings).where(eq(schema.bookings.customerEmail, input)).orderBy(desc(schema.bookings.createdAt));
  }),

  checkAvailability: publicProcedure.input(z.object({
    boatId: z.number(),
    date: z.string(),
  })).query(async ({ input }) => {
    const existing = await db.select().from(schema.bookings)
      .where(eq(schema.bookings.boatId, input.boatId))
      ;
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
    endDate: z.string().optional(),
    duration: z.enum(['half_day_am', 'half_day_pm', 'full_day', 'multi_day', 'custom']),
    charterType: z.enum(['fishing', 'cruising', 'snorkeling', 'sunset', 'sandbar', 'custom']),
    guestCount: z.number(),
    departurePort: z.string().optional(),
    specialRequests: z.string().optional(),
    referralCode: z.string().optional(),
    customPrice: z.number().positive().optional(),
    skipPayment: z.boolean().default(false),
    applyLoyaltyDiscount: z.boolean().default(false),
  })).mutation(async ({ input }) => {
    // Get boat pricing
    const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, input.boatId));
    if (!boat) throw new Error('Boat not found');

    // Calculate pricing — admin can override with customPrice (e.g., negotiated rate)
    let subtotal = input.customPrice ?? (
      input.duration === 'full_day' || input.duration === 'multi_day'
        ? boat.priceFullDay
        : boat.priceHalfDay
    );

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

    // Loyalty tier discount — based on customer's lifetime points
    let loyaltyDiscount = 0;
    if (input.applyLoyaltyDiscount) {
      const [existingForDiscount] = await db.select().from(schema.users).where(eq(schema.users.email, input.customerEmail));
      const pct = existingForDiscount ? getDiscount(existingForDiscount.loyaltyPoints) : 0;
      if (pct > 0) {
        loyaltyDiscount = (subtotal + captainFee - referralDiscount) * pct;
      }
    }

    const beforeTax = subtotal + captainFee - referralDiscount - loyaltyDiscount;
    const tax = beforeTax * 0.075;
    const total = beforeTax + tax;
    // New earn rate: 1 point per $1 of actual booking total (post-discount)
    const loyaltyPointsEarned = Math.round(total);

    const bookingRef = generateRef();

    // Create or update user record
    const existingUsers = await db.select().from(schema.users).where(eq(schema.users.email, input.customerEmail));
    let userId: number;
    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      userId = user.id;
    } else {
      const [userResult] = await db.insert(schema.users).values({
        name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone,
        bookingCount: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
      }).returning({ id: schema.users.id });
      userId = userResult.id;
    }

    // Create booking as pending
    const [result] = await db.insert(schema.bookings).values({
      bookingRef,
      boatId: input.boatId,
      userId,
      captainId: input.captainRequested ? input.captainId : undefined,
      captainRequested: input.captainRequested,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      charterDate: input.charterDate,
      endDate: input.endDate,
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
    }).returning({ id: schema.bookings.id });

    // If Stripe is configured AND this isn't a manual admin booking, create a Checkout session
    if (stripe && !input.skipPayment) {
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
          bookingId: String(result.id),
        },
      });

      // Store the session ID on the booking
      await db.update(schema.bookings)
        .set({ stripeSessionId: session.id })
        .where(eq(schema.bookings.bookingRef, bookingRef))
        ;

      return { bookingRef, total: Math.round(total * 100) / 100, checkoutUrl: session.url };
    }

    // No Stripe checkout — either Stripe isn't configured, OR this is a manual admin booking
    // (payment happened off-platform via cash/Zelle/etc). Mark paid + confirmed and update stats.
    await db.update(schema.bookings)
      .set({ paymentStatus: 'paid', status: 'confirmed' })
      .where(eq(schema.bookings.bookingRef, bookingRef));

    // Update user stats — fetch fresh so this works for newly-created users too
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    if (user) {
      await db.update(schema.users).set({
        bookingCount: user.bookingCount + 1,
        totalSpent: user.totalSpent + Math.round(total * 100) / 100,
        loyaltyPoints: user.loyaltyPoints + loyaltyPointsEarned,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.users.id, user.id));
    }

    // Handle referral transaction
    if (input.referralCode && referralDiscount > 0) {
      const [partner] = await db.select().from(schema.partners)
        .where(eq(schema.partners.referralCode, input.referralCode));
      if (partner) {
        const commission = total * (partner.commissionRate / 100);
        await db.insert(schema.referralTransactions).values({
          partnerId: partner.id,
          bookingId: result.id,
          amount: total,
          commission: Math.round(commission * 100) / 100,
        });
      }
    }

    // Send confirmation emails
    const userForEmail = existingUsers[0];
    sendBookingConfirmation({
      bookingRef,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      boatName: boat.name,
      boatModel: boat.model,
      charterDate: input.charterDate,
      duration: input.duration,
      charterType: input.charterType,
      guestCount: input.guestCount,
      departurePort: input.departurePort,
      specialRequests: input.specialRequests,
      captainRequested: input.captainRequested,
      subtotal,
      captainFee,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      pointsEarned: loyaltyPointsEarned,
      totalPoints: userForEmail ? userForEmail.loyaltyPoints + loyaltyPointsEarned : loyaltyPointsEarned,
    });

    return { bookingRef, total: Math.round(total * 100) / 100, checkoutUrl: null };
  }),

  updateStatus: publicProcedure.input(z.object({
    id: z.number(),
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  })).mutation(async ({ input }) => {
    return db.update(schema.bookings).set({ status: input.status }).where(eq(schema.bookings.id, input.id));
  }),

  assignCaptain: publicProcedure.input(z.object({
    id: z.number(),
    captainId: z.number(),
  })).mutation(async ({ input }) => {
    return db.update(schema.bookings).set({ captainId: input.captainId }).where(eq(schema.bookings.id, input.id));
  }),

  importBookings: publicProcedure.input(z.array(z.object({
    customerName: z.string(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    charterDate: z.string(),
    endDate: z.string().optional(),
    total: z.number(),
    platform: z.string().optional(),
    description: z.string().optional(),
    ref: z.string().optional(),
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  }))).mutation(async ({ input }) => {
    let imported = 0;
    const boats = await db.select().from(schema.boats);
    const defaultBoatId = boats.find(b => b.status === 'active')?.id ?? 1;

    for (const booking of input) {
      const bookingRef = booking.ref || `IMP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

      // Check if this ref already exists
      const existing = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, bookingRef));
      if (existing.length > 0) continue;

      const tax = booking.total * 0.075 / 1.075; // Back out tax from total
      const subtotal = booking.total - tax;
      const loyaltyPointsEarned = Math.round(booking.total);

      // Create or find user
      let userId: number | undefined;
      if (booking.customerEmail) {
        const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.email, booking.customerEmail));
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const [result] = await db.insert(schema.users).values({
            name: booking.customerName,
            email: booking.customerEmail,
            phone: booking.customerPhone,
            bookingCount: 0,
            totalSpent: 0,
            loyaltyPoints: 0,
          }).returning({ id: schema.users.id });
          userId = result.id;
        }
      }

      const status = booking.status ?? 'completed';
      const paymentStatus: 'pending' | 'paid' | 'refunded' =
        status === 'cancelled' ? 'refunded' :
        status === 'pending' ? 'pending' :
        'paid';

      await db.insert(schema.bookings).values({
        bookingRef,
        boatId: defaultBoatId,
        userId,
        captainRequested: false,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail || 'unknown@imported.com',
        customerPhone: booking.customerPhone,
        charterDate: booking.charterDate,
        endDate: booking.endDate,
        duration: booking.endDate ? 'multi_day' : 'full_day',
        charterType: 'cruising',
        guestCount: 4,
        subtotal: Math.round(subtotal * 100) / 100,
        captainFee: 0,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(booking.total * 100) / 100,
        loyaltyPointsEarned,
        paymentStatus,
        status,
      });

      // Update user stats — only for actually-paid bookings (skip cancelled)
      if (userId && status !== 'cancelled') {
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
        if (user) {
          await db.update(schema.users).set({
            bookingCount: user.bookingCount + 1,
            totalSpent: user.totalSpent + booking.total,
            loyaltyPoints: user.loyaltyPoints + loyaltyPointsEarned,
            updatedAt: new Date().toISOString(),
          }).where(eq(schema.users.id, userId));
        }
      }

      imported++;
    }
    return { imported, total: input.length };
  }),
});
