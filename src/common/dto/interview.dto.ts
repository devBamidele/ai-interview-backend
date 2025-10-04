import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaceTimelineDto {
  @IsNumber()
  timestamp: number;

  @IsNumber()
  wpm: number;

  @IsNumber()
  segmentStart: number;

  @IsNumber()
  segmentEnd: number;
}

export class FillerWordDto {
  @IsString()
  word: string;

  @IsNumber()
  timestamp: number;

  @IsString()
  contextBefore: string;

  @IsString()
  contextAfter: string;
}

export class PauseDto {
  @IsNumber()
  duration: number;

  @IsNumber()
  timestamp: number;
}

export class WordDto {
  @IsString()
  word: string;

  @IsNumber()
  start: number;

  @IsNumber()
  end: number;

  @IsNumber()
  confidence: number;
}

export class SessionDataDto {
  @IsString()
  @IsNotEmpty()
  transcript: string;

  @IsNumber()
  duration: number;

  @IsNumber()
  totalWords: number;

  @IsNumber()
  averagePace: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaceTimelineDto)
  paceTimeline: PaceTimelineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FillerWordDto)
  fillers: FillerWordDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PauseDto)
  pauses: PauseDto[];

  @IsOptional()
  @IsArray()
  words?: WordDto[];

  @IsOptional()
  @IsArray()
  transcriptSegments?: any[];
}

export class AnalyzeInterviewDto {
  @IsString()
  @IsNotEmpty()
  roomName: string;

  @IsString()
  @IsNotEmpty()
  participantIdentity: string;

  @ValidateNested()
  @Type(() => SessionDataDto)
  sessionData: SessionDataDto;
}
