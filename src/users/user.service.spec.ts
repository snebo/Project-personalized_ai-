import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './user.service';
import { User } from './entities/user.entity';
import { SUPABASE_ADMIN_CLIENT } from 'src/superbase/superbase.constants';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockSupabase = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: SUPABASE_ADMIN_CLIENT,
          useValue: mockSupabase,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a user', async () => {
    const input = {
      email: 'john@example.com',
      name: 'John',
      password: 'hashed-password',
    };

    const createdUser = {
      id: '123',
      ...input,
    };

    mockUsersRepository.create.mockReturnValue(createdUser);
    mockUsersRepository.save.mockResolvedValue(createdUser);

    const result = await service.create(input);

    expect(mockUsersRepository.create).toHaveBeenCalledWith(input);
    expect(mockUsersRepository.save).toHaveBeenCalledWith(createdUser);
    expect(result).toEqual(createdUser);
  });

  it('should find a user by email', async () => {
    const user = {
      id: '123',
      email: 'john@example.com',
      name: 'John',
    };

    mockUsersRepository.findOne.mockResolvedValue(user);

    const result = await service.findByEmail('john@example.com');

    expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    });
    expect(result).toEqual(user);
  });

  it('should find a user by email with password', async () => {
    const user = {
      id: '123',
      email: 'john@example.com',
      name: 'John',
      password: 'hashed-password',
    };

    mockUsersRepository.findOne.mockResolvedValue(user);

    const result = await service.findByEmailWithPassword('john@example.com');

    expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
      select: ['id', 'email', 'name', 'password'],
    });
    expect(result).toEqual(user);
  });

  it('should find a user by id', async () => {
    const user = {
      id: '123',
      email: 'john@example.com',
      name: 'John',
    };

    mockUsersRepository.findOne.mockResolvedValue(user);

    const result = await service.findById('123');

    expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
      where: { id: '123' },
    });
    expect(result).toEqual(user);
  });

  it('should return all users', async () => {
    const users = [
      { id: '1', email: 'a@test.com', name: 'A' },
      { id: '2', email: 'b@test.com', name: 'B' },
    ];

    mockUsersRepository.find.mockResolvedValue(users);

    const result = await service.findAll();

    expect(mockUsersRepository.find).toHaveBeenCalled();
    expect(result).toEqual(users);
  });

  it('should return supabase data in testSupabase', async () => {
    const data = [{ id: '1' }];

    const limit = jest.fn().mockResolvedValue({ data, error: null });
    const select = jest.fn().mockReturnValue({ limit });
    mockSupabase.from.mockReturnValue({ select });

    const result = await service.testSupabase();

    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(select).toHaveBeenCalledWith('*');
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toEqual(data);
  });

  it('should throw if supabase returns error', async () => {
    const error = new Error('Supabase failed');

    const limit = jest.fn().mockResolvedValue({ data: null, error });
    const select = jest.fn().mockReturnValue({ limit });
    mockSupabase.from.mockReturnValue({ select });

    await expect(service.testSupabase()).rejects.toThrow('Supabase failed');
  });
});
