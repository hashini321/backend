import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Use this endpoint to rotate your refresh token and obtain a new access token.
   * Client sends the refresh token (from cookie or storage) and receives new tokens.
   */
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * Revoke a single refresh token (logout from one device).
   * If no refresh token provided, client should use access-token + call /auth/logout-all.
   */
  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    if (!dto.refreshToken) return { success: true };
    return this.authService.logoutByRefresh(dto.refreshToken);
  }

  /**
   * Revoke all refresh tokens for current user (logout from all devices).
   * Requires a valid access token.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: any) {
    return this.authService.logoutAllForUser(user.userId ?? user.id);
  }
}

