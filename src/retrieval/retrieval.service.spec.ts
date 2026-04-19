import { Test, TestingModule } from '@nestjs/testing';
import { RetrievalService } from './retrieval.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessageEmbedding } from '../conversations/entities/message-embedding.entity';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PeopleService } from '../people/people.service';
import { ConversationsService } from '../conversations/conversations.service';
import { Repository } from 'typeorm';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('RetrievalService', () => {
  let service: RetrievalService;
  let embeddingRepo: Repository<MessageEmbedding>;
  let embeddingsService: EmbeddingsService;
  let peopleService: PeopleService;
  let conversationsService: ConversationsService;

  const mockUser = '0b2f1be7-fa64-4a19-9736-e049842abfe5';
  const mockConv = '0b2f1be7-fa64-4a19-9736-e049842abfe5';

  const mockEmbeddingsService = {
    embedQuery: jest.fn<() => Promise<number[]>>(),
  };

  const mockPeopleService = {
    findMentionedPeople: jest.fn<() => Promise<any[]>>(),
    findAllForUser: jest.fn<() => Promise<any[]>>(),
  };

  const mockConversationsService = {
    listMessages: jest.fn<() => Promise<any[]>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrievalService,
        {
          provide: getRepositoryToken(MessageEmbedding),
          useValue: mockEmbeddingsRepoWrapper(),
        },
        { provide: EmbeddingsService, useValue: mockEmbeddingsService },
        { provide: PeopleService, useValue: mockPeopleService },
        { provide: ConversationsService, useValue: mockConversationsService },
      ],
    }).compile();

    service = module.get<RetrievalService>(RetrievalService);
    embeddingRepo = module.get(getRepositoryToken(MessageEmbedding));
    embeddingsService = module.get(EmbeddingsService);
    peopleService = module.get(PeopleService);
    conversationsService = module.get(ConversationsService);
  });

  function mockEmbeddingsRepoWrapper() {
    return {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContext', () => {
    it('should perform semantic retrieval and person lookup', async () => {
      const mockEmbedding = Array(384).fill(0.1);
      const mockRawResults = [
        { id: '1', content: 'Alice facts', source_type: 'memory', metadata: {}, score: 0.1 }
      ];
      const mockPeople = [
        { id: 'p1', name: 'Alice', relationship: 'friend', facts: ['Lives in Berlin'] }
      ];

      (embeddingsService.embedQuery as any).mockResolvedValue(mockEmbedding);
      (embeddingRepo.createQueryBuilder().getRawMany as any).mockResolvedValue(mockRawResults);
      (peopleService.findMentionedPeople as any).mockResolvedValue(mockPeople);

      const result = await service.getContext(mockUser, mockConv, 'Tell me about Alice');

      expect(result.meta.is_fallback).toBe(false);
      expect(result.people_results).toHaveLength(1);
      expect(result.semantic_results).toHaveLength(1);
      expect(result.context.combined).toContain('Alice');
    });

    it('should fallback to conversation history when embedding service fails', async () => {
      (embeddingsService.embedQuery as any).mockRejectedValue(new Error('Embedding error'));
      (conversationsService.listMessages as any).mockResolvedValue([
        { id: 'm1', content: 'recent message', metadata: {} }
      ]);
      (peopleService.findMentionedPeople as any).mockResolvedValue([]);

      const result = await service.getContext(mockUser, mockConv, 'Hello');

      expect(result.meta.is_fallback).toBe(true);
      expect(result.meta.fallback_reason).toBe('Embedding error');
      expect(result.semantic_results[0].source_type).toBe('conversation_history');
    });

    it('should handle large results and keep within limits', async () => {
      const longContent = 'A'.repeat(5000);
      (embeddingsService.embedQuery as any).mockResolvedValue(Array(384).fill(0.1));
      (embeddingRepo.createQueryBuilder().getRawMany as any).mockResolvedValue([
        { id: '1', content: longContent, source_type: 'document', metadata: {}, score: 0.1 }
      ]);
      (peopleService.findMentionedPeople as any).mockResolvedValue([]);

      const result = await service.getContext(mockUser, mockConv, 'query');

      // The current service truncates individual items to 400 chars
      expect(result.context.combined.length).toBeLessThanOrEqual(4000);
      expect(result.semantic_results[0].content.length).toBeGreaterThan(0);
    });
  });
});
