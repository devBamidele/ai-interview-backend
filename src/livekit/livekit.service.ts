import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import { LivekitTokenResponse } from '../common/interfaces/livekit.interface';
import { LoggerService } from '../common/logger/logger.service';
import { CreateTokenDto } from 'src/common/dto';
import { logError } from 'src/common/utils/error-logger.util';

@Injectable()
export class LivekitService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly url: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(LivekitService.name);

    const apiKey = this.configService.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET');
    const url = this.configService.get<string>('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !url) {
      throw new InternalServerErrorException(
        'LiveKit configuration is missing',
      );
    }

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.url = url;
  }

  async createToken(
    createTokenDto: CreateTokenDto,
  ): Promise<LivekitTokenResponse> {
    const { roomName, participantName } = createTokenDto;

    this.logger.log(
      `Creating token for room: ${roomName}, participant: ${participantName}`,
    );

    try {
      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: participantName,
        ttl: '10m',
      });

      at.addGrant({ roomJoin: true, room: roomName });
      const token = await at.toJwt();

      this.logger.log(
        `Token created successfully for participant: ${participantName}`,
      );
      return { token, url: this.url };
    } catch (error) {
      logError(this.logger, `Failed to create token: `, error);

      throw new InternalServerErrorException('Failed to create LiveKit token');
    }
  }
}
