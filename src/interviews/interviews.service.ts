import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Interview, InterviewDocument } from '../schemas/interview.schema';
import { AIService } from '../ai/ai.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  AnalyzeInterviewResponse,
  GetInterviewResponse,
} from '../common/interfaces/interview.interface';
import { AnalyzeInterviewDto } from 'src/common/dto';
import { logError } from 'src/common/utils/error-logger.util';
import { SessionData } from 'src/common/interfaces';

@Injectable()
export class InterviewsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Interview.name)
    private interviewModel: Model<InterviewDocument>,
    private aiService: AIService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(InterviewsService.name);
  }

  async analyzeInterview(
    dto: AnalyzeInterviewDto,
  ): Promise<AnalyzeInterviewResponse> {
    this.logger.log(`Analyzing interview for room: ${dto.roomName}`);

    // Find or create user
    let user = await this.userModel.findOne({
      participantIdentity: dto.participantIdentity,
    });

    if (!user) {
      this.logger.log(
        `Creating new user for participant: ${dto.participantIdentity}`,
      );
      user = await this.userModel.create({
        email: `${dto.participantIdentity}@temp.com`,
        name: dto.participantIdentity,
        participantIdentity: dto.participantIdentity,
      });
    }

    // Create interview record with processing status
    const interview = await this.interviewModel.create({
      userId: user._id,
      roomName: dto.roomName,
      participantIdentity: dto.participantIdentity,
      duration: dto.sessionData.duration,
      transcript: dto.sessionData.transcript,
      totalWords: dto.sessionData.totalWords,
      averagePace: dto.sessionData.averagePace,
      paceTimeline: dto.sessionData.paceTimeline,
      fillers: dto.sessionData.fillers,
      pauses: dto.sessionData.pauses,
      words: dto.sessionData.words || [],
      transcriptSegments: dto.sessionData.transcriptSegments || [],
      status: 'processing',
    });

    const interviewId = (interview._id as Types.ObjectId).toString();
    this.logger.log(`Interview record created with ID: ${interviewId}`);

    // Process AI analysis in the background
    void this.processAIAnalysisAsync(interview, dto.sessionData);

    return {
      interviewId,
      status: 'processing',
      message: 'Interview saved. Analysis in progress...',
    };
  }

  // 🔥 NEW: Async background processing
  private async processAIAnalysisAsync(
    interview: InterviewDocument,
    sessionData: SessionData,
  ): Promise<void> {
    const interviewId = (interview._id as Types.ObjectId).toString();

    try {
      this.logger.log(`Starting AI analysis for interview ${interviewId}`);

      const aiAnalysis = await this.aiService.analyzeInterview(sessionData);

      // Update interview with AI analysis
      interview.aiAnalysis = aiAnalysis;
      interview.status = 'completed';
      interview.processedAt = new Date();
      await interview.save();

      this.logger.log(
        `Interview analysis completed successfully for ID: ${interviewId}`,
      );
    } catch (error: any) {
      logError(
        this.logger,
        `AI analysis failed for interview ${interviewId}`,
        error,
      );

      interview.status = 'failed';

      await interview.save();
    }
  }

  async getInterview(interviewId: string): Promise<GetInterviewResponse> {
    this.logger.log(`Fetching interview with ID: ${interviewId}`);

    const interview = await this.interviewModel
      .findById(interviewId)
      .populate('userId', 'email name')
      .exec();

    if (!interview) {
      throw new NotFoundException(`Interview with ID ${interviewId} not found`);
    }

    const id = (interview._id as Types.ObjectId).toString();

    return {
      id,
      userId: interview.userId,
      createdAt: interview.createdAt,
      duration: interview.duration,
      transcript: interview.transcript,
      recordingUrl: interview.recordingUrl,
      metrics: {
        averagePace: interview.averagePace,
        totalWords: interview.totalWords,
        fillerCount: interview.fillers.length,
        pauseCount: interview.pauses.length,
        paceTimeline: interview.paceTimeline,
      },
      aiAnalysis: interview.aiAnalysis,
      status: interview.status,
    };
  }
}
