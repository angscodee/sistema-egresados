'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { getAuthHeaders, getTrpcUrl, trpc } from './client';

// QueryClient is shared and stable across re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getTrpcUrl(),
          headers() {
            // Read the auth_token cookie at request time (not at init time)
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
            return fetch(url, {
              ...options,
              credentials: 'include',
            });
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
