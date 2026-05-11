'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getAuthHeaders, getTrpcUrl, trpc } from './client';

function TRPCClientProvider({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getTrpcUrl(),
          headers() {
            const token =
              typeof document !== 'undefined'
                ? document.cookie
                    .split('; ')
                    .find((row) => row.startsWith('auth_token='))
                    ?.split('=')[1]
                : undefined;
            return token
              ? { ...getAuthHeaders(), Authorization: `Bearer ${token}` }
              : getAuthHeaders();
          },
          fetch(url, options) {
            return fetch(url, { ...options, credentials: 'include' });
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // key forces full remount of the tRPC client when auth state changes
  return (
    <TRPCClientProvider key={user?.id ?? 'anonymous'}>
      {children}
    </TRPCClientProvider>
  );
}
