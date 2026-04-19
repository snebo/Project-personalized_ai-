import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';
import { ConversationsModule } from '../conversations/conversations.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { ChatModule } from '../chat/chat.module';
import { LlmModule } from 'src/llm/llm.module';

/**
 * DocumentsModule
 * This module is responsible for:
 * 1. Handling document uploads and storage tracking.
 * 2. Processing files (text extraction, chunking) for vectorization.
 * 3. Managing the metadata and lifecycle of documents within the system.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    ConversationsModule,
    EmbeddingsModule,
    LlmModule,
    PipelineModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
