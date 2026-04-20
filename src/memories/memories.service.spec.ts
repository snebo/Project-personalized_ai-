import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemoriesService } from './memories.service';
import { MemoryEntry } from './entities/memory-entry.entity';

describe('MemoriesService', () => {
  let service: MemoriesService;

  const mockMemoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesService,
        {
          provide: getRepositoryToken(MemoryEntry),
          useValue: mockMemoryRepo,
        },
      ],
    }).compile();

    service = module.get<MemoriesService>(MemoriesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createMemoryEntry should create and save a memory entry', async () => {
    const input = {
      user_id: 'user-1',
      content: 'Alice likes coffee',
      category: 'preference',
      entity_id: 'person-1',
      embedding_id: 'embedding-1',
    };

    const created: MemoryEntry = {
      id: 'memory-1',
      user_id: 'user-1',
      content: 'Alice likes coffee',
      category: 'preference',
      entity_id: 'person-1',
      embedding_id: 'embedding-1',
      created_at: new Date(),
    };

    mockMemoryRepo.create.mockReturnValue(created);
    mockMemoryRepo.save.mockResolvedValue(created);

    const result = await service.createMemoryEntry(input);

    expect(mockMemoryRepo.create).toHaveBeenCalledWith(input);
    expect(mockMemoryRepo.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });

  it('findByUser should return all memories for a user', async () => {
    const memories: MemoryEntry[] = [
      {
        id: 'memory-1',
        user_id: 'user-1',
        content: 'Alice likes coffee',
        category: 'preference',
        entity_id: 'person-1',
        embedding_id: 'embedding-1',
        created_at: new Date(),
      },
      {
        id: 'memory-2',
        user_id: 'user-1',
        content: 'Bob is a coworker',
        category: 'relationship',
        entity_id: 'person-2',
        embedding_id: 'embedding-2',
        created_at: new Date(),
      },
    ];

    mockMemoryRepo.find.mockResolvedValue(memories);

    const result = await service.findByUser('user-1');

    expect(mockMemoryRepo.find).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
    });
    expect(result).toEqual(memories);
  });

  it('findByEntity should return all memories for an entity and user', async () => {
    const memories: MemoryEntry[] = [
      {
        id: 'memory-1',
        user_id: 'user-1',
        content: 'Alice likes coffee',
        category: 'preference',
        entity_id: 'person-1',
        embedding_id: 'embedding-1',
        created_at: new Date(),
      },
    ];

    mockMemoryRepo.find.mockResolvedValue(memories);

    const result = await service.findByEntity('person-1', 'user-1');

    expect(mockMemoryRepo.find).toHaveBeenCalledWith({
      where: { entity_id: 'person-1', user_id: 'user-1' },
    });
    expect(result).toEqual(memories);
  });
});
