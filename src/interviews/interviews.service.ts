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
  GetUserInterviewsSummaryResponse,
  InterviewSummary,
} from '../common/interfaces/interview.interface';
import { AnalyzeInterviewDto } from 'src/common/dto';
import { logError } from 'src/common/utils/error-logger.util';
import { SessionData } from 'src/common/interfaces';
import { generateAccessToken } from '../common/utils/token.util';

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

    // Generate unique access token for this interview
    const accessToken = generateAccessToken();

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
      accessToken,
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
      accessToken,
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

  async getInterviewByToken(
    accessToken: string,
  ): Promise<GetInterviewResponse> {
    this.logger.log(`Fetching interview with access token`);

    const interview = await this.interviewModel
      .findOne({ accessToken })
      .populate('userId', 'email name')
      .exec();

    if (!interview) {
      throw new NotFoundException(`Interview not found`);
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

  async getUserInterviewsByToken(
    accessToken: string,
  ): Promise<GetUserInterviewsResponse> {
    this.logger.log(`Fetching all interviews for user via access token`);

    // First, find the interview with this token to get participantIdentity
    const tokenInterview = await this.interviewModel
      .findOne({ accessToken })
      .select('participantIdentity')
      .exec();

    if (!tokenInterview) {
      throw new NotFoundException('Invalid access token');
    }

    // Get all interviews for this participant
    const interviews = await this.interviewModel
      .find({ participantIdentity: tokenInterview.participantIdentity })
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

  async getUserInterviewsSummaryByToken(
    accessToken: string,
  ): Promise<GetUserInterviewsSummaryResponse> {
    this.logger.log(
      `Fetching interview summaries for user via access token (optimized)`,
    );

    // First, find the interview with this token to get participantIdentity
    const tokenInterview = await this.interviewModel
      .findOne({ accessToken })
      .select('participantIdentity')
      .exec();

    if (!tokenInterview) {
      throw new NotFoundException('Invalid access token');
    }

    // Get all interviews for this participant - OPTIMIZED: Only select essential fields
    const interviews = await this.interviewModel
      .find({ participantIdentity: tokenInterview.participantIdentity })
      .select(
        '_id status createdAt duration caseQuestion difficulty candidateAnswer caseAnalysis.overallWeightedScore caseAnalysis.overallLabel',
      )
      .sort({ createdAt: -1 })
      .exec();

    const summaries: InterviewSummary[] = interviews.map((interview) => ({
      id: (interview._id as Types.ObjectId).toString(),
      status: interview.status,
      createdAt: interview.createdAt,
      duration: interview.duration,
      caseQuestion: interview.caseQuestion,
      difficulty: interview.difficulty,
      candidateAnswer: interview.candidateAnswer,
      overallWeightedScore: interview.caseAnalysis?.overallWeightedScore,
      overallLabel: interview.caseAnalysis?.overallLabel,
    }));

    return {
      interviews: summaries,
      total: summaries.length,
    };
  }
}
