import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description:
      'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
  })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token received during login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UpgradeAccountDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description:
      'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
  })
  password: string;
}

export class LogoutDto {
  @ApiProperty({
    description:
      'Optional: Specific refresh token to logout from. If not provided, logs out from all devices',
    required: false,
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
