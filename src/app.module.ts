import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LivekitModule } from './livekit/livekit.module';
import { InterviewsModule } from './interviews/interviews.module';
import { AIModule } from './ai/ai.module';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: 'development.env',
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    LoggerModule,
    LivekitModule,
    InterviewsModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
