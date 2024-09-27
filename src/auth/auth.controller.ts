import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Get,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Request,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TokensDto } from './dto/tokens.dto';
import { AuthGuard } from './auth.guard';
import { User } from '../users/entities/user.entity';
import type { AuthorizedRequest } from '../util/types';
import { UsersService } from '../users/users.service';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokensDto, description: 'Successful login' })
  @ApiBadRequestResponse({ description: 'Invalid credentials' })
  async login(@Body() createAuthDto: CreateAuthDto) {
    const tokens = await this.authService.signIn(
      createAuthDto.email,
      createAuthDto.password,
    );
    if (!tokens) throw new BadRequestException('Invalid credentials');

    return tokens;
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: User, description: 'Current user' })
  @UseInterceptors(ClassSerializerInterceptor)
  async profile(@Request() req: AuthorizedRequest) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new InternalServerErrorException('User not found');
    }

    return user;
  }
}
