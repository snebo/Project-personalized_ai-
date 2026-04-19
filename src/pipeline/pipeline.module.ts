import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { LlmModule } from '../llm/llm.module';
import { PeopleModule } from '../people/people.module';
import { MemoriesModule } from '../memories/memories.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

/**
 * PipelineModule
 * This module is responsible for:
 * 1. Orchestrating complex task chains (summarization, extraction, cleaning) using LangGraph.
 * 2. Pre-processing text before embedding or LLM submission.
 * 3. Extracting and deduplicating facts/entities to optimize memory and context.
 */
@Module({
  imports: [
    LlmModule,
    PeopleModule,
    MemoriesModule,
    ConversationsModule,
    EmbeddingsModule,
  ],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
