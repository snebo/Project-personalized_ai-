import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConversationsModule } from '../conversations/conversations.module';
import { LlmModule } from '../llm/llm.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [
    ConversationsModule,
    LlmModule,
    RetrievalModule,
    PipelineModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
