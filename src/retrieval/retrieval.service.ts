import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEmbedding } from '../conversations/entities/message-embedding.entity';

@Injectable()
export class RetrievalService {
  constructor(
    @InjectRepository(MessageEmbedding)
    private readonly embeddingRepository: Repository<MessageEmbedding>,
  ) {}

  /**
   * Search for similar content in the vector database
   * Note: This uses raw SQL because TypeORM doesn't natively support vector similarity operators
   */
  async vectorSearch(
    user_id: string,
    query_embedding: number[],
    limit: number = 5,
    source?: string,
  ): Promise<MessageEmbedding[]> {
    const embeddingString = `[${query_embedding.join(',')}]`;
    
    let query = this.embeddingRepository
      .createQueryBuilder('embedding')
      .where('embedding.user_id = :user_id', { user_id })
      .orderBy(`embedding.embedding <=> :embedding`, 'ASC') // Cosine distance
      .setParameter('embedding', embeddingString)
      .limit(limit);

    if (source) {
      query = query.andWhere('embedding.source = :source', { source });
    }

    return query.getMany();
  }
}
