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

export class GetUserInterviewsResponse {
  @ApiProperty({ type: [GetInterviewResponse] })
  interviews: GetInterviewResponse[];

  @ApiProperty()
  total: number;
}
