import { Injectable, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { User } from '../user/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly bcryptSaltRounds: number;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.bcryptSaltRounds = this.configService.get<number>('bcrypt.saltRounds', 12);
  }

  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async register(registerDto: RegisterDto): Promise<{ accessToken: string; user: User }> {
    const existingUser = await this.usersRepository.findOne({ where: { email: registerDto.email } });
    if (existingUser) {
      throw new ConflictException(`A user with email ${registerDto.email} already exists.`);
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, this.bcryptSaltRounds);

    const user = this.usersRepository.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: 'member' as any,
      isActive: true,
    });

    const savedUser = await this.usersRepository.save(user);

    const payload = { sub: savedUser.id, email: savedUser.email, role: savedUser.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m'),
    });

    // Transform to exclude passwordHash
    const userResponse = plainToInstance(User, savedUser);

    return { accessToken, user: userResponse };
  }

  async signIn(loginDto: LoginDto): Promise<{ accessToken: string; user: User }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m'),
    });

    // Transform to exclude passwordHash
    const userResponse = plainToInstance(User, user);

    return { accessToken, user: userResponse };
  }

  async getProfile(user: User): Promise<User> {
    // Transform to exclude passwordHash
    return plainToInstance(User, user);
  }
}