/**
 * Type-only re-export of AppRouter for use in the frontend.
 * This file must NOT import any NestJS or Prisma runtime code.
 * It only exports the type, which is erased at compile time.
 */
export type { AppRouter } from './routers/index';
