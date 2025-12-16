import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CaseQuestionDoc = CaseQuestion & Document;

@Schema({ timestamps: true })
export class CaseQuestion {
  @Prop({ required: true, unique: true })
  question: string;

  @Prop({
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  })
  difficulty: string;

  @Prop({ required: true })
  modelAnswerMin: number;

  @Prop({ required: true })
  modelAnswerMax: number;

  @Prop({ required: true })
  unit: string;

  @Prop({ type: String })
  expertApproach?: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const CaseQuestionSchema = SchemaFactory.createForClass(CaseQuestion);
