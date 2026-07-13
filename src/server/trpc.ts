import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import superjson from 'superjson';
import { timingSafeEqual } from 'crypto';

// The admin secret lives ONLY in the environment (Render), never in the client
// bundle. The gate this replaces was a PIN hardcoded in AdminLayout.tsx, which
// shipped to every visitor's browser and which the server never checked at all.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD && process.env.NODE_ENV === 'production') {
  // Fail loudly at boot rather than silently serving an unprotected admin API.
  throw new Error(
    'ADMIN_PASSWORD is not set — the admin API would be unauthenticated. ' +
    'Set it in the Render dashboard before deploying.',
  );
}

// Constant-time compare so an attacker cannot recover the password by measuring
// how long a wrong guess takes to be rejected.
function passwordMatches(supplied: string | undefined): boolean {
  if (!ADMIN_PASSWORD || !supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createContext({ req }: CreateExpressContextOptions) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  return { isAdmin: passwordMatches(token) };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;

// Customer-facing: booking, waiver signing, blog, boat listings.
export const publicProcedure = t.procedure;

// Everything behind the admin panel. Rejects the request before it reaches any
// handler, so this is an authorization boundary, not a UI convention.
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin login required.' });
  }
  return next({ ctx });
});

// Verifies a password without exposing data — powers the login screen.
export const checkAdminPassword = (password: string) => passwordMatches(password);
