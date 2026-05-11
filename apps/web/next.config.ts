import type { NextConfig } from 'next';
import * as path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@egresados/shared'],
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // In production builds (Vercel/Docker) the API types are not available.
  // Type safety is enforced locally via tsconfig paths.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // Point ALL imports from @egresados/api to a zero-dependency stub.
    // The stub exports `AppRouter` as `any` — type safety is preserved
    // locally via tsconfig paths, but webpack never bundles NestJS/Prisma.
    const stub = path.resolve(__dirname, '../api/src/trpc/app-router.type.ts');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@egresados/api/trpc/types': stub,
      '@egresados/api/trpc': stub,
      // Catch any direct import of the api package
      '@egresados/api': stub,
    };
    return config;
  },
};

export default nextConfig;
