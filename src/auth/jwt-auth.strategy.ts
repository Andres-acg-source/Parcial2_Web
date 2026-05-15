import { Strategy, VerifyCallback } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyFromResolver: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: any, done: VerifyCallback): Promise<User> {
    // In a real application, you might fetch the user from the DB using payload.sub
    // For now, we assume the payload contains enough info and return a mock user object
    // that matches the expected structure for the service layer.
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      firstName: 'Mock',
      lastName: 'User',
      isActive: true,
      // Only include fields that the service expects
    } as User;
  }
}