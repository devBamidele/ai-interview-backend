import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import type { UserDoc } from '../schemas/user.schema';
import {
  SignupDto,
  LoginDto,
  RefreshTokenDto,
  UpgradeAccountDto,
  LogoutDto,
} from '../common/dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'Create new authenticated account' })
  async signup(@Body() dto: SignupDto) {
    return await this.authService.signup(dto);
  }

  @Post('login')
  @Public()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from current or all devices' })
  async logout(@CurrentUser() user: UserDoc, @Body() dto: LogoutDto) {
    const userId = String(user._id);
    await this.authService.logout(userId, dto.refreshToken);
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
}
