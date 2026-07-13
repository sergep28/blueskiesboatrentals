import { z } from 'zod';
import { router, publicProcedure, adminProcedure, checkAdminPassword } from '../trpc.js';

export const authRouter = router({
  // Validates the password so the login screen can show an error. The password
  // itself is the bearer credential — on success the client stores it and sends
  // it as `Authorization: Bearer <password>` on every subsequent request, where
  // adminProcedure re-checks it. This endpoint grants nothing on its own.
  login: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(({ input }) => {
      if (!checkAdminPassword(input.password)) {
        return { ok: false as const };
      }
      return { ok: true as const };
    }),

  // Lets the client confirm a stored credential is still valid on page load,
  // so a rotated password logs the browser out instead of showing a broken panel.
  me: adminProcedure.query(() => ({ isAdmin: true })),
});
