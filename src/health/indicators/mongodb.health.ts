import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongoDBHealthIndicator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    const readyState = Number(this.connection.readyState);

    try {
      // Check if MongoDB is connected
      if (readyState !== 1 || !this.connection.db) {
        throw new Error('MongoDB is not connected');
      }

      // Perform a simple ping operation
      await this.connection.db.admin().ping();

      const responseTime = Date.now() - startTime;

      return this.health.check(key).up({
        status: 'up',
        responseTime: `${responseTime}ms`,
        state: this.getConnectionState(readyState),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return this.health.check(key).down({
        status: 'down',
        message: errorMessage,
        state: this.getConnectionState(readyState),
      });
    }
  }

  private getConnectionState(state: number): string {
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[state] ?? 'unknown';
  }
}
