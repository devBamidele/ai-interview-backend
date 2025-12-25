import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InterviewDoc = Interview & Document;

@Schema({ _id: false })
export class PaceTimelineItem {
  @Prop({ required: true })
  timestamp: number;

  @Prop({ required: true })
  wpm: number;

  @Prop({ required: true })
  segmentStart: number;

  @Prop({ required: true })
  segmentEnd: number;
}

@Schema({ _id: false })
export class FillerWord {
  @Prop({ required: true })
  word: string;

  @Prop({ required: true })
  timestamp: number;

  @Prop({ required: true })
  contextBefore: string;

  @Prop({ required: true })
  contextAfter: string;
}

@Schema({ _id: false })
export class Pause {
  @Prop({ required: true })
  duration: number;

  @Prop({ required: true })
  timestamp: number;
}

@Schema({ _id: false })
export class Word {
  @Prop({ required: true })
  word: string;

  @Prop({ required: true })
  start: number;

  @Prop({ required: true })
  end: number;

  @Prop({ required: true })
  confidence: number;
}

// Market Sizing Case Analysis - MBB-Aligned 5-Point Scoring

@Schema({ _id: false })
export class PriorityImprovement {
  @Prop({ required: true })
  timestamp: string;

  @Prop({ required: true })
  feedback: string;
}

@Schema({ _id: false })
export class StructuredProblemSolving {
  @Prop({ required: true, min: 1, max: 5 })
  score: number;

  @Prop({ required: true })
  feedback: string;

  @Prop({
    required: true,
    enum: ['top-down', 'bottom-up', 'hybrid', 'none'],
  })
  frameworkDetected: string;

  @Prop({ required: true })
  meceApplied: boolean;

  @Prop({ required: true })
  clarifyingQuestionsAsked: boolean;
}

@Schema({ _id: false })
export class BusinessJudgment {
  @Prop({ required: true, min: 1, max: 5 })
  score: number;

  @Prop({ required: true })
  feedback: string;

  @Prop({ required: true })
  assumptionsStated: boolean;

  @Prop({ required: true })
  assumptionsJustified: boolean;

  @Prop({ required: true })
  assumptionQuality: string;
}

@Schema({ _id: false })
export class QuantitativeSkills {
  @Prop({ required: true, min: 1, max: 5 })
  score: number;

  @Prop({ required: true })
  feedback: string;

  @Prop({ required: true })
  mathShownStepByStep: boolean;

  @Prop({ required: true })
  mathVerbalized: boolean;

  @Prop({ required: true })
  calculationsAccurate: boolean;
}

@Schema({ _id: false })
export class Communication {
  @Prop({ required: true, min: 1, max: 5 })
  score: number;

  @Prop({ required: true })
  feedback: string;
}

@Schema({ _id: false })
export class SanityCheck {
  @Prop({ required: true, min: 1, max: 5 })
  score: number;

  @Prop({ required: true })
  feedback: string;

  @Prop({ required: true })
  sanityCheckPerformed: boolean;

  @Prop({ required: true })
  sanityCheckVerbalized: boolean;
}

@Schema({ _id: false })
export class CaseAnalysis {
  @Prop({ type: StructuredProblemSolving, required: true })
  structuredProblemSolving: StructuredProblemSolving;

  @Prop({ type: BusinessJudgment, required: true })
  businessJudgment: BusinessJudgment;

  @Prop({ type: QuantitativeSkills, required: true })
  quantitativeSkills: QuantitativeSkills;

  @Prop({ type: Communication, required: true })
  communication: Communication;

  @Prop({ type: SanityCheck, required: true })
  sanityCheck: SanityCheck;

  @Prop({ required: true, min: 1, max: 5 })
  overallWeightedScore: number;

  @Prop({
    required: true,
    enum: ['Insufficient', 'Adequate', 'Good', 'Very Good', 'Outstanding'],
  })
  overallLabel: string;

  @Prop({ type: [PriorityImprovement], required: true })
  priorityImprovements: PriorityImprovement[];

  @Prop({ type: [String], required: true })
  highlights: string[];
}

@Schema({ timestamps: true })
export class Interview {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  roomName: string;

  @Prop({ required: true })
  participantIdentity: string;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true })
  transcript: string;

  @Prop({ required: true })
  totalWords: number;

  @Prop({ required: true })
  averagePace: number;

  @Prop({ type: [PaceTimelineItem], required: true })
  paceTimeline: PaceTimelineItem[];

  @Prop({ type: [FillerWord], required: true })
  fillers: FillerWord[];

  @Prop({ type: [Pause], required: true })
  pauses: Pause[];

  @Prop({ type: [Word], required: true })
  words: Word[];

  @Prop({ type: Object })
  transcriptSegments?: any[];

  @Prop()
  recordingUrl?: string;

  // Market Sizing Case-Specific Fields
  @Prop({ required: true })
  caseQuestion: string;

  @Prop({
    required: true,
    enum: ['easy', 'medium', 'hard'],
  })
  difficulty: string;

  @Prop()
  candidateAnswer?: string;

  @Prop({ type: CaseAnalysis })
  caseAnalysis?: CaseAnalysis;

  @Prop({
    required: true,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
  })
  status: string;

  @Prop()
  processedAt?: Date;

  createdAt: Date;
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);
