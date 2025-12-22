import { SetMetadata } from '@nestjs/common';

export const REQUIRE_INTERVIEW_ACCESS_KEY = 'requireInterviewAccess';
export const RequireInterviewAccess = () =>
  SetMetadata(REQUIRE_INTERVIEW_ACCESS_KEY, true);
