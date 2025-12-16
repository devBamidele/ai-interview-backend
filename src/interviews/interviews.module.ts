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
import { LivekitService } from 'src/livekit/livekit.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Interview.name, schema: InterviewSchema },
      { name: CaseQuestion.name, schema: CaseQuestionSchema },
    ]),
    AIModule,
    LivekitModule,
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService, LivekitService],
})
export class InterviewsModule {}
