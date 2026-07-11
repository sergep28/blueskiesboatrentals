import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, or, desc, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { sendBookingConfirmation, sendWaiverPacket, sendDepositSettlement } from '../email.js';

// Auto-close finished trips: any confirmed booking whose last day is in the past
// (America/New_York) becomes 'completed'. Idempotent — runs when the bookings
// list/dashboard is loaded, so past trips close themselves off the readiness views.
async function autoCompletePastTrips() {
  try {
    await db.execute(sql.raw(`
      UPDATE bookings
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'confirmed'
        AND COALESCE(end_date, charter_date) < to_char((now() AT TIME ZONE 'America/New_York'), 'YYYY-MM-DD')
    `));
  } catch (e: any) {
    console.error('autoCompletePastTrips failed:', e.message);
  }
}
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
    await autoCompletePastTrips();
    const rows = await db.select().from(schema.bookings).orderBy(desc(schema.bookings.createdAt));
    // Strip the heavy ID-photo blobs from the list payload — they're only loaded
    // on demand via the readiness query when a booking drawer is opened.
    return rows.map(({ idFront, idBack, ...rest }) => rest);
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
    endDate: z.string().optional(),
  })).query(async ({ input }) => {
    const existing = await db.select().from(schema.bookings)
      .where(eq(schema.bookings.boatId, input.boatId));
    const reqStart = input.date;
    const reqEnd = input.endDate ?? input.date;
    const conflicts = existing.filter(b => {
      if (b.status === 'cancelled') return false;
      const bStart = b.charterDate;
      const bEnd = b.endDate ?? b.charterDate;
      // Date ranges overlap when bStart <= reqEnd AND bEnd >= reqStart
      return bStart <= reqEnd && bEnd >= reqStart;
    });
    return {
      available: conflicts.length === 0,
      bookedSlots: conflicts.map(b => b.duration),
      conflicts: conflicts.map(b => ({ start: b.charterDate, end: b.endDate ?? b.charterDate })),
    };
  }),

  // Every blocked-out date (inclusive) for a boat — bookings + admin blackouts.
  // For graying out the public booking calendar.
  bookedDates: publicProcedure.input(z.number()).query(async ({ input }) => {
    const [existing, blackouts] = await Promise.all([
      db.select().from(schema.bookings).where(eq(schema.bookings.boatId, input)),
      db.select().from(schema.boatBlackouts).where(eq(schema.boatBlackouts.boatId, input)),
    ]);
    const blocked = new Set<string>();
    const expand = (start: string, end: string) => {
      const s = new Date(start);
      const e = new Date(end);
      for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
        blocked.add(d.toISOString().slice(0, 10));
      }
    };
    for (const b of existing) {
      if (b.status === 'cancelled') continue;
      expand(b.charterDate, b.endDate ?? b.charterDate);
    }
    for (const bl of blackouts) {
      expand(bl.startDate, bl.endDate);
    }
    return Array.from(blocked).sort();
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
    pickupTime: z.string().optional(),
    dropoffTime: z.string().optional(),
    duration: z.enum(['half_day_am', 'half_day_pm', 'full_day', 'multi_day', 'custom']),
    charterType: z.enum(['fishing', 'cruising', 'snorkeling', 'sunset', 'sandbar', 'custom']),
    guestCount: z.number(),
    departurePort: z.string().optional(),
    specialRequests: z.string().optional(),
    referralCode: z.string().optional(),
    customPrice: z.number().positive().optional(),
    skipPayment: z.boolean().default(false),
    applyLoyaltyDiscount: z.boolean().default(false),
    signature: z.string().optional(),
    agreedToTerms: z.boolean().default(false),
    source: z.enum(['direct', 'website', 'boatsetter', 'getmyboat', 'phone', 'walkin', 'other']).optional(),
  })).mutation(async ({ input }) => {
    // Get boat pricing
    const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, input.boatId));
    if (!boat) throw new Error('Boat not found');

    // Calculate pricing — admin can override with customPrice (e.g., negotiated rate).
    // Any booking with an end date after the start is multi-day: daily rate × days
    // (must match getPrice()/the picker in client/pages/BookingPage.tsx).
    let subtotal: number;
    if (input.customPrice != null) {
      subtotal = input.customPrice;
    } else if (input.endDate && input.endDate > input.charterDate) {
      const days = Math.max(1, Math.round(
        (new Date(input.endDate).getTime() - new Date(input.charterDate).getTime()) / 86400000
      ));
      subtotal = (boat.priceMultiDay ?? boat.priceFullDay) * days;
    } else {
      subtotal = input.duration === 'full_day' || input.duration === 'multi_day'
        ? boat.priceFullDay
        : boat.priceHalfDay;
    }

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
      pickupTime: input.pickupTime,
      dropoffTime: input.dropoffTime,
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
      signature: input.signature,
      agreedToTerms: input.agreedToTerms,
      agreementSignedAt: input.agreedToTerms ? new Date().toISOString() : undefined,
      agreementVersion: '2026-06-07',
      // Explicit source wins; otherwise a checkout booking is 'website' and a
      // manual admin booking (skipPayment) is 'direct'.
      source: input.source ?? (input.skipPayment ? 'direct' : 'website'),
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

    // Determine booking source for conditional email logic.
    const bookingSource = input.source ?? 'direct';
    const isOta = bookingSource === 'boatsetter' || bookingSource === 'getmyboat';

    // Send confirmation email — skip for OTA bookings (the OTA already sent one).
    if (!isOta) {
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
    }

    // Auto-send waiver packet email (agreement + ID + waivers + deposit) for ALL bookings.
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const renterLink = `${appUrl}/waiver/${bookingRef}?renter=1`;
    const crewLink = `${appUrl}/waiver/${bookingRef}`;
    const depositAmount = 1000;

    // Auto-create Stripe deposit link if Stripe is configured.
    let depositLink: string | null = null;
    if (stripe) {
      try {
        const depositSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          customer_email: input.customerEmail,
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Refundable Security Deposit',
                description: `${boat.name} · ${input.charterDate} · Trip ${bookingRef}`,
              },
              unit_amount: depositAmount * 100,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${appUrl}/booking/success/${bookingRef}?deposit=1`,
          cancel_url: `${appUrl}/`,
          metadata: { type: 'deposit', bookingRef, bookingId: String(result.id) },
        });
        depositLink = depositSession.url;
        await db.update(schema.bookings).set({
          depositStatus: 'requested',
          depositAmount,
          depositStripeSessionId: depositSession.id,
        }).where(eq(schema.bookings.bookingRef, bookingRef));
      } catch (err) {
        console.error('Auto-create deposit link failed (waiver packet will omit it):', err);
      }
    }

    sendWaiverPacket({
      bookingRef,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      boatName: boat.name,
      charterDate: input.charterDate,
      endDate: input.endDate,
      duration: input.duration,
      guestCount: input.guestCount,
      depositAmount,
      renterLink,
      crewLink,
      depositLink,
    });

    return { bookingRef, total: Math.round(total * 100) / 100, checkoutUrl: null };
  }),

  // Renter e-signs the rental agreement (bareboat charter terms) via the trip link.
  // Used by external/off-platform trips where the renter never went through site checkout.
  signAgreement: publicProcedure.input(z.object({
    bookingRef: z.string(),
    signatureData: z.string().optional(),
    signaturePrinted: z.string().min(1),
  })).mutation(async ({ input }) => {
    const code = input.bookingRef.trim().toUpperCase();
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, code));
    if (!booking) throw new Error('Trip not found.');
    await db.update(schema.bookings).set({
      signature: input.signatureData ?? input.signaturePrinted,
      agreedToTerms: true,
      agreementSignedAt: new Date().toISOString(),
      agreementVersion: '2026-06-07',
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.bookings.bookingRef, code));
    return { ok: true };
  }),

  // Renter (via their link) or admin (backup) uploads the government ID.
  // Front required; back optional. idUploadedAt gates the readiness panel.
  uploadId: publicProcedure.input(z.object({
    bookingRef: z.string(),
    idFront: z.string().min(1),
    idBack: z.string().optional(),
  })).mutation(async ({ input }) => {
    const code = input.bookingRef.trim().toUpperCase();
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, code));
    if (!booking) throw new Error('Trip not found.');
    const now = new Date().toISOString();
    await db.update(schema.bookings).set({
      idFront: input.idFront,
      idBack: input.idBack ?? null,
      idUploadedAt: now,
      updatedAt: now,
    }).where(eq(schema.bookings.bookingRef, code));

    // Also save ID to the user profile so repeat customers don't re-upload.
    if (booking.userId) {
      await db.update(schema.users).set({
        idFront: input.idFront,
        idBack: input.idBack ?? null,
        idUploadedAt: now,
        updatedAt: now,
      }).where(eq(schema.users.id, booking.userId));
    }
    return { ok: true };
  }),

  // Aggregated pre-boarding readiness for ONE booking — powers the admin Trip
  // Readiness panel. Returns ID images too (single booking → payload is fine).
  readiness: publicProcedure.input(z.string()).query(async ({ input }) => {
    const code = input.trim().toUpperCase();
    const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, code));
    if (!b) return null;
    const signedWaivers = await db.select().from(schema.waivers).where(eq(schema.waivers.bookingRef, code));
    const [insp] = await db.select().from(schema.inspections)
      .where(eq(schema.inspections.bookingRef, code))
      .orderBy(desc(schema.inspections.signedAt));

    // Fall back to user profile ID if this booking doesn't have one yet (repeat customer).
    let idFront = b.idFront, idBack = b.idBack, idAt = b.idUploadedAt;
    if (!idAt && b.userId) {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, b.userId));
      if (user?.idUploadedAt) {
        idFront = user.idFront;
        idBack = user.idBack;
        idAt = user.idUploadedAt;
      }
    }

    return {
      bookingRef: b.bookingRef,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      agreement: { signed: b.agreedToTerms, at: b.agreementSignedAt },
      deposit: { status: b.depositStatus, amount: b.depositAmount, refunded: b.depositRefundedAmount, paidAt: b.depositPaidAt },
      waivers: { signed: signedWaivers.length, required: b.guestCount },
      inspection: { signed: !!insp?.acknowledged, at: insp?.signedAt ?? null },
      id: { uploaded: !!idAt, at: idAt, front: idFront, back: idBack },
    };
  }),

  // Lightweight readiness map for the whole list (bookingRef -> 5 booleans), in
  // 3 flat queries. Powers the ✓/⚠ dots on the bookings list rows.
  readinessList: publicProcedure.query(async () => {
    const rows = await db.select({
      bookingRef: schema.bookings.bookingRef,
      agreedToTerms: schema.bookings.agreedToTerms,
      idUploadedAt: schema.bookings.idUploadedAt,
      userId: schema.bookings.userId,
      depositStatus: schema.bookings.depositStatus,
      guestCount: schema.bookings.guestCount,
    }).from(schema.bookings);
    const waiverRows = await db.select({ bookingRef: schema.waivers.bookingRef }).from(schema.waivers);
    const inspRows = await db.select({ bookingRef: schema.inspections.bookingRef, acknowledged: schema.inspections.acknowledged }).from(schema.inspections);

    // Build a set of user IDs that have an ID on file.
    const userRows = await db.select({ id: schema.users.id, idUploadedAt: schema.users.idUploadedAt }).from(schema.users);
    const usersWithId = new Set<number>();
    for (const u of userRows) if (u.idUploadedAt) usersWithId.add(u.id);

    const waiverCount: Record<string, number> = {};
    for (const w of waiverRows) waiverCount[w.bookingRef] = (waiverCount[w.bookingRef] ?? 0) + 1;
    const inspSigned = new Set<string>();
    for (const i of inspRows) if (i.acknowledged) inspSigned.add(i.bookingRef);

    const out: Record<string, { agreement: boolean; id: boolean; waivers: boolean; inspection: boolean; deposit: boolean }> = {};
    for (const b of rows) {
      const signed = waiverCount[b.bookingRef] ?? 0;
      const hasId = !!b.idUploadedAt || (b.userId != null && usersWithId.has(b.userId));
      out[b.bookingRef] = {
        agreement: b.agreedToTerms,
        id: hasId,
        waivers: b.guestCount > 0 && signed >= b.guestCount,
        inspection: inspSigned.has(b.bookingRef),
        deposit: ['paid', 'partially_refunded', 'refunded'].includes(b.depositStatus),
      };
    }
    return out;
  }),

  // --- Security deposit ($1,000 refundable, charged separately from the trip) ---

  // Create a Stripe Checkout link for the deposit and mark it 'requested'. The
  // admin texts/emails the returned URL to the renter. Stripe Checkout URLs
  // expire in ~24h, so we don't persist the URL — regenerate to get a fresh one.
  requestDeposit: publicProcedure.input(z.object({
    bookingId: z.number(),
    amount: z.number().positive().optional(),
  })).mutation(async ({ input }) => {
    if (!stripe) throw new Error('Stripe is not configured on the server.');
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, input.bookingId));
    if (!booking) throw new Error('Booking not found.');
    const amount = input.amount ?? booking.depositAmount ?? 1000;
    const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, booking.boatId));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: booking.customerEmail,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Refundable Security Deposit',
            description: `${boat?.name ?? 'Vessel'} · ${booking.charterDate} · Trip ${booking.bookingRef}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.APP_URL || 'http://localhost:5173'}/booking/success/${booking.bookingRef}?deposit=1`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5173'}/`,
      metadata: {
        type: 'deposit',
        bookingRef: booking.bookingRef,
        bookingId: String(booking.id),
      },
    });

    await db.update(schema.bookings).set({
      depositStatus: 'requested',
      depositAmount: amount,
      depositStripeSessionId: session.id,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.bookings.id, booking.id));

    return { checkoutUrl: session.url, amount };
  }),

  // Manual fallback for deposits collected off-platform (Zelle/Venmo/cash).
  markDepositPaid: publicProcedure.input(z.object({
    bookingId: z.number(),
    amount: z.number().positive().optional(),
  })).mutation(async ({ input }) => {
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, input.bookingId));
    if (!booking) throw new Error('Booking not found.');
    await db.update(schema.bookings).set({
      depositStatus: 'paid',
      depositAmount: input.amount ?? booking.depositAmount ?? 1000,
      depositPaidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.bookings.id, booking.id));
    return { ok: true };
  }),

  // Settle after the post-trip inspection: keep `deductions`, refund the rest.
  // Issues a real Stripe refund when the deposit was paid via card; otherwise
  // just records the amounts (owner refunds manually via Zelle/Venmo).
  settleDeposit: publicProcedure.input(z.object({
    bookingId: z.number(),
    deductions: z.number().min(0).default(0),
    deductionsNote: z.string().optional(),
  })).mutation(async ({ input }) => {
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, input.bookingId));
    if (!booking) throw new Error('Booking not found.');
    if (booking.depositStatus !== 'paid') throw new Error('Deposit must be paid before it can be settled.');
    const held = booking.depositAmount ?? 1000;
    const deductions = Math.min(input.deductions, held);
    const refundAmount = Math.round((held - deductions) * 100) / 100;

    if (refundAmount > 0 && booking.depositPaymentIntentId && stripe) {
      await stripe.refunds.create({
        payment_intent: booking.depositPaymentIntentId,
        amount: Math.round(refundAmount * 100),
      });
    }

    await db.update(schema.bookings).set({
      depositRefundedAmount: refundAmount,
      depositStatus: deductions > 0 ? 'partially_refunded' : 'refunded',
      depositDeductionsNote: input.deductionsNote ?? null,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.bookings.id, booking.id));

    // Send deposit settlement email to customer with breakdown.
    const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, booking.boatId));
    sendDepositSettlement({
      bookingRef: booking.bookingRef,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      boatName: boat?.name ?? 'your vessel',
      charterDate: booking.charterDate,
      depositAmount: held,
      deductions,
      deductionsNote: input.deductionsNote,
      refundAmount,
    });

    return { ok: true, refundAmount, deductions };
  }),

  updateStatus: publicProcedure.input(z.object({
    id: z.number(),
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  })).mutation(async ({ input }) => {
    return db.update(schema.bookings).set({ status: input.status }).where(eq(schema.bookings.id, input.id));
  }),

  update: publicProcedure.input(z.object({
    id: z.number(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    charterDate: z.string().optional(),
    endDate: z.string().nullable().optional(),
    pickupTime: z.string().nullable().optional(),
    dropoffTime: z.string().nullable().optional(),
    duration: z.enum(['half_day_am', 'half_day_pm', 'full_day', 'multi_day', 'custom']).optional(),
    charterType: z.enum(['fishing', 'cruising', 'snorkeling', 'sunset', 'sandbar', 'custom']).optional(),
    guestCount: z.number().optional(),
    departurePort: z.string().optional(),
    specialRequests: z.string().optional(),
    boatId: z.number().optional(),
    subtotal: z.number().min(0).optional(),
    total: z.number().min(0).optional(),
    paymentStatus: z.enum(['pending', 'paid', 'refunded']).optional(),
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  })).mutation(async ({ input }) => {
    const { id, ...patch } = input;
    const cleaned: Record<string, any> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) cleaned[k] = v;
    }
    // Preferred path: admin edits the pre-tax base; tax is always 7.5% on top.
    if (patch.subtotal !== undefined) {
      const tax = patch.subtotal * 0.075;
      cleaned.tax = Math.round(tax * 100) / 100;
      cleaned.total = Math.round((patch.subtotal + tax) * 100) / 100;
    } else if (patch.total !== undefined) {
      // Legacy path: a gross total was supplied — back the 7.5% tax out of it.
      const tax = patch.total * 0.075 / 1.075;
      cleaned.tax = Math.round(tax * 100) / 100;
      cleaned.subtotal = Math.round((patch.total - tax) * 100) / 100;
    }
    await db.update(schema.bookings).set(cleaned).where(eq(schema.bookings.id, id));
    return { ok: true };
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

      // Default status by date: future = confirmed, past = completed.
      // Honor explicit status from the CSV if provided.
      const today = new Date().toISOString().slice(0, 10);
      const status = booking.status ?? (booking.charterDate >= today ? 'confirmed' : 'completed');
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

  // Email activity log for a booking — all emails sent to/about this booking,
  // plus any emails to this customer's email (marketing, etc). Newest first.
  emailLog: publicProcedure.input(z.string()).query(async ({ input }) => {
    const code = input.trim().toUpperCase();
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, code));
    if (!booking) return [];
    // Get emails tied to this booking ref OR to this customer's email address.
    return db.select({
      id: schema.emailLogs.id,
      bookingRef: schema.emailLogs.bookingRef,
      customerEmail: schema.emailLogs.customerEmail,
      customerName: schema.emailLogs.customerName,
      type: schema.emailLogs.type,
      subject: schema.emailLogs.subject,
      resendId: schema.emailLogs.resendId,
      status: schema.emailLogs.status,
      error: schema.emailLogs.error,
      createdAt: schema.emailLogs.createdAt,
    }).from(schema.emailLogs)
      .where(or(
        eq(schema.emailLogs.bookingRef, code),
        eq(schema.emailLogs.customerEmail, booking.customerEmail),
      ))
      .orderBy(desc(schema.emailLogs.createdAt));
  }),

  // Fetch the full HTML body for one email log entry (loaded on demand to keep the list lightweight).
  emailLogBody: publicProcedure.input(z.number()).query(async ({ input }) => {
    const [row] = await db.select({ htmlBody: schema.emailLogs.htmlBody }).from(schema.emailLogs).where(eq(schema.emailLogs.id, input));
    return row?.htmlBody ?? null;
  }),

  delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    await db.delete(schema.bookings).where(eq(schema.bookings.id, input));
    return { ok: true };
  }),
});
