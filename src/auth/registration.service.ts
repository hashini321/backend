import { Injectable, ConflictException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EmailOtp } from './entities/email-otp.entity';
import { UsersService } from '../users/users.service';
import { SendRegistrationOtpDto } from './dto/send-registration-otp.dto';
import { generateOtp } from '../../helpers/otp.generator';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokensService } from './refresh-tokens.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { RegisterDto } from './dto/register-with-otp.dto';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @InjectRepository(EmailOtp)
    private readonly emailOtpRepo: Repository<EmailOtp>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly refreshTokensService: RefreshTokensService,
    private readonly configService: ConfigService,
  ) {}

  private otpTtlMs(): number {
    const minutes = Number.parseInt(this.configService.get<string>('REGISTRATION_OTP_EXPIRES_MINUTES') ?? '5', 10);
    return minutes * 60 * 1000;
  }

  async sendRegistrationOtp(dto: SendRegistrationOtpDto) {
    // Check if email already exists
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already exists');

    // Cleanup expired otps for this email
    await this.emailOtpRepo.delete({ email: dto.email, used: false });

    // Ensure no active OTP exists
    const active = await this.emailOtpRepo.findOne({ where: { email: dto.email, used: false } });
    if (active) {
      if (active.expiresAt.getTime() > Date.now()) {
        throw new BadRequestException('An active OTP already exists. Please wait until it expires before resending.');
      }
      // expired; delete and continue
      await this.emailOtpRepo.delete({ id: active.id });
    }

    const rawOtp = generateOtp();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + this.otpTtlMs());

    const rec = this.emailOtpRepo.create({ email: dto.email, otpHash, expiresAt, used: false });
    await this.emailOtpRepo.save(rec);

    // Log OTP (do NOT send real OTPs in production responses)
    this.logger.log(`Registration OTP for ${dto.email}: ${rawOtp}`);

    return { success: true, expiresAt };
  }

  /**
   * Resend registration OTP only when previous OTP is expired or missing
   */
  async resendRegistrationOtp(dto: SendRegistrationOtpDto) {
    // Check if email already exists
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already exists');

    // Find existing active OTP
    const active = await this.emailOtpRepo.findOne({ where: { email: dto.email, used: false } });

    if (!active) {
      // Nothing active — behave like send
      return this.sendRegistrationOtp(dto);
    }

    if (active.expiresAt.getTime() > Date.now()) {
      throw new BadRequestException('Active OTP exists and has not expired yet.');
    }

    // Expired — remove and create a new one
    await this.emailOtpRepo.delete({ id: active.id });
    return this.sendRegistrationOtp(dto);
  }

  async registerWithOtp(dto: RegisterDto) {
    // Use transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      // Re-check email and mobile do not exist (to avoid race conditions)
      const userRepo = manager.getRepository(User);
      const existing = await userRepo.findOneBy({ email: dto.email });
      if (existing) throw new ConflictException('Email already exists');

      // const existingByMobile = await userRepo.findOneBy({ mobileNumber: dto.mobileNumber });
      // if (existingByMobile) throw new ConflictException('Mobile number already exists');

      const otpRepo = manager.getRepository(EmailOtp);
      const otpRec = await otpRepo.findOne({ where: { email: dto.email, used: false } });
      if (!otpRec) throw new ConflictException('OTP not found or expired');

      if (otpRec.expiresAt.getTime() <= Date.now()) {
        // delete expired record
        await otpRepo.delete({ id: otpRec.id });
        throw new ConflictException('OTP expired');
      }

      const match = await bcrypt.compare(dto.otp, otpRec.otpHash);
      if (!match) throw new ConflictException('Invalid OTP');

      // All good — create user
      const saltRounds = 10;
      const hashed = await bcrypt.hash(dto.password, saltRounds);

      const user = userRepo.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        mobileNumber: dto.mobileNumber,
        password: hashed,
        role: Role.USER,
      } as any);

      let saved;
      try {
        saved = await userRepo.save(user);
      } catch (err: any) {
        // Map DB unique constraint errors to friendly ConflictExceptions
        if (err?.code === '23505') {
          const detail: string = err.detail ?? '';
          if (detail.includes('(mobile_number)')) throw new ConflictException('Mobile number already exists');
          if (detail.includes('(email)')) throw new ConflictException('Email already exists');
          throw new ConflictException('Duplicate key error');
        }
        throw err;
      }

      // Delete used OTP
      await otpRepo.delete({ id: otpRec.id });

      // Remove password before returning
      const { password, ...rest } = saved as any;

      // Issue access and refresh tokens for the newly created user
      const payload = { userId: saved.id, email: saved.email, role: saved.role };
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = await this.refreshTokensService.createRefreshToken(saved as User, undefined, manager);

      return { user: rest, accessToken, refreshToken };
    });
  }
}
