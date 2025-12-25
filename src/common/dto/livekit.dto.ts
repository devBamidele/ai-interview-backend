import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTokenDto {
  @ApiProperty({
    description: 'Display name for the participant',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  participantName: string;

  @ApiProperty({
    description: 'Optional interview type for room name generation',
    example: 'behavioral',
    required: false,
  })
  @IsString()
  @IsOptional()
  interviewType?: string;
}
