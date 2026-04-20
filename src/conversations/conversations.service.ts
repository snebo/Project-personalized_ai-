import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { MessageEmbedding } from './entities/message-embedding.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepo: Repository<ConversationMessage>,
    @InjectRepository(MessageEmbedding)
    private readonly embeddingRepo: Repository<MessageEmbedding>,
  ) {}

  async createConversation(
    user_id: string,
    title?: string,
  ): Promise<Conversation> {
    const conversation = this.conversationRepo.create({
      user_id,
      title,
      status: 'active',
    });
    return this.conversationRepo.save(conversation);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return this.conversationRepo.findOne({
      where: { id },
      relations: ['messages'],
    });
  }

  async getAllConversations(user_id: string): Promise<Conversation[] | null> {
    return this.conversationRepo.find({ where: { user_id } });
  }

  async addMessage(
    conversation_id: string,
    user_id: string,
    role: string,
    content: string,
    metadata: any = {},
  ): Promise<ConversationMessage> {
    const message = this.messageRepo.create({
      conversation_id,
      user_id,
      role,
      content,
      metadata,
    });
    return this.messageRepo.save(message);
  }

  async listMessages(conversation_id: string): Promise<ConversationMessage[]> {
    return this.messageRepo.find({
      where: { conversation_id },
      order: { created_at: 'ASC' },
    });
  }

  async insertEmbedding(
    data: Partial<MessageEmbedding>,
  ): Promise<MessageEmbedding> {
    const embedding = this.embeddingRepo.create(data);
    return this.embeddingRepo.save(embedding);
  }
}
