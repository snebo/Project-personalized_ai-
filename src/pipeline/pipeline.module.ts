import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { LlmModule } from '../llm/llm.module';

/**
 * PipelineModule
 * This module is responsible for:
 * 1. Orchestrating complex task chains (summarization, extraction, cleaning).
 * 2. Pre-processing text before embedding or LLM submission.
 * 3. Extracting and deduplicating facts/entities to optimize memory and context.
 */
@Module({
  imports: [LlmModule],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
