import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { AnalyzeInterviewDto } from '../common/dto/interview.dto';
import {
  AnalyzeInterviewResponse,
  GetInterviewResponse,
  GetUserInterviewsResponse,
} from '../common/interfaces/interview.interface';

@ApiTags('interviews')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze market sizing interview' })
  @ApiResponse({ status: 200, type: AnalyzeInterviewResponse })
  async analyzeInterview(
    @Body() dto: AnalyzeInterviewDto,
  ): Promise<AnalyzeInterviewResponse> {
    return await this.interviewsService.analyzeInterview(dto);
  }

  @Get('user/:participantIdentity')
  @ApiOperation({ summary: 'Get all interviews for a user' })
  @ApiResponse({ status: 200, type: GetUserInterviewsResponse })
  async getUserInterviews(
    @Param('participantIdentity') participantIdentity: string,
  ): Promise<GetUserInterviewsResponse> {
    return await this.interviewsService.getUserInterviews(participantIdentity);
  }

  @Get(':interviewId')
  @ApiOperation({ summary: 'Get single interview by ID' })
  @ApiResponse({ status: 200, type: GetInterviewResponse })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async getInterview(
    @Param('interviewId') interviewId: string,
  ): Promise<GetInterviewResponse> {
    return await this.interviewsService.getInterview(interviewId);
  }
}
