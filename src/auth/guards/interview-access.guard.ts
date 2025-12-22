import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { REQUIRE_INTERVIEW_ACCESS_KEY } from '../decorators/interview-access.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Interview, InterviewDoc } from '../../schemas/interview.schema';
import { isValidAccessToken } from '../../common/utils/token.util';

@Injectable()
export class InterviewAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Interview.name) private interviewModel: Model<InterviewDoc>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check if endpoint requires interview access
    const requiresAccess = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_INTERVIEW_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If public and doesn't require interview access, allow
    if (isPublic && !requiresAccess) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.extractTokenFromHeader(request);

    if (!accessToken) {
      throw new UnauthorizedException(
        'Access token required. Please provide x-interview-token header.',
      );
    }

    // Validate token format
    if (!isValidAccessToken(accessToken)) {
      throw new UnauthorizedException('Invalid access token format');
    }

    // Verify token exists in database
    const interview = await this.interviewModel
      .findOne({ accessToken })
      .select('_id participantIdentity')
      .exec();

    if (!interview) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // Attach interview info to request for later use
    (request as any).interviewAccess = {
      interviewId: String(interview._id),
      participantIdentity: interview.participantIdentity,
    };

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const token = request.headers['x-interview-token'] as string;
    return token;
  }
}
