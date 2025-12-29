import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MongoDBHealthIndicator } from './indicators/mongodb.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TerminusModule, RedisModule],
  controllers: [HealthController],
  providers: [MongoDBHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
