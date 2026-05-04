import type { NextConfig } from 'next';
import * as path from 'path';

const nextConfig: NextConfig = {
  // Only transpile the shared types package, NOT the full API
  // The API types are imported as 'type-only' so they don't need runtime transpilation
  transpilePackages: ['@egresados/shared'],
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
