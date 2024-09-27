import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { createMock } from '@golevelup/ts-jest';
import { Cache } from 'cache-manager';
import { UsersService } from '../users/users.service';
import {
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

describe('PostsService', () => {
  let service: PostsService;
  let repositoryMock: jest.Mocked<Repository<Post>>;
  let cacheManagerMock: jest.Mocked<Cache>;
  let usersServiceMock: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const repositoryMockFactory = jest.fn(() => ({
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      findAndCount: jest.fn(),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getRepositoryToken(Post),
          useFactory: repositoryMockFactory,
        },
        {
          provide: CACHE_MANAGER,
          useValue: createMock<Cache>(),
        },
        {
          provide: UsersService,
          useValue: createMock<UsersService>(),
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    repositoryMock = module.get(getRepositoryToken(Post));
    cacheManagerMock = module.get(CACHE_MANAGER);
    usersServiceMock = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new post and invalidate cache', async () => {
      const authorId = 1;
      const createPostDto: CreatePostDto = {
        title: 'Test Title',
        description: 'Test Content',
      };
      const author = {
        id: authorId,
        email: 'author@example.com',
        password: '',
        posts: [],
        hashPassword: () => Promise.resolve(),
      };
      const postEntity = {
        id: 1,
        ...createPostDto,
        author,
        created_at: new Date(),
        updated_at: new Date(),
      };

      usersServiceMock.findById.mockResolvedValue(author);
      repositoryMock.create.mockReturnValue(postEntity);
      repositoryMock.save.mockResolvedValue(postEntity);
      cacheManagerMock.reset.mockResolvedValue(undefined as never);

      const result = await service.create(createPostDto, authorId);

      expect(usersServiceMock.findById).toHaveBeenCalledWith(authorId);
      expect(repositoryMock.create).toHaveBeenCalledWith({
        ...createPostDto,
        author,
      });
      expect(repositoryMock.save).toHaveBeenCalledWith(postEntity);
      expect(cacheManagerMock.reset).toHaveBeenCalled();
      expect(result).toEqual(postEntity);
    });

    it('should throw InternalServerErrorException if author not found', async () => {
      const authorId = 1;
      const createPostDto: CreatePostDto = {
        title: 'Test Title',
        description: 'Test Content',
      };

      usersServiceMock.findById.mockResolvedValue(null);

      await expect(service.create(createPostDto, authorId)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(usersServiceMock.findById).toHaveBeenCalledWith(authorId);
      expect(repositoryMock.create).not.toHaveBeenCalled();
      expect(repositoryMock.save).not.toHaveBeenCalled();
      expect(cacheManagerMock.reset).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a post and invalidate cache', async () => {
      const postId = 1;
      const userId = 1;
      const updatePostDto: UpdatePostDto = { title: 'Updated Title' };
      const author = {
        id: userId,
        email: 'author@example.com',
        password: '',
        posts: [],
        hashPassword: () => Promise.resolve(),
      };
      const postEntity = {
        id: postId,
        title: 'Old Title',
        description: 'Old Content',
        author,
        created_at: new Date(),
        updated_at: new Date(),
      };

      repositoryMock.findOne.mockResolvedValue(postEntity);
      repositoryMock.save.mockResolvedValue({
        ...postEntity,
        ...updatePostDto,
      });
      cacheManagerMock.reset.mockResolvedValue(undefined as never);

      const result = await service.update(postId, updatePostDto, userId);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(repositoryMock.save).toHaveBeenCalledWith({
        ...postEntity,
        ...updatePostDto,
      });
      expect(cacheManagerMock.reset).toHaveBeenCalled();
      expect(result).toEqual({ ...postEntity, ...updatePostDto });
    });

    it('should throw NotFoundException if post not found', async () => {
      const postId = 1;
      const userId = 1;
      const updatePostDto: UpdatePostDto = { title: 'Updated Title' };

      repositoryMock.findOne.mockResolvedValue(null);

      await expect(
        service.update(postId, updatePostDto, userId),
      ).rejects.toThrow(NotFoundException);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(repositoryMock.save).not.toHaveBeenCalled();
      expect(cacheManagerMock.reset).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      const postId = 1;
      const userId = 1;
      const updatePostDto: UpdatePostDto = { title: 'Updated Title' };
      const author = {
        id: 2,
        email: 'other@example.com',
        password: '',
        posts: [],
        hashPassword: () => Promise.resolve(),
      };
      const postEntity = {
        id: postId,
        title: 'Old Title',
        description: 'Old Content',
        author,
        created_at: new Date(),
        updated_at: new Date(),
      };

      repositoryMock.findOne.mockResolvedValue(postEntity);

      await expect(
        service.update(postId, updatePostDto, userId),
      ).rejects.toThrow(ForbiddenException);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(repositoryMock.save).not.toHaveBeenCalled();
      expect(cacheManagerMock.reset).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a post and invalidate cache', async () => {
      const postId = 1;
      const userId = 1;
      const author = {
        id: userId,
        email: 'author@example.com',
        password: '',
        posts: [],
        hashPassword: () => Promise.resolve(),
      };
      const postEntity = {
        id: postId,
        title: 'Title',
        description: 'Content',
        author,
        created_at: new Date(),
        updated_at: new Date(),
      };

      repositoryMock.findOne.mockResolvedValue(postEntity);
      repositoryMock.remove.mockResolvedValue(undefined as never);
      cacheManagerMock.reset.mockResolvedValue(undefined as never);

      await service.delete(postId, userId);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(repositoryMock.remove).toHaveBeenCalledWith(postEntity);
      expect(cacheManagerMock.reset).toHaveBeenCalled();
    });

    it('should throw NotFoundException if post not found', async () => {
      const postId = 1;
      const userId = 1;

      repositoryMock.findOne.mockResolvedValue(null);

      await expect(service.delete(postId, userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(repositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(repositoryMock.remove).not.toHaveBeenCalled();
      expect(cacheManagerMock.reset).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      const postId = 1;
      const userId = 1;
      const author = {
        id: 2,
        email: 'other@example.com',
        password: '',
        posts: [],
        hashPassword: () => Promise.resolve(),
      };
      const postEntity = {
        id: postId,
        title: 'Title',
        description: 'Content',
        author,
        created_at: new Date(),
        updated_at: new Date(),
      };

      repositoryMock.findOne.mockResolvedValue(postEntity);

      await expect(service.delete(postId, userId)).rejects.toThrow(
        ForbiddenException,
      );

      expect(repositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: postId },
      });
      expect(repositoryMock.remove).not.toHaveBeenCalled();
      expect(cacheManagerMock.reset).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return cached result if available', async () => {
      const page = 1;
      const limit = 10;
      const filters = undefined;
      const cacheKey = `posts_list_${JSON.stringify({ page, limit, filters })}`;
      const cachedResult = { data: [], total: 0 };

      cacheManagerMock.get.mockResolvedValue(cachedResult);

      const result = await service.findAll(page, limit, filters);

      expect(cacheManagerMock.get).toHaveBeenCalledWith(cacheKey);
      expect(repositoryMock.findAndCount).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should fetch posts and cache the result if no cache', async () => {
      const page = 1;
      const limit = 10;
      const filters = undefined;
      const cacheKey = `posts_list_${JSON.stringify({ page, limit, filters })}`;
      const posts = [
        {
          id: 1,
          title: 'Title 1',
          description: 'Content 1',
          author: {
            id: 1,
            email: 'author1@example.com',
            password: '',
            posts: [],
            hashPassword: () => Promise.resolve(),
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          title: 'Title 2',
          description: 'Content 2',
          author: {
            id: 2,
            email: 'author2@example.com',
            password: '',
            posts: [],
            hashPassword: () => Promise.resolve(),
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      const total = 2;
      const findAndCountResult: [Post[], number] = [posts, total];

      cacheManagerMock.get.mockResolvedValue(null);
      repositoryMock.findAndCount.mockResolvedValue(findAndCountResult);
      cacheManagerMock.set.mockResolvedValue(undefined as never);

      const result = await service.findAll(page, limit, filters);

      expect(cacheManagerMock.get).toHaveBeenCalledWith(cacheKey);
      expect(repositoryMock.findAndCount).toHaveBeenCalled();
      expect(cacheManagerMock.set).toHaveBeenCalledWith(
        cacheKey,
        {
          data: posts.map((post) => ({
            ...post,
            author: {
              id: post.author?.id,
              email: post.author?.email,
            },
          })),
          total,
        },
        { ttl: 300 },
      );
      expect(result).toEqual({
        data: posts.map((post) => ({
          ...post,
          author: {
            id: post.author?.id,
            email: post.author?.email,
          },
        })),
        total,
      });
    });
  });
});
