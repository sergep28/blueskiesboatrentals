import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';

export const captainsRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(schema.captains);
  }),
});

export const galleryRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(schema.gallery).orderBy(schema.gallery.sortOrder);
  }),
  byCategory: publicProcedure.input(z.string()).query(async ({ input }) => {
    if (input === 'all') return db.select().from(schema.gallery).orderBy(schema.gallery.sortOrder);
    return db.select().from(schema.gallery).where(eq(schema.gallery.category, input as any)).orderBy(schema.gallery.sortOrder);
  }),
});

export const reviewsRouter = router({
  approved: publicProcedure.query(async () => {
    return db.select().from(schema.reviews).where(eq(schema.reviews.status, 'approved'));
  }),
  list: publicProcedure.query(async () => {
    return db.select().from(schema.reviews).orderBy(desc(schema.reviews.createdAt));
  }),
});

export const partnersRouter = router({
  validateCode: publicProcedure.input(z.string()).query(async ({ input }) => {
    const [partner] = await db.select().from(schema.partners).where(eq(schema.partners.referralCode, input));
    if (partner && partner.status === 'active') {
      return { valid: true, businessName: partner.businessName };
    }
    return { valid: false, businessName: null };
  }),
  register: publicProcedure.input(z.object({
    businessName: z.string(),
    contactName: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    type: z.enum(['airbnb_host', 'hotel', 'restaurant', 'concierge', 'other']),
  })).mutation(async ({ input }) => {
    const code = 'BSC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.insert(schema.partners).values({ ...input, referralCode: code });
    return { referralCode: code };
  }),
  getByCode: publicProcedure.input(z.string()).query(async ({ input }) => {
    const [partner] = await db.select().from(schema.partners).where(eq(schema.partners.referralCode, input));
    return partner ?? null;
  }),
  list: publicProcedure.query(async () => {
    return db.select().from(schema.partners);
  }),
  updateStatus: publicProcedure.input(z.object({
    id: z.number(),
    status: z.enum(['pending', 'active', 'suspended']),
  })).mutation(async ({ input }) => {
    return db.update(schema.partners).set({ status: input.status }).where(eq(schema.partners.id, input.id));
  }),
});

export const rewardsRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(schema.rewards).where(eq(schema.rewards.status, 'active'));
  }),
});

export const usersRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(schema.users);
  }),
  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, input));
    return user ?? null;
  }),
  getByEmail: publicProcedure.input(z.string()).query(async ({ input }) => {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input));
    return user ?? null;
  }),
  createProfile: publicProcedure.input(z.object({
    email: z.string(),
    password: z.string().min(6),
  })).mutation(async () => {
    // Profile/password feature not implemented — schema lacks password_hash/has_profile columns.
    throw new Error('Profile creation is not yet implemented');
  }),
  importCustomers: publicProcedure.input(z.array(z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    bookingCount: z.number().default(0),
    totalSpent: z.number().default(0),
  }))).mutation(async ({ input }) => {
    let imported = 0;
    let skipped = 0;
    for (const customer of input) {
      const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, customer.email));
      if (existing) {
        // Update existing user with higher values
        await db.update(schema.users).set({
          name: customer.name || existing.name,
          phone: customer.phone || existing.phone,
          bookingCount: Math.max(existing.bookingCount, customer.bookingCount),
          totalSpent: Math.max(existing.totalSpent, customer.totalSpent),
          loyaltyPoints: Math.max(existing.loyaltyPoints, Math.round(customer.totalSpent)),
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.users.id, existing.id));
        skipped++;
      } else {
        const loyaltyPoints = Math.round(customer.totalSpent);
        await db.insert(schema.users).values({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          bookingCount: customer.bookingCount,
          totalSpent: customer.totalSpent,
          loyaltyPoints,
        });
        imported++;
      }
    }
    return { imported, updated: skipped, total: input.length };
  }),
});

export const statsRouter = router({
  overview: publicProcedure.query(async () => {
    const allBookings = await db.select().from(schema.bookings);
    const allUsers = await db.select().from(schema.users);
    const allBoats = await db.select().from(schema.boats);
    const allPartners = await db.select().from(schema.partners);

    const totalRevenue = allBookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.total, 0);

    return {
      totalUsers: allUsers.length,
      totalBookings: allBookings.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeBoats: allBoats.filter(b => b.status === 'active').length,
      totalPartners: allPartners.filter(p => p.status === 'active').length,
    };
  }),

  bookingsByType: publicProcedure.query(async () => {
    const allBookings = await db.select().from(schema.bookings);
    const byType: Record<string, number> = {};
    allBookings.forEach(b => {
      byType[b.charterType] = (byType[b.charterType] || 0) + 1;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }),
});
