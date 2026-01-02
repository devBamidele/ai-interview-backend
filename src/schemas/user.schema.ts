import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDoc = User & Document;

export enum UserType {
  AUTHENTICATED = 'authenticated',
  ANONYMOUS = 'anonymous',
}

export interface UserMetadata {
  hasGrantedInterviewConsent?: boolean;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: false, sparse: true })
  email?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ select: false })
  password?: string;

  @Prop()
  participantIdentity?: string;

  @Prop({ type: String, enum: UserType, default: UserType.ANONYMOUS })
  userType: UserType;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  upgradedAt?: Date;

  @Prop({
    type: Object,
    default: { hasGrantedInterviewConsent: false },
  })
  metadata?: UserMetadata;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ participantIdentity: 1 });
UserSchema.index({ email: 1, userType: 1 });
