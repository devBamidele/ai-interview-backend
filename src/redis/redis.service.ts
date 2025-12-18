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

    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
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
}
