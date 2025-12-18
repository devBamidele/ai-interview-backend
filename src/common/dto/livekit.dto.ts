import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  participantName: string;
}
