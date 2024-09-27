import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Put,
  Delete,
  Param,
  Get,
  Query,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthorizedRequest } from 'src/util/types';

import { PostsService } from './posts.service';
import { Post as PostDto } from './entities/post.entity';
import { AuthGuard } from '../auth/auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ListDto } from './dto/list.dto';

@Controller('posts')
@ApiTags('posts')
@UseInterceptors(ClassSerializerInterceptor)
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post('create')
  @ApiCreatedResponse({ type: PostDto, description: 'Post created' })
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async create(
    @Body() createPostDto: CreatePostDto,
    @Request() req: AuthorizedRequest,
  ) {
    const user = req.user;
    return this.postsService.create(createPostDto, user.sub);
  }

  @Put('update/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: PostDto, description: 'Post updated' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiForbiddenResponse({
    description: 'You are not authorized to update this post',
  })
  async update(
    @Param('id') id: number,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req: AuthorizedRequest,
  ) {
    const user = req.user;
    return this.postsService.update(id, updatePostDto, user.sub);
  }

  @Delete('delete/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Post deleted' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiForbiddenResponse({
    description: 'You are not authorized to delete this post',
  })
  async delete(@Param('id') id: number, @Request() req: AuthorizedRequest) {
    const user = req.user;
    await this.postsService.delete(id, user.sub);
    return { message: 'Post deleted successfully' };
  }

  @Get('list')
  @ApiQuery({ name: 'page', type: 'integer', required: false })
  @ApiQuery({ name: 'limit', type: 'integer', required: false })
  @ApiQuery({ name: 'authorId', type: 'integer', required: false })
  @ApiQuery({
    name: 'dateFrom',
    type: 'string',
    schema: { format: 'date-time' },
    required: false,
  })
  @ApiQuery({
    name: 'dateTo',
    type: 'string',
    schema: { format: 'date-time' },
    required: false,
  })
  @ApiQuery({ name: 'title', type: 'string', required: false })
  @ApiOkResponse({ type: ListDto, description: 'Paginated list' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('authorId') authorId?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('title') title?: string,
  ) {
    const filters = {
      authorId: authorId ? Number(authorId) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      title,
    };
    return this.postsService.findAll(Number(page), Number(limit), filters);
  }
}
