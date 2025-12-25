import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LivekitService } from './livekit.service';
import { LivekitController } from './livekit.controller';
import { AuthContextService } from 'src/auth/auth-context.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('TRANSCRIPTION_JWT_SECRET'),
        signOptions: {
          expiresIn: '2h',
          issuer:
            configService.get<string>('TRANSCRIPTION_JWT_ISSUER') ||
            'interview-backend',
          audience:
            configService.get<string>('TRANSCRIPTION_JWT_AUDIENCE') ||
            'transcription-service',
        },
      }),
    }),
  ],
  controllers: [LivekitController],
  providers: [LivekitService, AuthContextService],
})
export class LivekitModule {}
