import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { LoggerService } from '../../common/logger/logger.service';

@Injectable()
export class TranscriptionServiceGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext(TranscriptionServiceGuard.name);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      this.logger.warn(
        'Missing authorization header from transcription service',
      );
      throw new UnauthorizedException('Missing authorization header');
    }

    const expectedKey = this.configService.get<string>(
      'TRANSCRIPTION_SERVICE_API_KEY',
    );

    if (!expectedKey) {
      this.logger.error(
        'TRANSCRIPTION_SERVICE_API_KEY not configured in environment',
      );
      throw new UnauthorizedException('Service authentication not configured');
    }

    const providedKey = authHeader.replace('Bearer ', '');

    if (providedKey !== expectedKey) {
      this.logger.warn(
        `Invalid service API key attempt from IP: ${request.ip || 'unknown'}`,
      );
      throw new UnauthorizedException('Invalid service API key');
    }

    this.logger.log('Transcription service authenticated successfully');
    return true;
  }
}
