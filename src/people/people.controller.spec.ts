import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

describe('PeopleController', () => {
  let controller: PeopleController;

  const mockPeopleService = {
    create: jest.fn(),
    findByNameAndUser: jest.fn(),
    findById: jest.fn(),
    findAllForUser: jest.fn(),
    update: jest.fn(),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeopleController],
      providers: [
        {
          provide: PeopleService,
          useValue: mockPeopleService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<PeopleController>(PeopleController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should pass dto plus user_id from req.user.sub', async () => {
    const req = { user: { sub: 'user-1' } };
    const dto = { name: 'Alice', relationship: 'friend' };
    const expected = { id: '1', user_id: 'user-1', ...dto };

    mockPeopleService.create.mockResolvedValue(expected);

    const result = await controller.create(req, dto as any);

    expect(mockPeopleService.create).toHaveBeenCalledWith({
      ...dto,
      user_id: 'user-1',
    });
    expect(result).toEqual(expected);
  });

  it('findByName should call service with query name and req.user.sub', async () => {
    const req = { user: { sub: 'user-1' } };
    const expected = { id: '1', user_id: 'user-1', name: 'Alice' };

    mockPeopleService.findByNameAndUser.mockResolvedValue(expected);

    const result = await controller.findByName(req, 'Alice');

    expect(mockPeopleService.findByNameAndUser).toHaveBeenCalledWith(
      'Alice',
      'user-1',
    );
    expect(result).toEqual(expected);
  });

  it('findById should call service with id and req.user.sub', async () => {
    const req = { user: { sub: 'user-1' } };
    const expected = { id: '1', user_id: 'user-1', name: 'Alice' };

    mockPeopleService.findById.mockResolvedValue(expected);

    const result = await controller.findById('1', req);

    expect(mockPeopleService.findById).toHaveBeenCalledWith('1', 'user-1');
    expect(result).toEqual(expected);
  });

  it('findAllPepoleMentioned should call service with req.user.sub', async () => {
    const req = { user: { sub: 'user-1' } };
    const expected = [
      { id: '1', user_id: 'user-1', name: 'Alice' },
      { id: '2', user_id: 'user-1', name: 'Bob' },
    ];

    mockPeopleService.findAllForUser.mockResolvedValue(expected);

    const result = await controller.findAllPepoleMentioned(req);

    expect(mockPeopleService.findAllForUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(expected);
  });

  it('update should call service with id, user_id and dto', async () => {
    const req = { user: { sub: 'user-1' } };
    const dto = { relationship: 'best friend' };
    const expected = {
      id: '1',
      user_id: 'user-1',
      name: 'Alice',
      relationship: 'best friend',
    };

    mockPeopleService.update.mockResolvedValue(expected);

    const result = await controller.update('1', req, dto as any);

    expect(mockPeopleService.update).toHaveBeenCalledWith('1', 'user-1', dto);
    expect(result).toEqual(expected);
  });
});
