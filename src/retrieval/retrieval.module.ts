import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetrievalService } from './retrieval.service';
import { MessageEmbedding } from '../conversations/entities/message-embedding.entity';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { PeopleModule } from '../people/people.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { RetrievalController } from './retrieval.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageEmbedding]),
    EmbeddingsModule,
    PeopleModule,
    ConversationsModule,
  ],
  controllers: [RetrievalController],
  providers: [RetrievalService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
