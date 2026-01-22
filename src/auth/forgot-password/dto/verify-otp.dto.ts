import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '1234' })
  @IsNotEmpty()
  @Matches(/^\d{4}$/, { message: 'otp must be 4 digits' })
  otp: string;
}
