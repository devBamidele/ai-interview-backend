import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTokenDto {
  @IsString()
  @IsNotEmpty()
  roomName: string;

  @IsString()
  @IsNotEmpty()
  participantName: string;
}
