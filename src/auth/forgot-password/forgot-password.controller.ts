import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ForgotPasswordService } from './forgot-password.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth/forgot-password')
@Controller('auth/forgot-password')
export class ForgotPasswordController {
  constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request an OTP for password reset' })
  @ApiResponse({ status: 200, description: 'OTP generated and sent via email (stub)' })
  async request(@Body() dto: RequestOtpDto) {
    return this.forgotPasswordService.requestOtp(dto.email);
  }

  @Post('resend')
  @ApiOperation({ summary: 'Resend an OTP if previous one is expired' })
  async resend(@Body() dto: ResendOtpDto) {
    return this.forgotPasswordService.resendOtp(dto.email);
  }

  @Post('verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP and issue a reset token' })
  async verify(@Body() dto: VerifyOtpDto) {
    return this.forgotPasswordService.verifyOtp(dto.email, dto.otp);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset password using a valid reset token' })
  async reset(@Body() dto: ResetPasswordDto) {
    return this.forgotPasswordService.resetPassword(dto.email, dto.token, dto.newPassword);
  }
}
