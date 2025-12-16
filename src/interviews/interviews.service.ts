import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDoc } from '../schemas/user.schema';
import { Interview, InterviewDoc } from '../schemas/interview.schema';
import { AIService } from '../ai/ai.service';
import { LivekitService } from '../livekit/livekit.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  AnalyzeInterviewResponse,
  GetInterviewResponse,
  GetUserInterviewsResponse,
} from '../common/interfaces/interview.interface';
import { AnalyzeInterviewDto } from 'src/common/dto';
import { logError } from 'src/common/utils/error-logger.util';
import { SessionData } from 'src/common/interfaces';

@Injectable()
export class InterviewsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDoc>,
    @InjectModel(Interview.name) private interviewModel: Model<InterviewDoc>,
    private aiService: AIService,
    private livekitService: LivekitService,
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

    // Create interview record with processing status - Market Sizing
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
      caseQuestion: dto.caseQuestion,
      difficulty: dto.difficulty,
      candidateAnswer: dto.candidateAnswer,
      status: 'processing',
    });

    const interviewId = (interview._id as Types.ObjectId).toString();
    this.logger.log(
      `Market sizing interview created: ${interviewId} - Question: ${dto.caseQuestion}`,
    );

    // Process AI analysis in the background
    void this.processMarketSizingAnalysisAsync(
      interview,
      dto.sessionData,
      dto.caseQuestion,
      dto.roomName,
    );

    return {
      interviewId,
      status: 'processing',
      message: 'Interview saved. AI analysis in progress...',
    };
  }

  // Market Sizing Analysis - Async Background Processing
  private async processMarketSizingAnalysisAsync(
    interview: InterviewDoc,
    sessionData: SessionData,
    caseQuestion: string,
    roomName: string,
  ): Promise<void> {
    const interviewId = (interview._id as Types.ObjectId).toString();

    try {
      this.logger.log(
        `Starting MBB-aligned market sizing analysis for interview ${interviewId}`,
      );

      const caseAnalysis = await this.aiService.analyzeMarketSizingInterview(
        sessionData,
        caseQuestion,
      );

      // Update interview with case analysis
      interview.caseAnalysis = caseAnalysis;
      interview.status = 'completed';
      interview.processedAt = new Date();
      await interview.save();

      this.logger.log(
        `Market sizing analysis completed successfully for ID: ${interviewId}. Score: ${caseAnalysis.overallWeightedScore}/5 (${caseAnalysis.overallLabel})`,
      );

      // Clear the session timer since interview is completed
      this.livekitService.clearSessionTimer(roomName);
    } catch (error: any) {
      logError(
        this.logger,
        `Market sizing AI analysis failed for interview ${interviewId}`,
        error,
      );

      interview.status = 'failed';
      await interview.save();

      // Clear the session timer even on failure
      this.livekitService.clearSessionTimer(roomName);
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
      caseQuestion: interview.caseQuestion,
      difficulty: interview.difficulty,
      candidateAnswer: interview.candidateAnswer,
      caseAnalysis: interview.caseAnalysis,
      status: interview.status,
    };
  }

  async getUserInterviews(
    participantIdentity: string,
  ): Promise<GetUserInterviewsResponse> {
    this.logger.log(
      `Fetching all interviews for participant: ${participantIdentity}`,
    );

    const interviews = await this.interviewModel
      .find({ participantIdentity })
      .populate('userId', 'email name')
      .sort({ createdAt: -1 })
      .exec();

    const formattedInterviews: GetInterviewResponse[] = interviews.map(
      (interview) => ({
        id: (interview._id as Types.ObjectId).toString(),
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
        caseQuestion: interview.caseQuestion,
        difficulty: interview.difficulty,
        candidateAnswer: interview.candidateAnswer,
        caseAnalysis: interview.caseAnalysis,
        status: interview.status,
      }),
    );

    return {
      interviews: formattedInterviews,
      total: formattedInterviews.length,
    };
  }
}
