import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InterviewDocument = Interview & Document;

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

@Schema({ _id: false })
export class Improvement {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  timestamp: number;

  @Prop({ required: true })
  description: string;
}

@Schema({ _id: false })
export class AIAnalysis {
  @Prop({ required: true })
  overallScore: number;

  @Prop({ required: true })
  summary: string;

  @Prop({ required: true })
  paceAnalysis: string;

  @Prop({ required: true })
  fillerAnalysis: string;

  @Prop({ required: true })
  confidenceScore: number;

  @Prop({ type: [Improvement], required: true })
  improvements: Improvement[];

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

  @Prop({ type: AIAnalysis })
  aiAnalysis?: AIAnalysis;

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
