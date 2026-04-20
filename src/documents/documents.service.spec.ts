jest.mock('../embeddings/embeddings.service', () => ({
  EmbeddingsService: class EmbeddingsService {},
}));

jest.mock('../pipeline/pipeline.service', () => ({
  PipelineService: class PipelineService {},
}));

jest.mock('../llm/llm.service', () => ({
  LlmService: class LlmService {},
}));

jest.mock('../chat/chat.gateway', () => ({
  ChatGateway: class ChatGateway {},
}));

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { ConversationsService } from '../conversations/conversations.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { LlmService } from '../llm/llm.service';
import { ChatGateway } from '../chat/chat.gateway';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const mockDocumentRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConversationsService = {
    getConversationById: jest.fn(),
    insertEmbedding: jest.fn(),
    addMessage: jest.fn(),
  };

  const mockEmbeddingsService = {
    embedQuery: jest.fn(),
  };

  const mockPipelineService = {
    processMessage: jest.fn(),
  };

  const mockLlmService = {
    generateCompletion: jest.fn(),
  };

  const mockChatGateway = {
    emitToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepo,
        },
        {
          provide: ConversationsService,
          useValue: mockConversationsService,
        },
        {
          provide: EmbeddingsService,
          useValue: mockEmbeddingsService,
        },
        {
          provide: PipelineService,
          useValue: mockPipelineService,
        },
        {
          provide: LlmService,
          useValue: mockLlmService,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processDocumentUpload', () => {
    it('should throw when conversation is missing', async () => {
      mockConversationsService.getConversationById.mockResolvedValue(null);

      const file = {
        originalname: 'notes.txt',
        mimetype: 'text/plain',
        size: 100,
        buffer: Buffer.from('hello'),
      } as Express.Multer.File;

      await expect(
        service.processDocumentUpload(
          'user-1',
          '11111111-1111-1111-1111-111111111111',
          file,
        ),
      ).rejects.toThrow(
        new BadRequestException('Conversation not found or access denied'),
      );
    });

    it('should throw when conversation belongs to another user', async () => {
      mockConversationsService.getConversationById.mockResolvedValue({
        id: 'conv-1',
        user_id: 'other-user',
      });

      const file = {
        originalname: 'notes.txt',
        mimetype: 'text/plain',
        size: 100,
        buffer: Buffer.from('hello'),
      } as Express.Multer.File;

      await expect(
        service.processDocumentUpload(
          'user-1',
          '11111111-1111-1111-1111-111111111111',
          file,
        ),
      ).rejects.toThrow(
        new BadRequestException('Conversation not found or access denied'),
      );
    });

    it('should throw when file content is empty', async () => {
      mockConversationsService.getConversationById.mockResolvedValue({
        id: 'conv-1',
        user_id: 'user-1',
      });

      const file = {
        originalname: 'notes.txt',
        mimetype: 'text/plain',
        size: 10,
        buffer: Buffer.from('   '),
      } as Express.Multer.File;

      await expect(
        service.processDocumentUpload(
          'user-1',
          '11111111-1111-1111-1111-111111111111',
          file,
        ),
      ).rejects.toThrow(new BadRequestException('File is empty'));
    });

    it('should create document, save it, trigger background processing, and return response', async () => {
      mockConversationsService.getConversationById.mockResolvedValue({
        id: 'conv-1',
        user_id: 'user-1',
      });

      const createdDoc = {
        id: 'doc-1',
        user_id: 'user-1',
        name: 'notes.txt',
        file_type: 'text/plain',
        file_size: 100,
        metadata: {
          conversationId: '11111111-1111-1111-1111-111111111111',
        },
      };

      mockDocumentRepo.create.mockReturnValue(createdDoc);
      mockDocumentRepo.save.mockResolvedValue(createdDoc);

      const backgroundSpy = jest
        .spyOn(service as any, 'handleBackgroundProcessing')
        .mockResolvedValue(undefined);

      const file = {
        originalname: 'notes.txt',
        mimetype: 'text/plain',
        size: 100,
        buffer: Buffer.from('hello world'),
      } as Express.Multer.File;

      const result = await service.processDocumentUpload(
        'user-1',
        '11111111-1111-1111-1111-111111111111',
        file,
      );

      expect(mockDocumentRepo.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        name: 'notes.txt',
        file_type: 'text/plain',
        file_size: 100,
        metadata: {
          conversationId: '11111111-1111-1111-1111-111111111111',
        },
      });

      expect(mockDocumentRepo.save).toHaveBeenCalledWith(createdDoc);
      expect(backgroundSpy).toHaveBeenCalledWith(
        'user-1',
        '11111111-1111-1111-1111-111111111111',
        createdDoc,
        'hello world',
      );

      expect(result).toEqual({
        message: 'File upload started. Processing in background.',
        documentId: 'doc-1',
      });
    });
  });
});
