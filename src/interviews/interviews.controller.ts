import { Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { AnalyzeInterviewDto } from '../common/dto/interview.dto';
import {
  AnalyzeInterviewResponse,
  GetInterviewResponse,
  GetUserInterviewsSummaryResponse,
} from '../common/interfaces/interview.interface';
import { TranscriptionServiceGuard } from '../auth/guards/transcription-service.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('interviews')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('analyze')
  @Public()
  @UseGuards(TranscriptionServiceGuard)
  @ApiOperation({ summary: 'Analyze market sizing interview' })
  async analyzeInterview(
    @Body() dto: AnalyzeInterviewDto,
  ): Promise<AnalyzeInterviewResponse> {
    return await this.interviewsService.analyzeInterview(dto);
  }

  @Get('interview')
  @ApiBearerAuth()
  @ApiQuery({
    name: 'interviewId',
    required: true,
    description: 'Interview ID',
  })
  @ApiOperation({ summary: 'Get specific interview by ID' })
  async getInterview(
    @Query('interviewId') interviewId: string,
  ): Promise<GetInterviewResponse> {
    return await this.interviewsService.getInterviewById(interviewId);
  }

  @Get('my-interviews/summary')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get paginated interview summaries (optimized - no transcripts)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-indexed)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (max 100)',
    example: 20,
  })
  async getUserInterviewsSummary(
    @Query() paginationDto: PaginationDto,
  ): Promise<GetUserInterviewsSummaryResponse> {
    return await this.interviewsService.getUserInterviewsSummary(
      paginationDto.page,
      paginationDto.limit,
    );
  }
}
