import type { NextConfig } from 'next';
import * as path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@egresados/api', '@egresados/shared'],
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
