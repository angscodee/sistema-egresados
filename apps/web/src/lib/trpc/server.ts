/**
 * tRPC caller for Next.js Server Components.
 * Use this in `page.tsx` / `layout.tsx` files that run on the server.
 *
 * Example:
 *   import { serverTrpc } from '@/lib/trpc/server';
 *   const ofertas = await serverTrpc.ofertas.findAll({});
 */
import 'server-only';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { cookies } from 'next/headers';
import type { AppRouter } from '@egresados/api/trpc';

function getApiUrl() {
  // In server context use the internal URL (no NEXT_PUBLIC_ prefix needed)
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export const serverTrpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getApiUrl()}/trpc`,
      async headers() {
        // Forward the auth cookie from the incoming request to the API
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        return token ? { cookie: `auth_token=${token}` } : {};
      },
    }),
  ],
});
