import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConversationsService } from '../conversations/conversations.service';
import { LlmService } from '../llm/llm.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { IsString, IsNotEmpty, IsUUID, IsObject, IsOptional } from 'class-validator';

class ChatSendDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly conversationsService: ConversationsService,
    private readonly llmService: LlmService,
    private readonly retrievalService: RetrievalService,
    private readonly pipelineService: PipelineService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.sub;
      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('chat:send')
  async handleChatSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ChatSendDto,
  ) {
    const userId = client.data.userId;

    try {
      // 1. Save user message
      const userMsg = await this.conversationsService.addMessage(
        dto.conversationId,
        userId,
        'user',
        dto.content,
        { requestId: dto.requestId },
      );

      // 2. Trigger Pipeline asynchronously
      this.pipelineService
        .processMessage(userId, dto.conversationId, dto.content, userMsg.id)
        .catch((err) => this.logger.error(`Async pipeline trigger failed: ${err.message}`));

      client.emit('chat:ack', { requestId: dto.requestId, status: 'processing' });

      // 3. Perform Retrieval
      const retrievalResult = await this.retrievalService.getContext(
        userId,
        dto.conversationId,
        dto.content,
      );

      // 4. Start AI Streaming with Context
      let fullResponse = '';
      
      this.llmService.streamChat(dto.content, retrievalResult.context.combined).subscribe({
        next: (chunk) => {
          fullResponse += chunk;
          client.emit('chat:chunk', {
            requestId: dto.requestId,
            chunk,
          });
        },
        complete: async () => {
          const cleanResponse = fullResponse.trim().replace(/\\n/g, '\n').replace(/\\"/g, '"');

          // 5. Save assistant response
          const assistantMsg = await this.conversationsService.addMessage(
            dto.conversationId,
            userId,
            'assistant',
            cleanResponse,
            { 
              requestId: dto.requestId,
              retrieval_meta: retrievalResult.meta 
            },
          );

          // 6. Emit completion
          client.emit('chat:complete', {
            requestId: dto.requestId,
            messageId: assistantMsg.id,
            content: cleanResponse,
          });

          this.logger.log(`AI Response complete for request ${dto.requestId}`);
        },
        error: (err) => {
          this.logger.error(`Stream error: ${err.message}`);
          client.emit('chat:error', {
            requestId: dto.requestId,
            message: 'Error during generation',
          });
        },
      });

    } catch (error: any) {
      this.logger.error(`Failed to handle chat:send: ${error.message}`);
      client.emit('chat:error', {
        requestId: dto.requestId,
        message: 'Failed to process message',
      });
    }
  }

  private extractToken(client: Socket): string | undefined {
    const tokenFromQuery = client.handshake.query?.token as string;
    if (tokenFromQuery) return tokenFromQuery;
    const authHeader = client.handshake.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
    return undefined;
  }
}
