import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConversationsModule } from '../conversations/conversations.module';
import { LlmModule } from '../llm/llm.module';
import { RetrievalModule } from '../retrieval/retrieval.module';

@Module({
  imports: [ConversationsModule, LlmModule, RetrievalModule],
  providers: [ChatGateway],
})
export class ChatModule {}
