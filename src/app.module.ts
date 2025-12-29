import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LivekitModule } from './livekit/livekit.module';
import { InterviewsModule } from './interviews/interviews.module';
import { AIModule } from './ai/ai.module';
import { LoggerModule } from './common/logger/logger.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { HealthModule } from './health/health.module';
import {
  getEnvFilePath,
  validateEnvironment,
} from './config/environment.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getEnvFilePath(),
      isGlobal: true,
      validate: validateEnvironment,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute (global default)
      },
    ]),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        // Connection pool settings optimized for serverless (Cloud Run)
        minPoolSize: 1, // Minimize idle connections
        maxPoolSize: 10, // Limit per instance
        socketTimeoutMS: 45000, // Cloud Run timeout is 60s
        serverSelectionTimeoutMS: 5000,
        // Auto-reconnect
        retryWrites: true,
        retryReads: true,
      }),
    }),
    LoggerModule,
    RedisModule,
    AuthModule,
    HealthModule,
    LivekitModule,
    InterviewsModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Global rate limiting
    },
  ],
})
export class AppModule {}
