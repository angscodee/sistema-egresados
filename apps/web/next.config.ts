import type { NextConfig } from 'next';
import * as path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@egresados/shared'],
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  webpack: (config, { isServer }) => {
    // Prevent webpack from bundling API-only packages that contain
    // NestJS / Prisma decorators — these are type-only imports erased by TS
    config.resolve.alias = {
      ...config.resolve.alias,
      // Redirect the API trpc types import to our standalone types file
      '@egresados/api/trpc/types': path.resolve(
        __dirname,
        '../api/src/trpc/router.types.ts',
      ),
      '@egresados/api/trpc': path.resolve(
        __dirname,
        '../api/src/trpc/router.types.ts',
      ),
    };

    // Exclude NestJS and Prisma from the client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default nextConfig;
