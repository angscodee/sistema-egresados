/**
 * Lightweight Redis cache helper using ioredis.
 * Used for caching expensive dashboard queries.
 */
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

const logger = new Logger('RedisCache');

let _client: Redis | null = null;

function getClient(): Redis | null {
  if (_client) return _client;
  try {
    if (process.env.REDIS_URL?.trim()) {
      const url = process.env.REDIS_URL.trim();
      const tls = url.startsWith('rediss://');
      _client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        tls: tls ? {} : undefined,
      });
    } else {
      _client = new Redis({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });
    }
    _client.on('error', (err: Error) => {
      logger.warn(`Redis cache error: ${err.message}`);
    });
    return _client;
  } catch {
    return null;
  }
}

/**
 * Get a cached value. Returns null on miss or Redis error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getClient();
    if (!client) return null;
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with TTL in seconds. Silently ignores Redis errors.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const client = getClient();
    if (!client) return;
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // non-fatal
  }
}

/**
 * Delete a cache key. Silently ignores errors.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getClient();
    if (!client) return;
    await client.del(key);
  } catch {
    // non-fatal
  }
}
