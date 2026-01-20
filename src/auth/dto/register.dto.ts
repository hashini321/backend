import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '0123456789' })
  @IsNotEmpty()
  @Matches(/^0\d{9}$/, {
    message: 'mobileNumber must start with 0 and be exactly 10 digits',
  })
  mobileNumber: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string; 
}
