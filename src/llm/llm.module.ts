import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';

/**
 * LlmModule
 * This module is responsible for:
 * 1. Managing interactions with Large Language Models (OpenAI, Anthropic, or local).
 * 2. Generating conversational responses and complex completions.
 * 3. Handling model configuration and parameter management.
 */
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
