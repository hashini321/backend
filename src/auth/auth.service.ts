import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokensService } from './refresh-tokens.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshTokensService: RefreshTokensService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const { password, ...rest } = user as any;
    return rest;
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    const { password: _, ...rest } = user as any;
    return rest;
  }

  /**
   * Login returns both access token and a refresh token.
   * The refresh token is a compound token: `{id}.{raw}` where only the hash is stored server-side.
   */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Create refresh token record (device / ip can be passed via DTO in future)
    const refreshToken = await this.refreshTokensService.createRefreshToken(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotate refresh token and issue new access + refresh token.
   */
  async refresh(providedRefreshToken: string) {
    if (!providedRefreshToken) throw new BadRequestException('Missing refresh token');

    const { user, refreshToken } = await this.refreshTokensService.rotateRefreshToken(
      providedRefreshToken,
    );

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, refreshToken };
  }

  async logoutByRefresh(providedRefreshToken: string) {
    if (!providedRefreshToken) throw new BadRequestException('Missing refresh token');
    const [id] = providedRefreshToken.split('.');
    if (!id) throw new BadRequestException('Invalid refresh token');
    await this.refreshTokensService.revoke(id);
    return { success: true };
  }

  async logoutAllForUser(userId: string) {
    await this.refreshTokensService.revokeAllForUser(userId);
    return { success: true };
  }
}
