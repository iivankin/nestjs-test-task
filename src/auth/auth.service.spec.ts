import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: createMock<UsersService>(),
        },
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    it('should return null if user is not found', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);

      const result = await service.signIn('test@example.com', 'password');

      expect(result).toBeNull();
      expect(usersService.findOne).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null if password does not match', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        posts: [],
        hashPassword: () => Promise.resolve(),
      };
      jest.spyOn(usersService, 'findOne').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.signIn('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
      expect(usersService.findOne).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongpassword',
        'hashedpassword',
      );
    });

    it('should return access_token if email and password are correct', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        posts: [],
        hashPassword: () => Promise.resolve(),
      };
      jest.spyOn(usersService, 'findOne').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token');

      const result = await service.signIn(
        'test@example.com',
        'correctpassword',
      );

      expect(result).toEqual({ access_token: 'token' });
      expect(usersService.findOne).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correctpassword',
        'hashedpassword',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 1 });
    });
  });

  describe('verifyToken', () => {
    it('should return payload if token is valid', async () => {
      const token = 'validtoken';
      const secret = 'jwtsecret';
      const payload = { sub: 1 };

      jest.spyOn(configService, 'get').mockReturnValue(secret);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      const result = await service.verifyToken(token);

      expect(result).toEqual(payload);
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, { secret });
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      const token = 'invalidtoken';
      const secret = 'jwtsecret';

      jest.spyOn(configService, 'get').mockReturnValue(secret);
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error());

      await expect(service.verifyToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, { secret });
    });
  });
});
