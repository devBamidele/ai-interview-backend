import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';
import { MongoDBHealthIndicator } from './indicators/mongodb.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@ApiTags('health')
@Controller('health')
@Public() // Health checks should be accessible without authentication
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongodbHealth: MongoDBHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Comprehensive health check',
    description:
      'Checks health of all dependencies (MongoDB, Redis). Returns 200 if all are healthy, 503 otherwise.',
  })
  @ApiResponse({ status: 200, description: 'All dependencies are healthy' })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies are unhealthy',
  })
  check() {
    return this.health.check([
      () => this.mongodbHealth.isHealthy('mongodb'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }

  @Get('liveness')
  @ApiOperation({
    summary: 'Kubernetes liveness probe',
    description:
      'Always returns 200 unless the application has crashed. Used by Cloud Run to determine if container should be restarted.',
  })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Kubernetes readiness probe',
    description:
      'Returns 200 only when application is ready to serve traffic (all dependencies healthy). Used by Cloud Run to route traffic.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to serve traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready (dependencies unhealthy)',
  })
  readiness() {
    return this.health.check([
      () => this.mongodbHealth.isHealthy('mongodb'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }

  @Get('startup')
  @HealthCheck()
  @ApiOperation({
    summary: 'Kubernetes startup probe',
    description:
      'Used during container startup to verify application has started successfully. Gives more time than readiness probe.',
  })
  @ApiResponse({ status: 200, description: 'Application has started' })
  @ApiResponse({
    status: 503,
    description: 'Application is still starting or failed to start',
  })
  startup() {
    return this.health.check([
      () => this.mongodbHealth.isHealthy('mongodb'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }
}
