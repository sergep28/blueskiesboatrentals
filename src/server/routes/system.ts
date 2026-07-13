import { z } from 'zod';
import { router, adminProcedure } from '../trpc.js';
import { getEmailStatus, sendTestEmail } from '../email.js';
import { db, schema } from '../../db/index.js';
import { desc, eq, and, or, ilike, type SQL } from 'drizzle-orm';

export const systemRouter = router({
  emailStatus: adminProcedure.query(() => getEmailStatus()),
  sendTestEmail: adminProcedure
    .input(z.object({ to: z.string().email() }))
    .mutation(({ input }) => sendTestEmail(input.to)),

  // Every email that has ever gone out to a customer. The data was already being
  // recorded on every send — it just had no screen, so the only way to see what
  // a customer had received was to open their booking one at a time.
  sentEmails: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      type: z.string().optional(),
      limit: z.number().max(200).default(100),
    }).optional())
    .query(async ({ input }) => {
      const conditions: SQL[] = [];

      if (input?.type && input.type !== 'all') {
        conditions.push(eq(schema.emailLogs.type, input.type as never));
      }
      if (input?.search) {
        const q = `%${input.search.replace(/[\\%_]/g, ch => `\\${ch}`)}%`;
        conditions.push(or(
          ilike(schema.emailLogs.customerEmail, q),
          ilike(schema.emailLogs.customerName, q),
          ilike(schema.emailLogs.subject, q),
          ilike(schema.emailLogs.bookingRef, q),
        )!);
      }

      // htmlBody is a large blob — fetch it only when a row is opened.
      return db.select({
        id: schema.emailLogs.id,
        bookingRef: schema.emailLogs.bookingRef,
        customerEmail: schema.emailLogs.customerEmail,
        customerName: schema.emailLogs.customerName,
        type: schema.emailLogs.type,
        subject: schema.emailLogs.subject,
        status: schema.emailLogs.status,
        error: schema.emailLogs.error,
        sentAt: schema.emailLogs.createdAt,
      })
        .from(schema.emailLogs)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(schema.emailLogs.id))
        .limit(input?.limit ?? 100);
    }),

  // The exact HTML the customer received.
  sentEmailBody: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [row] = await db.select().from(schema.emailLogs)
        .where(eq(schema.emailLogs.id, input.id));
      if (!row) throw new Error('Email not found.');
      return row;
    }),
});
