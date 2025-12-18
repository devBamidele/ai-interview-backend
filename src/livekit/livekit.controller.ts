import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LivekitService } from './livekit.service';
import { CreateTokenDto } from '../common/dto/livekit.dto';
import { LivekitTokenResponse } from '../common/interfaces/livekit.interface';

@ApiTags('livekit')
@Controller('livekit')
export class LivekitController {
  constructor(private readonly livekitService: LivekitService) {}

  @Post('token')
  @ApiOperation({ summary: 'Create LiveKit access token' })
  @ApiResponse({ status: 201, type: LivekitTokenResponse })
  async createToken(
    @Body() body: CreateTokenDto,
  ): Promise<LivekitTokenResponse> {
    return await this.livekitService.createToken(body);
  }
}
