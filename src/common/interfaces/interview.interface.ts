import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeInterviewResponse {
  @ApiProperty()
  interviewId: string;

  @ApiProperty({ enum: ['processing', 'completed', 'failed'] })
  status: string;

  @ApiProperty()
  message: string;
}

export class InterviewMetrics {
  @ApiProperty()
  averagePace: number;

  @ApiProperty()
  totalWords: number;

  @ApiProperty()
  fillerCount: number;

  @ApiProperty()
  pauseCount: number;

  @ApiProperty()
  paceTimeline: any[];
}

export class GetInterviewResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  transcript: string;

  @ApiProperty({ required: false })
  recordingUrl?: string;

  @ApiProperty({ type: InterviewMetrics })
  metrics: InterviewMetrics;

  @ApiProperty()
  caseQuestion: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'] })
  difficulty: string;

  @ApiProperty({ required: false })
  candidateAnswer?: string;

  @ApiProperty({ required: false })
  caseAnalysis?: any;

  @ApiProperty({ enum: ['processing', 'completed', 'failed'] })
  status: string;
}

export class InterviewSummary {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['processing', 'completed', 'failed'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  caseQuestion: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'] })
  difficulty: string;

  @ApiProperty({ required: false })
  candidateAnswer?: string;

  @ApiProperty({
    required: false,
    description: 'Overall weighted score from case analysis',
  })
  overallWeightedScore?: number;

  @ApiProperty({
    required: false,
    description: 'Overall performance label from case analysis',
  })
  overallLabel?: string;
}

export class GetUserInterviewsSummaryResponse {
  @ApiProperty({ type: [InterviewSummary] })
  interviews: InterviewSummary[];

  @ApiProperty({ description: 'Total number of interviews' })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevPage: boolean;
}
