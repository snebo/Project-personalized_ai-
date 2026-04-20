import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

describe('ConversationsController', () => {
  let controller: ConversationsController;

  const mockConversationsService = {
    createConversation: jest.fn(),
    getConversationById: jest.fn(),
    addMessage: jest.fn(),
    listMessages: jest.fn(),
    getAllConversations: jest.fn(),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: mockConversationsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<ConversationsController>(ConversationsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should call createConversation with req.user.sub and dto.title', async () => {
    const req = { user: { sub: 'user-1' } };
    const dto = { title: 'My chat' };
    const expected = { id: 'conv-1', user_id: 'user-1', title: 'My chat' };

    mockConversationsService.createConversation.mockResolvedValue(expected);

    const result = await controller.create(req, dto as any);

    expect(mockConversationsService.createConversation).toHaveBeenCalledWith(
      'user-1',
      'My chat',
    );
    expect(result).toEqual(expected);
  });

  it('findOne should call getConversationById with id', async () => {
    const expected = { id: 'conv-1', user_id: 'user-1' };

    mockConversationsService.getConversationById.mockResolvedValue(expected);

    const result = await controller.findOne('conv-1');

    expect(mockConversationsService.getConversationById).toHaveBeenCalledWith(
      'conv-1',
    );
    expect(result).toEqual(expected);
  });

  it('addMessage should call service with id, req.user.sub, dto.role, dto.content and dto.metadata', async () => {
    const req = { user: { sub: 'user-1' } };
    const dto = {
      role: 'user',
      content: 'hello',
      metadata: { source: 'chat' },
    };
    const expected = { id: 'msg-1', ...dto };

    mockConversationsService.addMessage.mockResolvedValue(expected);

    const result = await controller.addMessage('conv-1', req, dto as any);

    expect(mockConversationsService.addMessage).toHaveBeenCalledWith(
      'conv-1',
      'user-1',
      'user',
      'hello',
      { source: 'chat' },
    );
    expect(result).toEqual(expected);
  });

  it('listMessages should call service with conversation id', async () => {
    const expected = [
      { id: 'msg-1', content: 'hello' },
      { id: 'msg-2', content: 'hi' },
    ];

    mockConversationsService.listMessages.mockResolvedValue(expected);

    const result = await controller.listMessages('conv-1');

    expect(mockConversationsService.listMessages).toHaveBeenCalledWith(
      'conv-1',
    );
    expect(result).toEqual(expected);
  });

  it('listAllconversations should call service with req.user.sub', async () => {
    const req = { user: { sub: 'user-1' } };
    const expected = [
      { id: 'conv-1', user_id: 'user-1' },
      { id: 'conv-2', user_id: 'user-1' },
    ];

    mockConversationsService.getAllConversations.mockResolvedValue(expected);

    const result = await controller.listAllconversations(req);

    expect(mockConversationsService.getAllConversations).toHaveBeenCalledWith(
      'user-1',
    );
    expect(result).toEqual(expected);
  });
});
