import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { getEmailStatus, sendTestEmail } from '../email.js';

export const systemRouter = router({
  emailStatus: publicProcedure.query(() => getEmailStatus()),
  sendTestEmail: publicProcedure
    .input(z.object({ to: z.string().email() }))
    .mutation(({ input }) => sendTestEmail(input.to)),
});
