import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { AnalyzeInterviewDto } from '../common/dto/interview.dto';
import {
  AnalyzeInterviewResponse,
  GetInterviewResponse,
  GetUserInterviewsResponse,
  GetUserInterviewsSummaryResponse,
} from '../common/interfaces/interview.interface';
import { Public } from '../auth/decorators/public.decorator';
import { RequireInterviewAccess } from '../auth/decorators/interview-access.decorator';

@ApiTags('interviews')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('analyze')
  @Public()
  @ApiOperation({ summary: 'Analyze market sizing interview' })
  async analyzeInterview(
    @Body() dto: AnalyzeInterviewDto,
  ): Promise<AnalyzeInterviewResponse> {
    return await this.interviewsService.analyzeInterview(dto);
  }

  @Get('my-interviews/summary')
  @RequireInterviewAccess()
  @ApiOperation({
    summary:
      'Get interview summaries by access token (optimized - no transcripts)',
  })
  async getUserInterviewsSummary(
    @Headers('x-interview-token') accessToken: string,
  ): Promise<GetUserInterviewsSummaryResponse> {
    return await this.interviewsService.getUserInterviewsSummaryByToken(
      accessToken,
    );
  }

  @Get('my-interviews')
  @RequireInterviewAccess()
  @ApiOperation({
    summary:
      'Get all interviews by access token (full data including transcripts)',
  })
  async getUserInterviews(
    @Headers('x-interview-token') accessToken: string,
  ): Promise<GetUserInterviewsResponse> {
    return await this.interviewsService.getUserInterviewsByToken(accessToken);
  }

  @Get('interview')
  @RequireInterviewAccess()
  @ApiOperation({ summary: 'Get single interview by access token' })
  async getInterview(
    @Headers('x-interview-token') accessToken: string,
  ): Promise<GetInterviewResponse> {
    return await this.interviewsService.getInterviewByToken(accessToken);
  }
}
