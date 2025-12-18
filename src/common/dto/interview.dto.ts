import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsDefined,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaceTimelineDto {
  @ApiProperty()
  @IsNumber()
  timestamp: number;

  @ApiProperty()
  @IsNumber()
  wpm: number;

  @ApiProperty()
  @IsNumber()
  segmentStart: number;

  @ApiProperty()
  @IsNumber()
  segmentEnd: number;
}

export class FillerWordDto {
  @ApiProperty()
  @IsString()
  word: string;

  @ApiProperty()
  @IsNumber()
  timestamp: number;

  @ApiProperty()
  @IsString()
  contextBefore: string;

  @ApiProperty()
  @IsString()
  contextAfter: string;
}

export class PauseDto {
  @ApiProperty()
  @IsNumber()
  duration: number;

  @ApiProperty()
  @IsNumber()
  timestamp: number;
}

export class WordDto {
  @ApiProperty()
  @IsString()
  word: string;

  @ApiProperty()
  @IsNumber()
  start: number;

  @ApiProperty()
  @IsNumber()
  end: number;

  @ApiProperty()
  @IsNumber()
  confidence: number;
}

export class SessionDataDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  transcript: string;

  @ApiProperty()
  @IsNumber()
  duration: number;

  @ApiProperty()
  @IsNumber()
  totalWords: number;

  @ApiProperty()
  @IsNumber()
  averagePace: number;

  @ApiProperty({ type: [PaceTimelineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaceTimelineDto)
  paceTimeline: PaceTimelineDto[];

  @ApiProperty({ type: [FillerWordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FillerWordDto)
  fillers: FillerWordDto[];

  @ApiProperty({ type: [PauseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PauseDto)
  pauses: PauseDto[];

  @ApiProperty({ type: [WordDto], required: false })
  @IsOptional()
  @IsArray()
  words?: WordDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  transcriptSegments?: any[];
}

export class AnalyzeInterviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  participantIdentity: string;

  @ApiProperty({ type: SessionDataDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => SessionDataDto)
  sessionData: SessionDataDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  caseQuestion: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'] })
  @IsEnum(['easy', 'medium', 'hard'])
  @IsNotEmpty()
  difficulty: 'easy' | 'medium' | 'hard';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  candidateAnswer?: string;
}
