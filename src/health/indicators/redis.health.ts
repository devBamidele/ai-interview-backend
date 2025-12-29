import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redisService: RedisService,
    private readonly health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Ping Redis to check connectivity
      const isConnected = await this.redisService.ping();

      if (!isConnected) {
        throw new Error('Redis ping failed');
      }

      const responseTime = Date.now() - startTime;

      return this.health.check(key).up({
        status: 'up',
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return this.health.check(key).down({
        status: 'down',
        message: errorMessage,
      });
    }
  }
}
