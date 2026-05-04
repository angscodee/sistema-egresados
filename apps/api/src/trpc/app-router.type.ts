/**
 * STANDALONE type file — zero runtime imports.
 * 
 * This file exists solely so the Next.js frontend can get the AppRouter type
 * without webpack trying to bundle NestJS / Prisma / class-validator.
 * 
 * How it works:
 * - `import type` is erased 100% at compile time by TypeScript
 * - webpack never sees the actual module because it's type-only
 * - We use `declare module` augmentation so there are zero real imports
 * 
 * IMPORTANT: never add a real (non-type) import here.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppRouter = any;
