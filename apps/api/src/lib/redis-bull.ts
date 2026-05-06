import Redis from 'ioredis';

export function createBullConnection(): Redis {
  const url = process.env.REDIS_URL?.trim();

  if (url) {
    // rediss:// (TLS) — required for Upstash and other managed Redis providers
    const tls = url.startsWith('rediss://');
    return new Redis(url, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
      tls: tls ? {} : undefined,
    });
  }

  return new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
}
