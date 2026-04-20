import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';

describe('MemoriesController', () => {
  let controller: MemoriesController;

  const mockMemoriesService = {
    createMemoryEntry: jest.fn(),
    findByUser: jest.fn(),
    findByEntity: jest.fn(),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoriesController],
      providers: [
        {
          provide: MemoriesService,
          useValue: mockMemoriesService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<MemoriesController>(MemoriesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should pass dto plus user_id from req.user.sub', async () => {
    const req = { user: { sub: 'user-1' } };
    const dto = {
      content: 'Alice likes coffee',
      category: 'preference',
      entity_id: 'person-1',
      embedding_id: 'embedding-1',
    };

    const expected = {
      id: 'memory-1',
      user_id: 'user-1',
      ...dto,
    };

    mockMemoriesService.createMemoryEntry.mockResolvedValue(expected);

    const result = await controller.create(req, dto as any);

    expect(mockMemoriesService.createMemoryEntry).toHaveBeenCalledWith({
      ...dto,
      user_id: 'user-1',
    });
    expect(result).toEqual(expected);
  });

  it('findAll should return memories for req.user.sub', async () => {
    const req = { user: { sub: 'user-1' } };
    const expected = [
      {
        id: 'memory-1',
        user_id: 'user-1',
        content: 'Alice likes coffee',
        category: 'preference',
      },
    ];

    mockMemoriesService.findByUser.mockResolvedValue(expected);

    const result = await controller.findAll(req);

    expect(mockMemoriesService.findByUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(expected);
  });

  it('findByEntity should return memories for entity id and req.user.sub', async () => {
    const req = { user: { sub: 'user-1' } };
    const expected = [
      {
        id: 'memory-1',
        user_id: 'user-1',
        entity_id: 'person-1',
        content: 'Alice likes coffee',
        category: 'preference',
      },
    ];

    mockMemoriesService.findByEntity.mockResolvedValue(expected);

    const result = await controller.findByEntity('person-1', req);

    expect(mockMemoriesService.findByEntity).toHaveBeenCalledWith(
      'person-1',
      'user-1',
    );
    expect(result).toEqual(expected);
  });
});
