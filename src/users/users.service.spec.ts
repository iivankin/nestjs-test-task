import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repositoryMock: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const repositoryMockFactory = jest.fn(() => ({
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repositoryMock = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const userEntity = {
        id: 1,
        ...createUserDto,
        posts: [],
        hashPassword: () => Promise.resolve(),
      };

      repositoryMock.create.mockReturnValue(userEntity);
      repositoryMock.save.mockResolvedValue(userEntity);

      const result = await service.create(createUserDto);

      expect(repositoryMock.create).toHaveBeenCalledWith(createUserDto);
      expect(repositoryMock.save).toHaveBeenCalledWith(userEntity);
      expect(result).toEqual(userEntity);
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const email = 'test@example.com';
      const userEntity = {
        id: 1,
        email,
        password: 'password123',
        posts: [],
        hashPassword: () => Promise.resolve(),
      };

      repositoryMock.findOne.mockResolvedValue(userEntity);

      const result = await service.findOne(email);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(result).toEqual(userEntity);
    });

    it('should return null when user not found', async () => {
      const email = 'nonexistent@example.com';

      repositoryMock.findOne.mockResolvedValue(null);

      const result = await service.findOne(email);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user when found by ID', async () => {
      const id = 1;
      const userEntity = {
        id,
        email: 'test@example.com',
        password: 'password123',
        posts: [],
        hashPassword: () => Promise.resolve(),
      };

      repositoryMock.findOne.mockResolvedValue(userEntity);

      const result = await service.findById(id);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual(userEntity);
    });

    it('should return null when user not found by ID', async () => {
      const id = 999;

      repositoryMock.findOne.mockResolvedValue(null);

      const result = await service.findById(id);

      expect(repositoryMock.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(result).toBeNull();
    });
  });
});
