import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';

/**
 * DocumentsModule
 * This module is responsible for:
 * 1. Handling document uploads and storage tracking.
 * 2. Processing files (text extraction, chunking) for vectorization.
 * 3. Managing the metadata and lifecycle of documents within the system.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
