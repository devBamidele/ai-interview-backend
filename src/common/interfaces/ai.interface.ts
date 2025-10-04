export interface SessionData {
  transcript: string;
  duration: number;
  totalWords: number;
  averagePace: number;
  paceTimeline: Array<{
    timestamp: number;
    wpm: number;
    segmentStart: number;
    segmentEnd: number;
  }>;
  fillers: Array<{
    word: string;
    timestamp: number;
    contextBefore: string;
    contextAfter: string;
  }>;
  pauses: Array<{
    duration: number;
    timestamp: number;
  }>;
  words?: any[];
  transcriptSegments?: any[];
}

export interface AIAnalysisResult {
  overallScore: number;
  summary: string;
  paceAnalysis: string;
  fillerAnalysis: string;
  confidenceScore: number;
  improvements: Array<{
    title: string;
    timestamp: number;
    description: string;
  }>;
  highlights: string[];
}
