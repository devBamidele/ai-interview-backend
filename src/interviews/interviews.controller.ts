import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { AnalyzeInterviewDto } from '../common/dto/interview.dto';
import {
  AnalyzeInterviewResponse,
  GetInterviewResponse,
  GetUserInterviewsResponse,
} from '../common/interfaces/interview.interface';

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeInterview(
    @Body() dto: AnalyzeInterviewDto,
  ): Promise<AnalyzeInterviewResponse> {
    return await this.interviewsService.analyzeInterview(dto);
  }

  @Get('user/:participantIdentity')
  async getUserInterviews(
    @Param('participantIdentity') participantIdentity: string,
  ): Promise<GetUserInterviewsResponse> {
    return await this.interviewsService.getUserInterviews(participantIdentity);
  }

  @Get(':interviewId')
  async getInterview(
    @Param('interviewId') interviewId: string,
  ): Promise<GetInterviewResponse> {
    return await this.interviewsService.getInterview(interviewId);
  }
}
