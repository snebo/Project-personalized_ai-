import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';

/**
 * EmbeddingsService
 * 
 * Model: Xenova/all-MiniLM-L6-v2
 * Dimensions: 384
 * 
 * This service provides vector embedding generation using LangChain's HuggingFaceTransformersEmbeddings wrapper.
 */
@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsService.name);
  private model!: HuggingFaceTransformersEmbeddings;

  async onModuleInit() {
    this.model = new HuggingFaceTransformersEmbeddings({
      model: 'Xenova/all-MiniLM-L6-v2',
    });
    this.logger.log('Embeddings model initialized (Xenova/all-MiniLM-L6-v2, 384 dimensions)');
  }

  /**
   * Embeds a single string into a vector.
   * @param text The input text to embed.
   * @returns A Promise resolving to a number array (vector).
   */
  async embedQuery(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Input text cannot be empty');
      }
      return await this.model.embedQuery(text);
    } catch (error: any) {
      this.logger.error(`Failed to embed query: ${error.message}`);
      throw error;
    }
  }

  /**
   * Embeds multiple strings into a list of vectors.
   * @param texts The array of input texts to embed.
   * @returns A Promise resolving to an array of number arrays (vectors).
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      if (!texts || texts.length === 0) {
        return [];
      }
      return await this.model.embedDocuments(texts);
    } catch (error: any) {
      this.logger.error(`Failed to embed documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility. 
   * @deprecated Use embedQuery instead.
   */
  async generate(text: string): Promise<number[]> {
    return this.embedQuery(text);
  }
}
