import { Controller, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { UserDoc } from '../schemas/user.schema';
import {
  SignupDto,
  LoginDto,
  RefreshTokenDto,
  UpgradeAccountDto,
  LogoutDto,
  AnonymousSessionDto,
  UpdateMetadataDto,
} from '../common/dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('anonymous-session')
  @Public()
  @ApiOperation({ summary: 'Create or retrieve anonymous session' })
  async createAnonymousSession(@Body() dto: AnonymousSessionDto) {
    return await this.authService.createAnonymousSession(dto.deviceId);
  }

  @Post('signup')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Create new authenticated account' })
  async signup(@Body() dto: SignupDto) {
    return await this.authService.signup(dto);
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Login to authenticated account' })
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from current or all devices' })
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Logout successful' };
  }

  @Post('upgrade/:participantIdentity')
  @Public()
  @ApiOperation({ summary: 'Upgrade anonymous account to authenticated' })
  async upgradeAccount(
    @Param('participantIdentity') participantIdentity: string,
    @Body() dto: UpgradeAccountDto,
  ) {
    return await this.authService.upgradeAccount(participantIdentity, dto);
  }

  @Patch('metadata')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user metadata (consent tracking)' })
  async updateMetadata(
    @CurrentUser() user: UserDoc,
    @Body() dto: UpdateMetadataDto,
  ) {
    const userId = String(user._id);
    const updatedUser = await this.authService.updateMetadata(
      userId,
      dto.metadata,
    );

    return {
      success: true,
      user: updatedUser,
    };
  }
}
