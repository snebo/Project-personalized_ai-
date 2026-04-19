import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConversationsModule } from '../conversations/conversations.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [ConversationsModule, LlmModule],
  providers: [ChatGateway],
})
export class ChatModule {}
