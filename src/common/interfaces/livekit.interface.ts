import { ApiProperty } from '@nestjs/swagger';

export class LivekitTokenResponse {
  @ApiProperty({
    description: 'LiveKit access token for audio/video connection',
  })
  livekitToken: string;

  @ApiProperty({ description: 'JWT token for transcription service WebSocket' })
  transcriptionToken: string;

  @ApiProperty({ description: 'LiveKit server URL' })
  url: string;

  @ApiProperty({ description: 'Generated room name' })
  roomName: string;

  @ApiProperty({ description: 'Participant identity' })
  participantIdentity: string;
}
