import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new authenticated account' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully. Returns access & refresh tokens.',
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async signup(@Body() dto: SignupDto) {
    return await this.authService.signup(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login to authenticated account' })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access & refresh tokens.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description:
      'Tokens refreshed successfully. Returns new access & refresh tokens.',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout from current or all devices',
    description:
      'Provide refreshToken to logout from specific device, or omit to logout from all devices',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser() user: UserDoc, @Body() dto: LogoutDto) {
    const userId = String(user._id);
    await this.authService.logout(userId, dto.refreshToken);
    return { message: 'Logout successful' };
  }

  @Post('upgrade/:participantIdentity')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upgrade anonymous account to authenticated',
    description:
      'Converts an anonymous user to authenticated user and links all their interviews',
  })
  @ApiResponse({
    status: 200,
    description:
      'Account upgraded successfully. Returns access & refresh tokens.',
  })
  @ApiResponse({ status: 404, description: 'Anonymous user not found' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async upgradeAccount(
    @Param('participantIdentity') participantIdentity: string,
    @Body() dto: UpgradeAccountDto,
  ) {
    return await this.authService.upgradeAccount(participantIdentity, dto);
  }
}
