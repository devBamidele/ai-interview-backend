import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LivekitService } from './livekit.service';
import { CreateTokenDto } from '../common/dto/livekit.dto';
import { LivekitTokenResponse } from '../common/interfaces/livekit.interface';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('livekit')
@Controller('livekit')
export class LivekitController {
  constructor(private readonly livekitService: LivekitService) {}

  @Post('token')
  @Public()
  @ApiOperation({ summary: 'Create LiveKit access token' })
  async createToken(
    @Body() body: CreateTokenDto,
  ): Promise<LivekitTokenResponse> {
    return await this.livekitService.createToken(body);
  }
}
