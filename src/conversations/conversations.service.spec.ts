import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConversationsService } from './conversations.service';
import { Conversation } from './entities/conversation.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { MessageEmbedding } from './entities/message-embedding.entity';

describe('ConversationsService', () => {
  let service: ConversationsService;

  const mockConversationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockMessageRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockEmbeddingRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockConversationRepo,
        },
        {
          provide: getRepositoryToken(ConversationMessage),
          useValue: mockMessageRepo,
        },
        {
          provide: getRepositoryToken(MessageEmbedding),
          useValue: mockEmbeddingRepo,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createConversation should create and save a conversation', async () => {
    const created = {
      id: 'conv-1',
      user_id: 'user-1',
      title: 'My chat',
      status: 'active',
    };

    mockConversationRepo.create.mockReturnValue(created);
    mockConversationRepo.save.mockResolvedValue(created);

    const result = await service.createConversation('user-1', 'My chat');

    expect(mockConversationRepo.create).toHaveBeenCalledWith({
      user_id: 'user-1',
      title: 'My chat',
      status: 'active',
    });
    expect(mockConversationRepo.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });

  it('getConversationById should query by id with messages relation', async () => {
    const conversation = {
      id: 'conv-1',
      user_id: 'user-1',
      messages: [],
    };

    mockConversationRepo.findOne.mockResolvedValue(conversation);

    const result = await service.getConversationById('conv-1');

    expect(mockConversationRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      relations: ['messages'],
    });
    expect(result).toEqual(conversation);
  });

  it('getAllConversations should return all conversations for a user', async () => {
    const conversations = [
      { id: 'conv-1', user_id: 'user-1', title: 'A' },
      { id: 'conv-2', user_id: 'user-1', title: 'B' },
    ];

    mockConversationRepo.find.mockResolvedValue(conversations);

    const result = await service.getAllConversations('user-1');

    expect(mockConversationRepo.find).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
    });
    expect(result).toEqual(conversations);
  });

  it('addMessage should create and save a message', async () => {
    const created = {
      id: 'msg-1',
      conversation_id: 'conv-1',
      user_id: 'user-1',
      role: 'user',
      content: 'hello',
      metadata: { source: 'chat' },
    };

    mockMessageRepo.create.mockReturnValue(created);
    mockMessageRepo.save.mockResolvedValue(created);

    const result = await service.addMessage(
      'conv-1',
      'user-1',
      'user',
      'hello',
      { source: 'chat' },
    );

    expect(mockMessageRepo.create).toHaveBeenCalledWith({
      conversation_id: 'conv-1',
      user_id: 'user-1',
      role: 'user',
      content: 'hello',
      metadata: { source: 'chat' },
    });
    expect(mockMessageRepo.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });

  it('addMessage should use empty object as default metadata', async () => {
    const created = {
      id: 'msg-1',
      conversation_id: 'conv-1',
      user_id: 'user-1',
      role: 'assistant',
      content: 'hi',
      metadata: {},
    };

    mockMessageRepo.create.mockReturnValue(created);
    mockMessageRepo.save.mockResolvedValue(created);

    const result = await service.addMessage(
      'conv-1',
      'user-1',
      'assistant',
      'hi',
    );

    expect(mockMessageRepo.create).toHaveBeenCalledWith({
      conversation_id: 'conv-1',
      user_id: 'user-1',
      role: 'assistant',
      content: 'hi',
      metadata: {},
    });
    expect(result).toEqual(created);
  });

  it('listMessages should return messages ordered by created_at asc', async () => {
    const messages = [
      { id: 'msg-1', conversation_id: 'conv-1', content: 'first' },
      { id: 'msg-2', conversation_id: 'conv-1', content: 'second' },
    ];

    mockMessageRepo.find.mockResolvedValue(messages);

    const result = await service.listMessages('conv-1');

    expect(mockMessageRepo.find).toHaveBeenCalledWith({
      where: { conversation_id: 'conv-1' },
      order: { created_at: 'ASC' },
    });
    expect(result).toEqual(messages);
  });

  it('insertEmbedding should create and save an embedding', async () => {
    const input = {
      user_id: 'user-1',
      conversation_id: 'conv-1',
      content: 'hello',
      source: 'message',
      embedding: '[1,2,3]',
      metadata: {},
    };

    const created = {
      id: 'emb-1',
      ...input,
    };

    mockEmbeddingRepo.create.mockReturnValue(created);
    mockEmbeddingRepo.save.mockResolvedValue(created);

    const result = await service.insertEmbedding(input);

    expect(mockEmbeddingRepo.create).toHaveBeenCalledWith(input);
    expect(mockEmbeddingRepo.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });
});
