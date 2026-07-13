import { z } from 'zod';
import { router, adminProcedure } from '../trpc.js';
import { getEmailStatus, sendTestEmail } from '../email.js';

export const systemRouter = router({
  emailStatus: adminProcedure.query(() => getEmailStatus()),
  sendTestEmail: adminProcedure
    .input(z.object({ to: z.string().email() }))
    .mutation(({ input }) => sendTestEmail(input.to)),
});
