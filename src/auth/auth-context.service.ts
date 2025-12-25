import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { UserDoc } from '../schemas/user.schema';

interface AuthenticatedRequest extends Request {
  user: UserDoc;
}

@Injectable({ scope: Scope.REQUEST })
export class AuthContextService {
  constructor(
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  getCurrentUser(): UserDoc {
    return this.request.user;
  }

  getCurrentUserId(): string {
    return String(this.request.user._id);
  }
}
