import { Injectable, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

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
    const hashedPassword = await bcrypt.hash(registerDto.password, 12); // Using default 12 as required
    
    const user = this.usersRepository.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: 'member', // Default role
    });

    await this.usersRepository.save(user);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, user: user.toJSON() };
  }

  async signIn(loginDto: LoginDto): Promise<{ accessToken: string; user: User }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, user: user.toJSON() };
  }

  async getProfile(user: User): Promise<User> {
    // Return user data, excluding passwordHash
    return {
      ...user,
      passwordHash: undefined,
    } as User;
  }
}