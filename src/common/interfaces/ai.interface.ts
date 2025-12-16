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

// Market Sizing Analysis Result - MBB-Aligned
export interface MarketSizingAnalysisResult {
  structuredProblemSolving: {
    score: number;
    feedback: string;
    frameworkDetected: 'top-down' | 'bottom-up' | 'hybrid' | 'none';
    meceApplied: boolean;
    clarifyingQuestionsAsked: boolean;
  };
  businessJudgment: {
    score: number;
    feedback: string;
    assumptionsStated: boolean;
    assumptionsJustified: boolean;
    assumptionQuality: string;
  };
  quantitativeSkills: {
    score: number;
    feedback: string;
    mathShownStepByStep: boolean;
    mathVerbalized: boolean;
    calculationsAccurate: boolean;
  };
  communication: {
    score: number;
    feedback: string;
  };
  sanityCheck: {
    score: number;
    feedback: string;
    sanityCheckPerformed: boolean;
    sanityCheckVerbalized: boolean;
  };
  overallWeightedScore: number;
  overallLabel:
    | 'Insufficient'
    | 'Adequate'
    | 'Good'
    | 'Very Good'
    | 'Outstanding';
  priorityImprovements: Array<{
    timestamp: string;
    feedback: string;
  }>;
  highlights: string[];
}
