import {
  Injectable,
  NotFoundException,
  Inject,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Repository,
  FindManyOptions,
  Like,
  FindOptionsWhere,
  MoreThanOrEqual,
  Or,
  LessThan,
  FindOperator,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';

import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private usersService: UsersService,
  ) {}

  async create(createPostDto: CreatePostDto, authorId: number): Promise<Post> {
    const author = await this.usersService.findById(authorId);
    if (!author) {
      throw new InternalServerErrorException('Author not found');
    }

    const post = this.postsRepository.create({
      ...createPostDto,
      author,
    });
    const result = await this.postsRepository.save(post);

    // Invalidate cache
    await this.cacheManager.reset();

    return result;
  }

  async update(
    id: number,
    updatePostDto: UpdatePostDto,
    userId: number,
  ): Promise<Post> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    if (post.author.id !== userId) {
      throw new ForbiddenException(
        `You are not authorized to update this post`,
      );
    }

    Object.assign(post, updatePostDto);
    const result = await this.postsRepository.save(post);

    // Invalidate cache
    await this.cacheManager.reset();

    return result;
  }

  async delete(id: number, userId: number): Promise<void> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    if (post.author.id !== userId) {
      throw new ForbiddenException(
        `You are not authorized to delete this post`,
      );
    }
    await this.postsRepository.remove(post);

    // Invalidate cache
    await this.cacheManager.reset();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters?: {
      authorId?: number;
      dateFrom?: Date;
      dateTo?: Date;
      title?: string;
    },
  ): Promise<{ data: Post[]; total: number }> {
    const cacheKey = `posts_list_${JSON.stringify({ page, limit, filters })}`;
    const cached = await this.cacheManager.get<{ data: Post[]; total: number }>(
      cacheKey,
    );
    if (cached) {
      console.log('Cache hit');
      return cached;
    }

    const where: FindOptionsWhere<Post> = {};
    if (filters) {
      const { authorId, dateFrom, dateTo, title } = filters;
      if (authorId) {
        where['author'] = { id: authorId };
      }
      if (title) {
        where['title'] = Like(`%${title}%`);
      }
      if (dateFrom || dateTo) {
        const values: FindOperator<Date>[] = [];
        if (dateFrom) {
          values.push(MoreThanOrEqual(dateFrom));
        }
        if (dateTo) {
          values.push(LessThan(dateTo));
        }
        where['created_at'] = Or(...values);
      }
    }

    const options: FindManyOptions<Post> = {
      relations: ['author'],
      skip: (page - 1) * limit,
      take: limit,
      where,
      order: { created_at: 'DESC' },
    };

    const [dataRaw, total] = await this.postsRepository.findAndCount(options);

    const data = dataRaw.map((post) => ({
      ...post,
      // class-transformer doesn't work with array for some reason
      author: {
        id: post.author?.id,
        email: post.author?.email,
      } as never,
    }));
    const result = { data, total };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, { ttl: 300 });

    return result;
  }
}
