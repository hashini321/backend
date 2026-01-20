import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Otp } from './entities/otp.entity';
import { UsersService } from '../../users/users.service';
import { generateOtp } from './utils/otp.generator';
import { sendOtpEmailStub } from './utils/email.stub';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ForgotPasswordService {
  constructor(
    @InjectRepository(Otp)
    private readonly otpRepo: Repository<Otp>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private otpTtlMs() {
    // OTP TTL in milliseconds (default 1 minute)
    const minutes = Number.parseInt(this.configService.get<string>('OTP_EXPIRES_MINUTES') ?? '1', 10);
    return minutes * 60 * 1000;
  }

  private resetTokenExpiresSeconds() {
    // minutes for reset token (default 15)
    const minutes = Number.parseInt(this.configService.get<string>('OTP_RESET_TOKEN_EXPIRES_MINUTES') ?? '15', 10);
    return minutes * 60; // seconds
  }

  async requestOtp(email: string, device?: string, ipAddress?: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    // Remove previous expired OTPs
    await this.otpRepo.delete({ userId: user.id, consumed: true });
    await this.cleanupExpiredForUser(user.id);

    // Ensure no active OTP exists
    const active = await this.otpRepo.findOne({ where: { userId: user.id, used: false, consumed: false } });
    if (active) throw new BadRequestException('An active OTP already exists. Please wait until it expires before resending.');

    const rawOtp = generateOtp();
    const salt = 10;
    const otpHash = await bcrypt.hash(rawOtp, salt);

    const expiresAt = new Date(Date.now() + this.otpTtlMs());

    const otp = this.otpRepo.create({ otpHash, user, userId: user.id, expiresAt, device, ipAddress });
    await this.otpRepo.save(otp);

    // Send email stub (do NOT send raw otp in production responses)
    await sendOtpEmailStub(email, rawOtp);

    // For security we do not return the OTP. For tests you could return it conditionally.
    return { success: true, expiresAt };
  }

  async resendOtp(email: string, device?: string, ipAddress?: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    // Find any active OTP
    const existing = await this.otpRepo.findOne({ where: { userId: user.id, used: false, consumed: false } });
    if (existing) {
      // If existing OTP expired, delete and create new
      if (existing.expiresAt.getTime() <= Date.now()) {
        await this.otpRepo.delete({ id: existing.id });
        return this.requestOtp(email, device, ipAddress);
      }
      throw new BadRequestException('Active OTP exists and has not expired yet.');
    }

    return this.requestOtp(email, device, ipAddress);
  }

  async verifyOtp(email: string, rawOtp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    // Remove any expired OTPs for this user
    await this.cleanupExpiredForUser(user.id);

    const otp = await this.otpRepo.findOne({ where: { userId: user.id, used: false, consumed: false } });
    if (!otp) throw new UnauthorizedException('OTP not found or expired');

    const match = await bcrypt.compare(rawOtp, otp.otpHash);
    if (!match) throw new UnauthorizedException('Invalid OTP');

    // Mark OTP as used (verified) so it can't be verified again
    otp.used = true;
    await this.otpRepo.save(otp);

    // Issue reset token (short lived)
    const payload = { sub: user.id, otpId: otp.id, purpose: 'password_reset' };
    const expiresInSec = this.resetTokenExpiresSeconds();
    const token = this.jwtService.sign(payload, { expiresIn: expiresInSec });

    return { token, expiresIn: expiresInSec };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (payload.purpose !== 'password_reset' || payload.sub !== user.id) {
      throw new UnauthorizedException('Invalid reset token');
    }

    const otpId = payload.otpId as string;
    const otp = await this.otpRepo.findOne({ where: { id: otpId, userId: user.id } });
    if (!otp) throw new UnauthorizedException('Associated OTP not found');
    if (!otp.used) throw new BadRequestException('OTP not verified');
    if (otp.consumed) throw new BadRequestException('OTP already consumed');

    // All good — update password
    const saltRounds = 10;
    const hashed = await bcrypt.hash(newPassword, saltRounds);
    await this.usersService.updatePassword(user.id, hashed);

    // Mark OTP as consumed and remove it
    otp.consumed = true;
    await this.otpRepo.save(otp);
    await this.otpRepo.delete({ id: otp.id });

    return { success: true };
  }

  private async cleanupExpiredForUser(userId: string) {
    const expired = await this.otpRepo.find({ where: { userId, used: false, consumed: false, expiresAt: LessThan(new Date()) } });
    if (!expired || expired.length === 0) return;
    const ids = expired.map((e) => e.id);
    await this.otpRepo.delete(ids);
  }
}
