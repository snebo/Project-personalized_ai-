import { of, throwError } from 'rxjs';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConversationsService } from '../conversations/conversations.service';
import { LlmService } from '../llm/llm.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import { PipelineService } from '../pipeline/pipeline.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConversationsService = {
    addMessage: jest.fn(),
  };

  const mockLlmService = {
    streamChat: jest.fn(),
  };

  const mockRetrievalService = {
    getContext: jest.fn(),
  };

  const mockPipelineService = {
    processMessage: jest.fn(),
  };

  const makeClient = () =>
    ({
      id: 'socket-1',
      data: {},
      handshake: {
        query: {},
        headers: {},
      },
      emit: jest.fn(),
      disconnect: jest.fn(),
    }) as any;

  beforeEach(() => {
    gateway = new ChatGateway(
      mockJwtService as unknown as JwtService,
      mockConversationsService as unknown as ConversationsService,
      mockLlmService as unknown as LlmService,
      mockRetrievalService as unknown as RetrievalService,
      mockPipelineService as unknown as PipelineService,
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleConnection', () => {
    it('should disconnect client when token is missing', async () => {
      const client = makeClient();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should authenticate and store socket when token is valid from query', async () => {
      const client = makeClient();
      client.handshake.query.token = 'valid-token';

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });

      await gateway.handleConnection(client);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(client.data.userId).toBe('user-1');

      const sockets = (gateway as any).connectedSockets.get('user-1');
      expect(sockets).toHaveLength(1);
      expect(sockets[0]).toBe(client);
    });

    it('should authenticate when token is in authorization header', async () => {
      const client = makeClient();
      client.handshake.headers.authorization = 'Bearer valid-token';

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });

      await gateway.handleConnection(client);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(client.data.userId).toBe('user-1');
    });

    it('should disconnect on invalid token', async () => {
      const client = makeClient();
      client.handshake.query.token = 'bad-token';

      mockJwtService.verifyAsync.mockRejectedValue(new Error('bad jwt'));

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket but keep user entry when other sockets remain', () => {
      const client1 = makeClient();
      client1.id = 'socket-1';
      client1.data.userId = 'user-1';

      const client2 = makeClient();
      client2.id = 'socket-2';
      client2.data.userId = 'user-1';

      (gateway as any).connectedSockets.set('user-1', [client1, client2]);

      gateway.handleDisconnect(client1);

      const sockets = (gateway as any).connectedSockets.get('user-1');
      expect(sockets).toHaveLength(1);
      expect(sockets[0].id).toBe('socket-2');
    });

    it('should delete user entry when last socket disconnects', () => {
      const client = makeClient();
      client.data.userId = 'user-1';

      (gateway as any).connectedSockets.set('user-1', [client]);

      gateway.handleDisconnect(client);

      expect((gateway as any).connectedSockets.has('user-1')).toBe(false);
    });
  });

  describe('emitToUser', () => {
    it('should emit event to all connected sockets of a user', () => {
      const client1 = makeClient();
      const client2 = makeClient();

      (gateway as any).connectedSockets.set('user-1', [client1, client2]);

      gateway.emitToUser('user-1', 'chat:complete', { ok: true });

      expect(client1.emit).toHaveBeenCalledWith('chat:complete', { ok: true });
      expect(client2.emit).toHaveBeenCalledWith('chat:complete', { ok: true });
    });

    it('should do nothing when user has no sockets', () => {
      expect(() =>
        gateway.emitToUser('missing-user', 'chat:complete', { ok: true }),
      ).not.toThrow();
    });
  });

  describe('handleChatSend', () => {
    const dto = {
      conversationId: '11111111-1111-1111-1111-111111111111',
      content: 'Hello there',
      requestId: 'req-1',
      metadata: {},
    };

    it('should save user message, ack, stream chunks, save assistant message and emit complete', async () => {
      const client = makeClient();
      client.data.userId = 'user-1';

      mockConversationsService.addMessage
        .mockResolvedValueOnce({
          id: 'msg-user-1',
          content: 'Hello there',
        })
        .mockResolvedValueOnce({
          id: 'msg-assistant-1',
          content: 'Hi there',
        });

      mockPipelineService.processMessage.mockResolvedValue(undefined);

      mockRetrievalService.getContext.mockResolvedValue({
        context: { combined: 'retrieved context' },
        meta: { sources: 2 },
      });

      mockLlmService.streamChat.mockReturnValue(of('Hi ', 'there'));

      await gateway.handleChatSend(client, dto as any);

      await new Promise(process.nextTick);

      expect(mockConversationsService.addMessage).toHaveBeenNthCalledWith(
        1,
        dto.conversationId,
        'user-1',
        'user',
        dto.content,
        { requestId: dto.requestId },
      );

      expect(mockPipelineService.processMessage).toHaveBeenCalledWith(
        'user-1',
        dto.conversationId,
        dto.content,
        'msg-user-1',
      );

      expect(client.emit).toHaveBeenCalledWith('chat:ack', {
        requestId: dto.requestId,
        status: 'processing',
      });

      expect(mockRetrievalService.getContext).toHaveBeenCalledWith(
        'user-1',
        dto.conversationId,
        dto.content,
      );

      expect(mockLlmService.streamChat).toHaveBeenCalledWith(
        dto.content,
        'retrieved context',
      );

      expect(client.emit).toHaveBeenCalledWith('chat:chunk', {
        requestId: dto.requestId,
        chunk: 'Hi ',
      });
      expect(client.emit).toHaveBeenCalledWith('chat:chunk', {
        requestId: dto.requestId,
        chunk: 'there',
      });

      expect(mockConversationsService.addMessage).toHaveBeenNthCalledWith(
        2,
        dto.conversationId,
        'user-1',
        'assistant',
        'Hi there',
        {
          requestId: dto.requestId,
          retrieval_meta: { sources: 2 },
        },
      );

      expect(client.emit).toHaveBeenCalledWith('chat:complete', {
        requestId: dto.requestId,
        messageId: 'msg-assistant-1',
        content: 'Hi there',
      });
    });

    it('should emit chat:error when stream errors', async () => {
      const client = makeClient();
      client.data.userId = 'user-1';

      mockConversationsService.addMessage.mockResolvedValue({
        id: 'msg-user-1',
        content: 'Hello there',
      });

      mockPipelineService.processMessage.mockResolvedValue(undefined);

      mockRetrievalService.getContext.mockResolvedValue({
        context: { combined: 'retrieved context' },
        meta: {},
      });

      mockLlmService.streamChat.mockReturnValue(
        throwError(() => new Error('stream failed')),
      );

      await gateway.handleChatSend(client, dto as any);

      expect(client.emit).toHaveBeenCalledWith('chat:error', {
        requestId: dto.requestId,
        message: 'Error during generation',
      });
    });

    it('should emit outer chat:error when addMessage or retrieval fails', async () => {
      const client = makeClient();
      client.data.userId = 'user-1';

      mockConversationsService.addMessage.mockRejectedValue(
        new Error('db failed'),
      );

      await gateway.handleChatSend(client, dto as any);

      expect(client.emit).toHaveBeenCalledWith('chat:error', {
        requestId: dto.requestId,
        message: 'Failed to process message',
      });
    });

    it('should log pipeline trigger failure without breaking chat flow', async () => {
      const client = makeClient();
      client.data.userId = 'user-1';

      const loggerSpy = jest
        .spyOn((gateway as any).logger, 'error')
        .mockImplementation(() => undefined);

      mockConversationsService.addMessage
        .mockResolvedValueOnce({
          id: 'msg-user-1',
          content: 'Hello there',
        })
        .mockResolvedValueOnce({
          id: 'msg-assistant-1',
          content: 'done',
        });

      mockPipelineService.processMessage.mockRejectedValue(
        new Error('pipeline failed'),
      );

      mockRetrievalService.getContext.mockResolvedValue({
        context: { combined: 'retrieved context' },
        meta: {},
      });

      mockLlmService.streamChat.mockReturnValue(of('done'));

      await gateway.handleChatSend(client, dto as any);
      await new Promise(process.nextTick);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Async pipeline trigger failed: pipeline failed',
      );
      expect(client.emit).toHaveBeenCalledWith('chat:complete', {
        requestId: dto.requestId,
        messageId: 'msg-assistant-1',
        content: 'done',
      });
    });
  });

  describe('extractToken', () => {
    it('should return token from query first', () => {
      const client = makeClient();
      client.handshake.query.token = 'query-token';
      client.handshake.headers.authorization = 'Bearer header-token';

      const result = (gateway as any).extractToken(client);

      expect(result).toBe('query-token');
    });

    it('should return token from bearer header', () => {
      const client = makeClient();
      client.handshake.headers.authorization = 'Bearer header-token';

      const result = (gateway as any).extractToken(client);

      expect(result).toBe('header-token');
    });

    it('should return undefined when no token exists', () => {
      const client = makeClient();

      const result = (gateway as any).extractToken(client);

      expect(result).toBeUndefined();
    });
  });
});
