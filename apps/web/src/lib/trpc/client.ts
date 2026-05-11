import { createTRPCReact } from '@trpc/react-query';
import type { AnyRouter } from '@trpc/server';

// This import is resolved by webpack alias to a zero-dep stub in production.
// Locally (dev) it resolves to the real AppRouter via tsconfig paths.
// Using AnyRouter as fallback to preserve tRPC utility methods in production.
type AppRouter = AnyRouter;

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcUrl() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return `${api}/trpc`;
}

export function getAuthHeaders(): Record<string, string> {
  return {};
}
