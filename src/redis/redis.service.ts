import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    // Determine if TLS should be enabled (for Upstash or production Redis)
    const enableTLS = redisUrl.startsWith('rediss://');

    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      // Enable TLS for Upstash (rediss:// protocol)
      tls: enableTLS
        ? {
            rejectUnauthorized: true, // Verify SSL certificates
          }
        : undefined,
      // Connection timeout for serverless environments
      connectTimeout: 10000, // 10 seconds
      // Keep connections alive
      keepAlive: 30000, // 30 seconds
      // Connection pool settings for Cloud Run
      lazyConnect: false, // Connect immediately
    });

    this.client.on('connect', () => {
      this.logger.log(
        `Redis connected successfully (TLS: ${enableTLS ? 'enabled' : 'disabled'})`,
      );
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis reconnecting...');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async addRefreshToken(
    userId: string,
    token: string,
    expiresInSeconds: number,
  ): Promise<void> {
    const key = `refresh_tokens:${userId}`;
    const score = Date.now() + expiresInSeconds * 1000;
    await this.client.zadd(key, score, token);
    await this.client.expire(key, expiresInSeconds);
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const key = `refresh_tokens:${userId}`;
    const score = await this.client.zscore(key, token);
    return score !== null && Number(score) > Date.now();
  }

  async removeRefreshToken(userId: string, token: string): Promise<void> {
    const key = `refresh_tokens:${userId}`;
    await this.client.zrem(key, token);
  }

  async removeAllRefreshTokens(userId: string): Promise<void> {
    const key = `refresh_tokens:${userId}`;
    await this.client.del(key);
  }

  /**
   * Health check for Redis connection
   * Returns true if Redis is responsive
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed:', error);
      return false;
    }
  }

  /**
   * Get Redis client for advanced operations
   * Use with caution - prefer using service methods
   */
  getClient(): Redis {
    return this.client;
  }
}
