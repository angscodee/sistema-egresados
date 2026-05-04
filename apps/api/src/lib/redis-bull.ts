import Redis from 'ioredis';

export function createBullConnection(): Redis {
  if (process.env.REDIS_URL?.trim()) {
    return new Redis(process.env.REDIS_URL.trim(), { maxRetriesPerRequest: null });
  }

  return new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });
}
