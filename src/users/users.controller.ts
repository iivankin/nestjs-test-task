import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from './entities/user.entity';

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  @ApiCreatedResponse({ type: User, description: 'User created' })
  @ApiBadRequestResponse({ description: 'Email already exists' })
  @UseInterceptors(ClassSerializerInterceptor)
  async create(@Body() createUserDto: CreateUserDto) {
    const current = await this.usersService.findOne(createUserDto.email);
    if (current) {
      throw new BadRequestException('Email already exists');
    }

    const user = await this.usersService.create(createUserDto);
    return user;
  }
}
