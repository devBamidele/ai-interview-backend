import { ApiProperty } from '@nestjs/swagger';

export class LivekitTokenResponse {
  @ApiProperty()
  token: string;

  @ApiProperty()
  url: string;
}
