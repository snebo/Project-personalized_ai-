import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { ConversationsService } from '../conversations/conversations.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { LlmService } from '../llm/llm.service';
import { ChatGateway } from '../chat/chat.gateway';

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
    // 1. Validate conversation
    const conversation = await this.conversationsService.getConversationById(conversationId);
    if (!conversation || conversation.user_id !== userId) {
      throw new BadRequestException('Conversation not found or access denied');
    }

    // 2. Read and trim content
    const content = file.buffer.toString('utf-8').trim();
    if (!content) {
      throw new BadRequestException('File is empty');
    }

    // 3. Store document record
    const doc = this.documentRepo.create({
      user_id: userId,
      name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      metadata: { conversationId },
    });
    await this.documentRepo.save(doc);

    // 4. Start async processing
    this.handleBackgroundProcessing(userId, conversationId, doc, content);

    return {
      message: 'File upload started. Processing in background.',
      documentId: doc.id,
    };
  }

  private async handleBackgroundProcessing(userId: string, conversationId: string, doc: Document, content: string) {
    try {
      // 5. Chunking (approx 1000 chars with 200 overlap)
      const chunks = this.chunkText(content, 1000, 200);
      const totalChunks = chunks.length;

      const extractedPeople = new Set<string>();

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // 6. Embedding
        const embedding = await this.embeddingsService.embedQuery(chunk);

        // 7. Store in message_embeddings
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
          },
        });

        // 8. Run Extraction Pipeline (Sync for this loop to gather results)
        // We'll run it and catch unique people names
        // Note: PipelineService.processMessage usually runs async, but here we want to aggregate
        // So we might need a more granular method if we want to gather unique names across all chunks
        // For now, let's just trigger it.
        await this.pipelineService.processMessage(userId, conversationId, chunk);
      }

      // 9. Generate Summary
      const summary = await this.llmService.generateCompletion(
        `Please provide a very brief summary (2-3 sentences) of the following document titled "${doc.name}":\n\n${content.slice(0, 3000)}`,
        'Document processing context'
      );

      // 10. Save assistant summary message
      const assistantMsg = await this.conversationsService.addMessage(
        conversationId,
        userId,
        'assistant',
        `I've finished processing your document: **${doc.name}**. Here's a brief summary:\n\n${summary}`,
        { documentId: doc.id, type: 'document_summary' }
      );

      // 11. Emit via WebSocket
      this.chatGateway.emitToUser(userId, 'chat:complete', {
        requestId: `doc-upload-${doc.id}`,
        messageId: assistantMsg.id,
        content: assistantMsg.content,
      });

      this.logger.log(`Document processing completed: ${doc.name} (User: ${userId})`);
    } catch (error: any) {
      this.logger.error(`Document processing failed: ${error.message}`);
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
      
      // If not at the end, try to find a newline to break cleanly
      if (end < text.length) {
        const lastNewline = text.lastIndexOf('\n', end);
        if (lastNewline > start) {
          end = lastNewline;
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk) {
        chunks.push(chunk);
      }

      start = end - overlap;
      if (start < 0) start = 0;
      if (start >= text.length) break;
      
      // Prevent infinite loop if overlap >= size
      if (overlap >= size) start = end;
    }

    return chunks;
  }
}
