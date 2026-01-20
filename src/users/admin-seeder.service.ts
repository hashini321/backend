import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

@Injectable()
export class AdminSeederService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeederService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@gmail.com';
    const password = this.configService.get<string>('ADMIN_PASSWORD') ?? 'Admin@123';
    await this.usersService.ensureAdmin(email, password);
    this.logger.log(`Ensured admin user exists: ${email}`);
  }
}
