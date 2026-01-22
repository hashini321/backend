import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RefreshTokensService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(RefreshToken)
    private repo: Repository<RefreshToken>,
    private configService: ConfigService,
  ) {}

  /**
   * Create a refresh token record for a user and return the token string
   * returned to the client in the form: "{id}.{rawToken}".
   */
  async createRefreshToken(
    user: User,
    options?: { device?: string; ipAddress?: string; expiresDays?: number },
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(RefreshToken) : this.repo;

    const rawToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, this.SALT_ROUNDS);

    const days =
      options?.expiresDays ??
      parseInt(this.configService.get<string>('REFRESH_TOKEN_EXPIRES_DAYS') ?? '30', 10);

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const record = repo.create({
      tokenHash,
      user,
      device: options?.device,
      ipAddress: options?.ipAddress,
      expiresAt,
      revoked: false,
    });

    await repo.save(record);

    // Return compound token so we can look up by id quickly and compare hash
    return `${record.id}.${rawToken}`;
  }

  async findById(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['user'] });
  }

  async revoke(id: string) {
    const rec = await this.repo.findOne({ where: { id } });
    if (!rec) return false;
    rec.revoked = true;
    await this.repo.save(rec);
    return true;
  }

  async revokeAllForUser(userId: string) {
    await this.repo.update({ user: { id: userId } as any }, { revoked: true });
  }

  /**
   * Validate a provided refresh token string and rotate it.
   * On reuse detection (token found but hash doesn't match) revoke all tokens for user.
   */
  async rotateRefreshToken(providedToken: string) {
    // Expect format: {id}.{rawToken}
    const [id, raw] = providedToken.split('.');
    if (!id || !raw) throw new UnauthorizedException('Invalid refresh token');

    const record = await this.findById(id);
    if (!record) throw new UnauthorizedException('Refresh token not found');

    // If nonce doesn't match hash -> token reuse (possible theft)
    const isMatch = await bcrypt.compare(raw, record.tokenHash);
    if (!isMatch) {
      // Revoke all tokens for this user as a security measure
      await this.revokeAllForUser(record.user.id);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    // Check state
    if (record.revoked) {
      await this.revokeAllForUser(record.user.id);
      throw new UnauthorizedException('Refresh token revoked');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old token (rotation)
    record.revoked = true;
    await this.repo.save(record);

    // Issue new refresh token
    const newToken = await this.createRefreshToken(record.user, {
      // carry over device/ip is optional - for now omit
    });

    return { user: record.user, refreshToken: newToken };
  }
}
