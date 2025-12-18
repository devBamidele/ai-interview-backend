import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { LivekitTokenResponse } from '../common/interfaces/livekit.interface';
import { LoggerService } from '../common/logger/logger.service';
import { CreateTokenDto } from '../common/dto';

@Injectable()
export class LivekitService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly url: string;
  private readonly roomClient: RoomServiceClient;
  private readonly sessionTimers: Map<string, NodeJS.Timeout>;

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
    this.roomClient = new RoomServiceClient(url, apiKey, apiSecret);
    this.sessionTimers = new Map<string, NodeJS.Timeout>();
  }

  async createToken(
    createTokenDto: CreateTokenDto,
  ): Promise<LivekitTokenResponse> {
    const { roomName, participantName } = createTokenDto;

    this.logger.log(
      `Creating token for room: ${roomName}, participant: ${participantName}`,
    );

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      ttl: '5m',
    });

    at.addGrant({ roomJoin: true, room: roomName });
    const token = await at.toJwt();

    // Start 5-minute session timer for market sizing interview
    this.startSessionTimer(roomName, 300000); // 5 minutes

    this.logger.log(
      `Token created successfully for participant: ${participantName}`,
    );
    return { token, url: this.url };
  }

  /**
   * Delete a LiveKit room and disconnect all participants
   * @param roomName The name of the room to delete
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.roomClient.deleteRoom(roomName);
      this.logger.log(`Room deleted successfully: ${roomName}`);

      // Clear any existing timer for this room
      this.clearSessionTimer(roomName);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete room: ${roomName}`, errorMessage);
      throw new InternalServerErrorException(
        `Failed to delete room: ${errorMessage}`,
      );
    }
  }

  /**
   * Start a session timer that automatically deletes the room after specified duration
   * @param roomName The name of the room
   * @param durationMs Duration in milliseconds (default: 5 minutes)
   */
  startSessionTimer(roomName: string, durationMs: number = 300000): void {
    // Clear any existing timer for this room
    this.clearSessionTimer(roomName);

    this.logger.log(
      `Starting session timer for room: ${roomName} (${durationMs / 1000}s)`,
    );

    const timeout = setTimeout(() => {
      this.logger.log(
        `Session timeout reached for room: ${roomName}. Deleting room...`,
      );
      this.deleteRoom(roomName).catch((error) => {
        this.logger.error(
          `Failed to delete room on timeout: ${roomName}`,
          JSON.stringify(error),
        );
      });
    }, durationMs);

    this.sessionTimers.set(roomName, timeout);
  }

  /**
   * Clear the session timer for a specific room
   * @param roomName The name of the room
   */
  clearSessionTimer(roomName: string): void {
    const existingTimer = this.sessionTimers.get(roomName);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.sessionTimers.delete(roomName);
      this.logger.log(`Cleared session timer for room: ${roomName}`);
    }
  }
}
