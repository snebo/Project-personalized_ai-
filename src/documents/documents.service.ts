import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { ConversationsService } from '../conversations/conversations.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { LlmService } from '../llm/llm.service';
import { ChatGateway } from '../chat/chat.gateway';
import { performance } from 'perf_hooks';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly conversationsService: ConversationsService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly pipelineService: PipelineService,
    private readonly llmService: LlmService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async processDocumentUpload(userId: string, conversationId: string, file: Express.Multer.File) {
    const conversation = await this.conversationsService.getConversationById(conversationId);
    if (!conversation || conversation.user_id !== userId) {
      throw new BadRequestException('Conversation not found or access denied');
    }

    const content = file.buffer.toString('utf-8').trim();
    if (!content) {
      throw new BadRequestException('File is empty');
    }

    const doc = this.documentRepo.create({
      user_id: userId,
      name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      metadata: { conversationId },
    });
    await this.documentRepo.save(doc);

    // Start background processing
    this.handleBackgroundProcessing(userId, conversationId, doc, content);

    return {
      message: 'File upload started. Processing in background.',
      documentId: doc.id,
    };
  }

  private async handleBackgroundProcessing(userId: string, conversationId: string, doc: Document, content: string) {
    const start = performance.now();
    try {
      this.logger.log(`Starting background processing for document: ${doc.name}`);
      
      const chunks = this.chunkText(content, 1000, 200);
      const totalChunks = chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          const embedding = await this.embeddingsService.embedQuery(chunk);

          await this.conversationsService.insertEmbedding({
            user_id: userId,
            conversation_id: conversationId,
            document_id: doc.id,
            content: chunk,
            source: 'document',
            embedding: `[${embedding.join(',')}]`,
            metadata: {
              file_name: doc.name,
              chunk_index: i,
              total_chunks: totalChunks,
              original_size: doc.file_size,
              mime_type: doc.file_type,
            },
          });

          // Trigger pipeline for knowledge extraction from this chunk
          await this.pipelineService.processMessage(userId, conversationId, chunk);
        } catch (e: any) {
          this.logger.error(`Failed to process chunk ${i} of ${doc.name}: ${e.message}`);
        }
      }

      // Generate Summary
      const summary = await this.llmService.generateCompletion(
        `Please provide a very brief summary (2-3 sentences) of the following document titled "${doc.name}":\n\n${content.slice(0, 3000)}`,
        'Document processing context'
      );

      const assistantMsg = await this.conversationsService.addMessage(
        conversationId,
        userId,
        'assistant',
        `I've finished processing your document: **${doc.name}**. Here's a brief summary:\n\n${summary}`,
        { 
          documentId: doc.id, 
          type: 'document_summary',
          file_name: doc.name 
        }
      );

      this.chatGateway.emitToUser(userId, 'chat:complete', {
        requestId: `doc-upload-${doc.id}`,
        messageId: assistantMsg.id,
        content: assistantMsg.content,
      });

      const duration = (performance.now() - start).toFixed(2);
      this.logger.log(`Document processing completed in ${duration}ms: ${doc.name}`);
    } catch (error: any) {
      const duration = (performance.now() - start).toFixed(2);
      this.logger.error(`Document processing failed after ${duration}ms: ${error.message}`);
      this.chatGateway.emitToUser(userId, 'chat:error', {
        message: `Failed to process document: ${doc.name}`,
      });
    }
  }

  private chunkText(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + size;
      if (end < text.length) {
        const lastNewline = text.lastIndexOf('\n', end);
        if (lastNewline > start) end = lastNewline;
      }

      const chunk = text.slice(start, end).trim();
      if (chunk) chunks.push(chunk);

      start = end - overlap;
      if (start < 0) start = 0;
      if (start >= text.length) break;
      if (overlap >= size) start = end;
    }

    return chunks;
  }
}
