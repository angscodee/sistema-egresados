import 'server-only';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { cookies } from 'next/headers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppRouter = any;

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export const serverTrpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getApiUrl()}/trpc`,
      async headers() {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        return token ? { cookie: `auth_token=${token}` } : {};
      },
    }),
  ],
});
