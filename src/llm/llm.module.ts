import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './llm.service';

/**
 * LlmModule
 * This module is responsible for:
 * 1. Managing interactions with Large Language Models (Gemini via LangChain).
 * 2. Generating conversational responses and complex completions.
 * 3. Handling model configuration and parameter management.
 */
@Module({
  imports: [ConfigModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
