import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Reset token returned by verify endpoint' })
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewStrongP@ss1' })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
