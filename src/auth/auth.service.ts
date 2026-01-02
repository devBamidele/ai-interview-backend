import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserDoc, UserType } from '../schemas/user.schema';
import { Interview, InterviewDoc } from '../schemas/interview.schema';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../common/logger/logger.service';
import { AuthContextService } from './auth-context.service';
import {
  SignupDto,
  LoginDto,
  RefreshTokenDto,
  UpgradeAccountDto,
  UserResponse,
} from '../common/dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { StringValue } from 'ms';
import { JwtSignOptions } from '@nestjs/jwt';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDoc>,
    @InjectModel(Interview.name) private interviewModel: Model<InterviewDoc>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private authContext: AuthContextService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async signup(dto: SignupDto): Promise<TokenPair & { user: any }> {
    this.logger.log(`Signup attempt for email: ${dto.email}`);

    const existingUser = await this.userModel.findOne({
      email: dto.email,
      userType: UserType.AUTHENTICATED,
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.userModel.create({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
      userType: UserType.AUTHENTICATED,
      lastLoginAt: new Date(),
      metadata: { hasGrantedInterviewConsent: false },
    });

    this.logger.log(`User created successfully: ${String(user._id)}`);

    const tokens = await this.generateTokenPair(user);

    return {
      ...tokens,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        userType: user.userType,
        createdAt: user.createdAt,
        metadata: user.metadata || { hasGrantedInterviewConsent: false },
      },
    };
  }

  async login(dto: LoginDto): Promise<TokenPair & { user: any }> {
    this.logger.log(`Login attempt for email: ${dto.email}`);

    const user = await this.userModel
      .findOne({
        email: dto.email,
        userType: UserType.AUTHENTICATED,
      })
      .select('+password');

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await user.save();

    this.logger.log(`Login successful for user: ${String(user._id)}`);

    const tokens = await this.generateTokenPair(user);

    return {
      ...tokens,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        userType: user.userType,
        createdAt: user.createdAt,
        metadata: user.metadata || { hasGrantedInterviewConsent: false },
      },
    };
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<TokenPair> {
    try {
      const payload: JwtPayload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const isValid = await this.redisService.validateRefreshToken(
        payload.userId,
        dto.refreshToken,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.userModel.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      await this.redisService.removeRefreshToken(
        payload.userId,
        dto.refreshToken,
      );

      return await this.generateTokenPair(user);
    } catch (error) {
      this.logger.error(
        'Refresh token validation failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken?: string): Promise<void> {
    const user = this.authContext.getCurrentUser();
    const userId = String(user._id);
    this.logger.log(`Logout for user: ${userId}`);

    if (refreshToken) {
      await this.redisService.removeRefreshToken(userId, refreshToken);
    } else {
      await this.redisService.removeAllRefreshTokens(userId);
    }
  }

  async createAnonymousSession(
    deviceId: string,
  ): Promise<TokenPair & { user: any }> {
    this.logger.log(`Anonymous session request for deviceId: ${deviceId}`);

    let user = await this.userModel.findOne({
      participantIdentity: deviceId,
      userType: UserType.ANONYMOUS,
    });

    if (!user) {
      user = await this.userModel.create({
        participantIdentity: deviceId,
        userType: UserType.ANONYMOUS,
        name: `Guest-${deviceId.substring(0, 8)}`,
        email: `${deviceId}@anonymous.local`,
        lastLoginAt: new Date(),
        metadata: { hasGrantedInterviewConsent: false },
      });

      this.logger.log(
        `Anonymous user created: ${String(user._id)} (deviceId: ${deviceId})`,
      );
    } else {
      user.lastLoginAt = new Date();
      await user.save();

      this.logger.log(
        `Existing anonymous user session: ${String(user._id)} (deviceId: ${deviceId})`,
      );
    }

    const tokens = await this.generateTokenPair(user);

    return {
      ...tokens,
      user: {
        id: String(user._id),
        participantIdentity: user.participantIdentity,
        name: user.name,
        userType: user.userType,
        createdAt: user.createdAt,
        metadata: user.metadata || { hasGrantedInterviewConsent: false },
      },
    };
  }

  async upgradeAccount(
    participantIdentity: string,
    dto: UpgradeAccountDto,
  ): Promise<TokenPair & { user: any }> {
    this.logger.log(`Account upgrade attempt for: ${participantIdentity}`);

    const anonymousUser = await this.userModel.findOne({
      participantIdentity,
      userType: UserType.ANONYMOUS,
    });

    if (!anonymousUser) {
      throw new NotFoundException('Anonymous user not found');
    }

    const existingUser = await this.userModel.findOne({
      email: dto.email,
      userType: UserType.AUTHENTICATED,
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    anonymousUser.email = dto.email;
    anonymousUser.name = dto.name;
    anonymousUser.password = hashedPassword;
    anonymousUser.userType = UserType.AUTHENTICATED;
    anonymousUser.upgradedAt = new Date();
    anonymousUser.lastLoginAt = new Date();
    await anonymousUser.save();

    const interviewCount = await this.interviewModel.countDocuments({
      userId: anonymousUser._id,
    });

    this.logger.log(
      `Account upgraded successfully. User: ${String(anonymousUser._id)}, Linked interviews: ${interviewCount}`,
    );

    const tokens = await this.generateTokenPair(anonymousUser);

    return {
      ...tokens,
      user: {
        id: String(anonymousUser._id),
        email: anonymousUser.email,
        name: anonymousUser.name,
        userType: anonymousUser.userType,
        createdAt: anonymousUser.createdAt,
        upgradedAt: anonymousUser.upgradedAt,
        metadata: anonymousUser.metadata || {
          hasGrantedInterviewConsent: false,
        },
      },
    };
  }

  async validateUser(payload: JwtPayload): Promise<UserDoc> {
    const user = await this.userModel.findById(payload.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async updateMetadata(
    userId: string,
    metadata: { hasGrantedInterviewConsent: boolean },
  ): Promise<UserResponse> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedMetadata = {
      ...user.metadata,
      ...metadata,
    };

    user.metadata = updatedMetadata;
    await user.save();

    this.logger.log(`Metadata updated for user: ${userId}`);

    return {
      id: String(user._id),
      email: user.email,
      name: user.name,
      participantIdentity: user.participantIdentity,
      userType: user.userType,
      createdAt: user.createdAt,
      metadata: user.metadata,
    };
  }

  private async generateTokenPair(user: UserDoc): Promise<TokenPair> {
    const payload: JwtPayload = {
      userId: String(user._id),
      email: user.userType === UserType.AUTHENTICATED ? user.email : undefined,
      participantIdentity: user.participantIdentity,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload);

    const signOptions: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn:
        this.configService.get<StringValue>('JWT_REFRESH_EXPIRATION') ?? '7d',
    };

    const refreshToken = this.jwtService.sign(payload, signOptions);

    await this.redisService.addRefreshToken(
      String(user._id),
      refreshToken,
      this.REFRESH_TOKEN_EXPIRY,
    );

    return { accessToken, refreshToken };
  }
}
