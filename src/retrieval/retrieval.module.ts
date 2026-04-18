import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetrievalService } from './retrieval.service';
import { MessageEmbedding } from '../conversations/entities/message-embedding.entity';

/**
 * RetrievalModule
 * This module is responsible for:
 * 1. Semantic search across all vectorized content (messages, documents, memories).
 * 2. Multi-source context gathering for the LLM.
 * 3. Performing vector similarity calculations in the database.
 */
@Module({
  imports: [TypeOrmModule.forFeature([MessageEmbedding])],
  providers: [RetrievalService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
