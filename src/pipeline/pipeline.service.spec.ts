import { Test, TestingModule } from '@nestjs/testing';
import { PipelineService } from './pipeline.service';
import { LlmService } from '../llm/llm.service';
import { PeopleService } from '../people/people.service';
import { MemoriesService } from '../memories/memories.service';
import { ConversationsService } from '../conversations/conversations.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { MemoryCategory } from '../memories/dto/create-memory.dto';

describe('PipelineService', () => {
  let service: PipelineService;

  const mockLlmService = {
    model: {
      withStructuredOutput: jest.fn(),
    },
  };

  const mockPeopleService = {
    findByNameAndUser: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  const mockMemoriesService = {
    createMemoryEntry: jest.fn(),
  };

  const mockConversationsService = {
    insertEmbedding: jest.fn(),
  };

  const mockEmbeddingsService = {
    embedQuery: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: LlmService, useValue: mockLlmService },
        { provide: PeopleService, useValue: mockPeopleService },
        { provide: MemoriesService, useValue: mockMemoriesService },
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: EmbeddingsService, useValue: mockEmbeddingsService },
      ],
    }).compile();

    service = module.get<PipelineService>(PipelineService);

    jest.clearAllMocks();
  });

  describe('onModuleInit / processMessage', () => {
    it('should initialize graph on module init', () => {
      const createGraphSpy = jest.spyOn(service as any, 'createGraph');
      service.onModuleInit();

      expect(createGraphSpy).toHaveBeenCalled();
      expect((service as any).graph).toBeDefined();
    });

    it('should invoke graph with expected initial state', async () => {
      const invoke = jest.fn().mockResolvedValue(undefined);
      (service as any).graph = { invoke };

      await service.processMessage(
        'user-1',
        'conv-1',
        'today I met Alice',
        'msg-1',
      );

      expect(invoke).toHaveBeenCalledWith({
        user_id: 'user-1',
        conversation_id: 'conv-1',
        message_id: 'msg-1',
        text: 'today I met Alice',
        extracted: null,
        errors: [],
      });
    });

    it('should swallow graph invocation errors', async () => {
      (service as any).graph = {
        invoke: jest.fn().mockRejectedValue(new Error('graph failed')),
      };

      await expect(
        service.processMessage('user-1', 'conv-1', 'hello', 'msg-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('extractNode', () => {
    it('should return extracted data on success', async () => {
      const extracted = {
        people: [
          {
            name: 'Alice',
            relationship: 'friend',
            facts: ['Lives in Berlin'],
          },
        ],
        emotional_tone: ['happy'],
        topics_discussed: ['travel'],
        key_facts: ['Alice is moving soon'],
      };

      const invoke = jest.fn().mockResolvedValue(extracted);
      const chain = { invoke };
      const pipe = jest.fn().mockReturnValue(chain);

      mockLlmService.model.withStructuredOutput.mockReturnValue({
        __mockStructuredOutput: true,
      });

      const promptModule = await import('@langchain/core/prompts');
      jest
        .spyOn(promptModule.ChatPromptTemplate, 'fromMessages')
        .mockReturnValue({ pipe } as any);

      const result = await (service as any).extractNode({
        user_id: 'user-1',
        text: 'I met Alice today',
      });

      expect(mockLlmService.model.withStructuredOutput).toHaveBeenCalled();
      expect(pipe).toHaveBeenCalled();
      expect(invoke).toHaveBeenCalledWith({ input: 'I met Alice today' });
      expect(result).toEqual({ extracted });
    });

    it('should return extraction error payload on failure', async () => {
      const invoke = jest.fn().mockRejectedValue(new Error('llm failed'));
      const chain = { invoke };
      const pipe = jest.fn().mockReturnValue(chain);

      mockLlmService.model.withStructuredOutput.mockReturnValue({
        __mockStructuredOutput: true,
      });

      const promptModule = await import('@langchain/core/prompts');
      jest
        .spyOn(promptModule.ChatPromptTemplate, 'fromMessages')
        .mockReturnValue({ pipe } as any);

      const result = await (service as any).extractNode({
        user_id: 'user-1',
        text: 'I met Alice today',
      });

      expect(result).toEqual({
        extracted: null,
        errors: ['Extraction failed: llm failed'],
      });
    });
  });

  describe('storeNode', () => {
    it('should do nothing when extracted is null', async () => {
      const result = await (service as any).storeNode({
        extracted: null,
      });

      expect(result).toEqual({});
      expect(mockPeopleService.findByNameAndUser).not.toHaveBeenCalled();
      expect(mockEmbeddingsService.embedQuery).not.toHaveBeenCalled();
    });

    it('should update existing people and create new people', async () => {
      mockPeopleService.findByNameAndUser
        .mockResolvedValueOnce({
          id: 'person-1',
          name: 'Alice',
          relationship: 'friend',
          facts: ['Old fact'],
        })
        .mockResolvedValueOnce(null);

      mockPeopleService.update.mockResolvedValue({});
      mockPeopleService.create.mockResolvedValue({});

      mockEmbeddingsService.embedQuery.mockResolvedValue([0.1, 0.2]);
      mockConversationsService.insertEmbedding.mockResolvedValue({
        id: 'emb-1',
      });
      mockMemoriesService.createMemoryEntry.mockResolvedValue({});

      const state = {
        user_id: 'user-1',
        conversation_id: 'conv-1',
        message_id: 'msg-1',
        text: 'I met Alice and Bob',
        extracted: {
          people: [
            {
              name: 'Alice',
              relationship: 'best friend',
              facts: ['Old fact', 'New fact'],
            },
            {
              name: 'Bob',
              relationship: 'coworker',
              facts: ['Works at X'],
            },
          ],
          key_facts: [],
          topics_discussed: [],
          emotional_tone: [],
        },
      };

      await (service as any).storeNode(state);

      expect(mockPeopleService.findByNameAndUser).toHaveBeenNthCalledWith(
        1,
        'Alice',
        'user-1',
      );
      expect(mockPeopleService.update).toHaveBeenCalledWith(
        'person-1',
        'user-1',
        expect.objectContaining({
          relationship: 'best friend',
          facts: expect.arrayContaining(['Old fact', 'New fact']),
          last_mentioned_at: expect.any(Date),
        }),
      );

      expect(mockPeopleService.findByNameAndUser).toHaveBeenNthCalledWith(
        2,
        'Bob',
        'user-1',
      );
      expect(mockPeopleService.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        name: 'Bob',
        relationship: 'coworker',
        facts: ['Works at X'],
      });
    });

    it('should create memory embeddings and memory entries', async () => {
      mockPeopleService.findByNameAndUser.mockResolvedValue(null);
      mockEmbeddingsService.embedQuery
        .mockResolvedValueOnce([1, 2, 3]) // key fact
        .mockResolvedValueOnce([4, 5, 6]) // topic
        .mockResolvedValueOnce([7, 8, 9]); // original message

      mockConversationsService.insertEmbedding
        .mockResolvedValueOnce({ id: 'emb-fact' })
        .mockResolvedValueOnce({ id: 'emb-topic' })
        .mockResolvedValueOnce({ id: 'emb-message' });

      mockMemoriesService.createMemoryEntry.mockResolvedValue({});

      const state = {
        user_id: 'user-1',
        conversation_id: 'conv-1',
        message_id: 'msg-1',
        text: 'I learned TypeScript and met Alice',
        extracted: {
          people: [],
          key_facts: ['I learned TypeScript'],
          topics_discussed: ['programming'],
          emotional_tone: [],
        },
      };

      await (service as any).storeNode(state);

      expect(mockEmbeddingsService.embedQuery).toHaveBeenNthCalledWith(
        1,
        'I learned TypeScript',
      );
      expect(mockEmbeddingsService.embedQuery).toHaveBeenNthCalledWith(
        2,
        'Topic: programming',
      );
      expect(mockEmbeddingsService.embedQuery).toHaveBeenNthCalledWith(
        3,
        'I learned TypeScript and met Alice',
      );

      expect(mockConversationsService.insertEmbedding).toHaveBeenCalledWith({
        user_id: 'user-1',
        conversation_id: 'conv-1',
        content: 'I learned TypeScript',
        source: 'memory',
        embedding: '[1,2,3]',
        metadata: { category: MemoryCategory.FACT },
      });

      expect(mockMemoriesService.createMemoryEntry).toHaveBeenCalledWith({
        user_id: 'user-1',
        content: 'I learned TypeScript',
        category: MemoryCategory.FACT,
        embedding_id: 'emb-fact',
      });

      expect(mockConversationsService.insertEmbedding).toHaveBeenCalledWith({
        user_id: 'user-1',
        conversation_id: 'conv-1',
        message_id: 'msg-1',
        content: 'I learned TypeScript and met Alice',
        source: 'message',
        embedding: '[7,8,9]',
        metadata: { requestId: undefined },
      });
    });

    it('should continue when a memory embedding fails', async () => {
      mockEmbeddingsService.embedQuery
        .mockRejectedValueOnce(new Error('memory embedding failed'))
        .mockResolvedValueOnce([9, 9, 9]);

      mockConversationsService.insertEmbedding.mockResolvedValue({
        id: 'emb-msg',
      });

      const state = {
        user_id: 'user-1',
        conversation_id: 'conv-1',
        message_id: 'msg-1',
        text: 'hello world',
        extracted: {
          people: [],
          key_facts: ['fact one'],
          topics_discussed: [],
          emotional_tone: [],
        },
      };

      await expect((service as any).storeNode(state)).resolves.toEqual({});

      expect(mockMemoriesService.createMemoryEntry).not.toHaveBeenCalled();
      expect(mockConversationsService.insertEmbedding).toHaveBeenCalledWith({
        user_id: 'user-1',
        conversation_id: 'conv-1',
        message_id: 'msg-1',
        content: 'hello world',
        source: 'message',
        embedding: '[9,9,9]',
        metadata: { requestId: undefined },
      });
    });

    it('should return store error payload when outer store logic fails', async () => {
      mockPeopleService.findByNameAndUser.mockRejectedValue(
        new Error('people lookup failed'),
      );

      const state = {
        user_id: 'user-1',
        conversation_id: 'conv-1',
        message_id: 'msg-1',
        text: 'hello world',
        extracted: {
          people: [{ name: 'Alice', relationship: 'friend', facts: [] }],
          key_facts: [],
          topics_discussed: [],
          emotional_tone: [],
        },
      };

      const result = await (service as any).storeNode(state);

      expect(result).toEqual({
        errors: ['Store failed: people lookup failed'],
      });
    });
  });
});
