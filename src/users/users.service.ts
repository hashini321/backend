import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByMobileNumber(mobileNumber: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ mobileNumber });
  }

  async create(dto: CreateUserDto, role: Role = Role.USER): Promise<User> {
    // Pre-checks to provide clear ConflictExceptions instead of DB errors
    const existingByEmail = await this.usersRepository.findOneBy({ email: dto.email });
    if (existingByEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingByMobile = await this.findByMobileNumber(dto.mobileNumber);
    if (existingByMobile) {
      throw new ConflictException('Mobile number already exists');
    }

    const saltRounds = 10;
    const hashed = await bcrypt.hash(dto.password, saltRounds);
    const user = this.usersRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      mobileNumber: dto.mobileNumber,
      password: hashed,
      role,
    });

    // Attempt save and map DB unique constraint errors to ConflictException for safety
    try {
      return await this.usersRepository.save(user);
    } catch (err: any) {
      // Postgres unique violation
      if (err?.code === '23505') {
        const detail: string = err.detail ?? '';
        if (detail.includes('(mobile_number)')) throw new ConflictException('Mobile number already exists');
        if (detail.includes('(email)')) throw new ConflictException('Email already exists');
        throw new ConflictException('Duplicate key error');
      }
      throw err;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { password: hashedPassword });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // Idempotent admin seeding
  async ensureAdmin(email = 'admin@gmail.com', password = 'Admin@123') {
    let admin = await this.findByEmail(email);
    admin ??= await this.create(
      { firstName: 'IB', lastName: 'admin', email, mobileNumber: '0123456789', password } as CreateUserDto,
      Role.ADMIN,
    );
    return admin;
  }
}
