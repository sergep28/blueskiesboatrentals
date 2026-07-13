import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import superjson from 'superjson';
import type { AppRouter } from '../../server/router.js';

export const trpc = createTRPCReact<AppRouter>();

// The admin credential. Kept in localStorage so you stay logged in across browser
// restarts, and attached to every request so the server can authorize admin
// endpoints. Public pages simply send no header and are unaffected.
const TOKEN_KEY = 'admin_token';

export const getAdminToken = () => localStorage.getItem(TOKEN_KEY);
export const setAdminToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearAdminToken = () => localStorage.removeItem(TOKEN_KEY);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
});

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,
      headers: () => {
        const token = getAdminToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
