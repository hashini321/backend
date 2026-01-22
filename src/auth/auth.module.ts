import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokensService } from './refresh-tokens.service';
import { Otp } from './forgot-password/entities/otp.entity';
import { ForgotPasswordService } from './forgot-password/forgot-password.service';
import { ForgotPasswordController } from './forgot-password/forgot-password.controller';
import { EmailOtp } from './entities/email-otp.entity';
import { RegistrationService } from './registration.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN');
        return {
          secret: configService.get<string>('JWT_SECRET') ?? 'CHANGE_THIS_SECRET',
          signOptions: { expiresIn: expiresIn as any },
        };
      },
    }),
    TypeOrmModule.forFeature([RefreshToken, Otp, EmailOtp]),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, RefreshTokensService, ForgotPasswordService, RegistrationService],
  controllers: [AuthController, ForgotPasswordController],
  exports: [AuthService],
})
export class AuthModule {}
