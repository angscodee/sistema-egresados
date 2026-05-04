import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@egresados/api/trpc/types';

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcUrl() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return `${api}/trpc`;
}

/**
 * Auth headers for tRPC requests.
 * The HttpOnly cookie `auth_token` is sent automatically via `credentials: 'include'`
 * in the TRPCProvider fetch config, so no Authorization header is needed.
 * This function is kept for backward compatibility with any direct fetch calls.
 */
export function getAuthHeaders(): Record<string, string> {
  return {};
}
