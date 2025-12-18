import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserDoc } from '../../schemas/user.schema';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = UserDoc | null>(
    user: TUser,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    return user;
  }
}
