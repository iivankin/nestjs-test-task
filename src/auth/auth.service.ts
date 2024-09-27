import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signIn(email: string, password: string) {
    const user = await this.usersService.findOne(email);
    if (!user) return null;

    const isExact = await bcrypt.compare(password, user.password);
    if (!isExact) return null;

    const payload = { sub: user.id };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async verifyToken(token: string) {
    const secret = this.configService.get<string>('JWT_SECRET');
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      return payload;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
