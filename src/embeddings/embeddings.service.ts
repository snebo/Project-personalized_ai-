import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { performance } from 'perf_hooks';

/**
 * EmbeddingsService
 * 
 * Model: Xenova/all-MiniLM-L6-v2
 * Dimensions: 384
 */
@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsService.name);
  private model!: HuggingFaceTransformersEmbeddings;
  private readonly TIMEOUT_MS = 15000; // 15s timeout for local embedding

  async onModuleInit() {
    this.model = new HuggingFaceTransformersEmbeddings({
      model: 'Xenova/all-MiniLM-L6-v2',
    });
    this.logger.log('Embeddings model initialized (Xenova/all-MiniLM-L6-v2, 384 dimensions)');
  }

  /**
   * Embeds a single string into a vector with timeout protection and performance tracking.
   */
  async embedQuery(text: string): Promise<number[]> {
    const start = performance.now();
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Input text cannot be empty');
      }

      const result = await this.withTimeout(
        this.model.embedQuery(text),
        this.TIMEOUT_MS,
        'Embedding generation timed out'
      );

      const duration = (performance.now() - start).toFixed(2);
      this.logger.debug(`Generated embedding in ${duration}ms for text length: ${text.length}`);
      
      return result;
    } catch (error: any) {
      const duration = (performance.now() - start).toFixed(2);
      this.logger.error(`Embedding failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Embeds multiple strings into a list of vectors.
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const start = performance.now();
    try {
      if (!texts || texts.length === 0) return [];

      const result = await this.withTimeout(
        this.model.embedDocuments(texts),
        this.TIMEOUT_MS * 2, // Higher timeout for batch
        'Batch embedding generation timed out'
      );

      const duration = (performance.now() - start).toFixed(2);
      this.logger.debug(`Generated ${texts.length} embeddings in ${duration}ms`);
      
      return result;
    } catch (error: any) {
      const duration = (performance.now() - start).toFixed(2);
      this.logger.error(`Batch embedding failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  async generate(text: string): Promise<number[]> {
    return this.embedQuery(text);
  }
}
