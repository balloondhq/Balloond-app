import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis.Redis;
  private isConnected = false;
  
  // Cache TTL configurations (in seconds)
  private readonly TTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    DAILY: 86400, // 24 hours
    WEEKLY: 604800, // 7 days
  };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      this.redisClient = new Redis.Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 0),
        retryStrategy: (times: number) => {
          if (times > 10) {
            console.error('Redis connection failed after 10 retries');
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          return targetErrors.some(e => err.message.includes(e));
        },
      });

      this.redisClient.on('connect', () => {
        console.log('Redis client connected');
        this.isConnected = true;
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('close', () => {
        console.log('Redis connection closed');
        this.isConnected = false;
      });

      // Test connection
      await this.redisClient.ping();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      // Fallback to in-memory cache if Redis is not available
      this.setupInMemoryFallback();
    }
  }

  private async disconnect() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  private setupInMemoryFallback() {
    // Simple in-memory cache as fallback
    const memoryCache = new Map<string, { value: any; expiry: number }>();
    
    this.redisClient = {
      get: async (key: string) => {
        const item = memoryCache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
          memoryCache.delete(key);
          return null;
        }
        return JSON.stringify(item.value);
      },
      set: async (key: string, value: string, mode?: string, ttl?: number) => {
        const expiry = Date.now() + (ttl || this.TTL.MEDIUM) * 1000;
        memoryCache.set(key, { value: JSON.parse(value), expiry });
        return 'OK';
      },
      del: async (key: string) => {
        memoryCache.delete(key);
        return 1;
      },
      keys: async (pattern: string) => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return Array.from(memoryCache.keys()).filter(k => regex.test(k));
      },
      flushall: async () => {
        memoryCache.clear();
        return 'OK';
      },
    } as any;
  }

  // Generate cache key
  private generateKey(namespace: string, params: any): string {
    const hash = createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
    return `balloond:${namespace}:${hash}`;
  }

  // Basic cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const result = await this.redisClient.set(
        key,
        serialized,
        'EX',
        ttl || this.TTL.MEDIUM
      );
      return result === 'OK';
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length === 0) return 0;
      
      const pipeline = this.redisClient.pipeline();
      keys.forEach(key => pipeline.del(key));
      const results = await pipeline.exec();
      return results ? results.length : 0;
    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  async flush(): Promise<boolean> {
    try {
      const result = await this.redisClient.flushall();
      return result === 'OK';
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Advanced caching strategies
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  // User-specific caching
  async getUserCache<T>(userId: string, key: string): Promise<T | null> {
    const cacheKey = this.generateKey(`user:${userId}`, { key });
    return this.get<T>(cacheKey);
  }

  async setUserCache(
    userId: string,
    key: string,
    value: any,
    ttl?: number
  ): Promise<boolean> {
    const cacheKey = this.generateKey(`user:${userId}`, { key });
    return this.set(cacheKey, value, ttl);
  }

  async invalidateUserCache(userId: string): Promise<number> {
    return this.deletePattern(`balloond:user:${userId}:*`);
  }

  // Match queue caching
  async getMatchQueue(userId: string): Promise<any[]> {
    const key = `match:queue:${userId}`;
    const queue = await this.get<any[]>(key);
    return queue || [];
  }

  async setMatchQueue(
    userId: string,
    queue: any[],
    ttl = this.TTL.LONG
  ): Promise<boolean> {
    const key = `match:queue:${userId}`;
    return this.set(key, queue, ttl);
  }

  // Session caching
  async getSession(sessionId: string): Promise<any> {
    const key = `session:${sessionId}`;
    return this.get(key);
  }

  async setSession(
    sessionId: string,
    data: any,
    ttl = this.TTL.DAILY
  ): Promise<boolean> {
    const key = `session:${sessionId}`;
    return this.set(key, data, ttl);
  }

  // Rate limiting
  async checkRateLimit(
    identifier: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - window * 1000;

    try {
      // Get current count
      const data = await this.get<{ count: number; resetAt: number }>(key);
      
      if (!data || data.resetAt < now) {
        // New window
        const resetAt = now + window * 1000;
        await this.set(key, { count: 1, resetAt }, window);
        return { allowed: true, remaining: limit - 1, resetAt };
      }

      if (data.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: data.resetAt };
      }

      // Increment count
      data.count++;
      await this.set(key, data, Math.ceil((data.resetAt - now) / 1000));
      return { allowed: true, remaining: limit - data.count, resetAt: data.resetAt };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit, resetAt: now + window * 1000 };
    }
  }

  // Leaderboard caching
  async getLeaderboard(type: string, limit = 10): Promise<any[]> {
    const key = `leaderboard:${type}`;
    return (await this.get<any[]>(key)) || [];
  }

  async updateLeaderboard(
    type: string,
    data: any[],
    ttl = this.TTL.LONG
  ): Promise<boolean> {
    const key = `leaderboard:${type}`;
    return this.set(key, data, ttl);
  }

  // Analytics caching
  async incrementCounter(key: string, ttl = this.TTL.DAILY): Promise<number> {
    try {
      const current = await this.get<number>(key) || 0;
      const newValue = current + 1;
      await this.set(key, newValue, ttl);
      return newValue;
    } catch (error) {
      console.error('Counter increment error:', error);
      return 0;
    }
  }

  // Cache warming
  async warmCache(keys: { key: string; factory: () => Promise<any>; ttl?: number }[]) {
    const promises = keys.map(async ({ key, factory, ttl }) => {
      try {
        const value = await factory();
        await this.set(key, value, ttl);
      } catch (error) {
        console.error(`Cache warming failed for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  // Cache statistics
  async getStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsage: string;
  }> {
    try {
      if (!this.isConnected) {
        return { connected: false, keyCount: 0, memoryUsage: 'N/A' };
      }

      const info = await this.redisClient.info('memory');
      const keys = await this.redisClient.keys('balloond:*');
      
      const memoryMatch = info.match(/used_memory_human:(.*?)\r?\n/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        connected: true,
        keyCount: keys.length,
        memoryUsage,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { connected: false, keyCount: 0, memoryUsage: 'Error' };
    }
  }
}

export default CacheService;
