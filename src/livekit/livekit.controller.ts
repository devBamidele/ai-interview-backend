import { Controller, Post, Body } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { CreateTokenDto } from '../common/dto/livekit.dto';
import { LivekitTokenResponse } from '../common/interfaces/livekit.interface';

@Controller('livekit')
export class LivekitController {
  constructor(private readonly livekitService: LivekitService) {}

  @Post('token')
  async createToken(
    @Body() body: CreateTokenDto,
  ): Promise<LivekitTokenResponse> {
    return await this.livekitService.createToken(body);
  }
}
