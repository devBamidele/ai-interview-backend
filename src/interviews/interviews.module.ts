import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { User, UserSchema } from '../schemas/user.schema';
import { Interview, InterviewSchema } from '../schemas/interview.schema';
import {
  CaseQuestion,
  CaseQuestionSchema,
} from '../schemas/case-question.schema';
import { AIModule } from '../ai/ai.module';
import { LivekitModule } from '../livekit/livekit.module';
import { LivekitService } from '../livekit/livekit.service';
import { LoggerModule } from '../common/logger/logger.module';
import { JwtService } from '@nestjs/jwt';
import { AuthContextService } from 'src/auth/auth-context.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Interview.name, schema: InterviewSchema },
      { name: CaseQuestion.name, schema: CaseQuestionSchema },
    ]),
    AIModule,
    LivekitModule,
    LoggerModule,
  ],
  controllers: [InterviewsController],
  providers: [
    InterviewsService,
    LivekitService,
    JwtService,
    AuthContextService,
  ],
})
export class InterviewsModule {}
