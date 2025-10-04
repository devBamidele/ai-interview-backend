export interface AnalyzeInterviewResponse {
  interviewId: string;
  status: string;
  message: string;
}

export interface InterviewMetrics {
  averagePace: number;
  totalWords: number;
  fillerCount: number;
  pauseCount: number;
  paceTimeline: any[];
}

export interface GetInterviewResponse {
  id: string;
  userId: any;
  createdAt: Date;
  duration: number;
  transcript: string;
  recordingUrl?: string;
  metrics: InterviewMetrics;
  aiAnalysis?: any;
  status: string;
}
