import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { sendMarketingEmail } from '../email.js';

export const marketingRouter = router({
  sendEmail: publicProcedure
    .input(z.object({
      recipients: z.array(z.object({
        email: z.string().email(),
        name: z.string(),
      })),
      subject: z.string().min(1),
      message: z.string().min(1),
      template: z.string().default('custom'),
    }))
    .mutation(async ({ input }) => {
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const recipient of input.recipients) {
        try {
          await sendMarketingEmail({
            to: recipient.email,
            name: recipient.name,
            subject: input.subject,
            message: input.message,
            template: input.template,
          });
          sent++;
        } catch (err: any) {
          failed++;
          errors.push(`${recipient.email}: ${err?.message ?? 'Unknown error'}`);
        }
      }

      return { sent, failed, errors, total: input.recipients.length };
    }),
});
