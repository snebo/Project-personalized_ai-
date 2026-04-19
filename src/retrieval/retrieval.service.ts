import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEmbedding } from '../conversations/entities/message-embedding.entity';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PeopleService } from '../people/people.service';
import { ConversationsService } from '../conversations/conversations.service';
import { Person } from '../people/entities/person.entity';
import { performance } from 'perf_hooks';

type RetrievalSourceType =
  | 'message'
  | 'document'
  | 'memory'
  | 'conversation_history';

export interface SemanticSearchResult {
  id: string | null;
  content: string;
  source_type: RetrievalSourceType | string;
  metadata: Record<string, any>;
  created_at?: Date | null;
  score?: number | null;
}

interface PersonFactResult {
  id: string;
  name: string;
  relationship: string | null;
  facts: string[];
}

export interface RetrievalContextResult {
  semantic_results: SemanticSearchResult[];
  people_results: PersonFactResult[];
  context: {
    semantic_snippets: string;
    people_facts: string;
    combined: string;
  };
  meta: {
    is_fallback: boolean;
    fallback_reason: string | null;
    semantic_result_count: number;
    people_result_count: number;
    context_char_count: number;
    max_context_chars: number;
    durations: {
      embedding?: number;
      vector_search?: number;
      total: number;
    };
  };
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  private static readonly TOP_K = 5;
  private static readonly FALLBACK_MESSAGE_COUNT = 10;
  private static readonly MAX_CONTEXT_CHARS = 4000;
  private static readonly MAX_SEMANTIC_ITEM_CHARS = 400;
  private static readonly MAX_FACT_CHARS = 200;
  private static readonly MAX_PEOPLE = 5;
  private static readonly SEARCH_TIMEOUT_MS = 5000;

  constructor(
    @InjectRepository(MessageEmbedding)
    private readonly embeddingRepository: Repository<MessageEmbedding>,
    private readonly embeddingsService: EmbeddingsService,
    private readonly peopleService: PeopleService,
    private readonly conversationsService: ConversationsService,
  ) {}

  /**
   * Top-k vector search scoped by user_id.
   */
  async vectorSearch(
    user_id: string,
    query_embedding: number[],
    limit: number = RetrievalService.TOP_K,
    source?: string,
  ): Promise<SemanticSearchResult[]> {
    const start = performance.now();
    const embeddingString = `[${query_embedding.join(',')}]`;

    try {
      let query = this.embeddingRepository
        .createQueryBuilder('embedding')
        .select([
          'embedding.id AS id',
          'embedding.content AS content',
          'embedding.source AS source_type',
          'embedding.metadata AS metadata',
          'embedding.created_at AS created_at',
          'embedding.embedding <=> :embedding AS score',
        ])
        .where('embedding.user_id = :user_id', { user_id })
        .orderBy('score', 'ASC')
        .setParameter('embedding', embeddingString)
        .limit(limit);

      if (source) {
        query = query.andWhere('embedding.source = :source', { source });
      }

      // Timeout protection for the DB query
      const rows = await this.withTimeout(
        query.getRawMany(),
        RetrievalService.SEARCH_TIMEOUT_MS,
        'Vector search timed out'
      );

      const duration = performance.now() - start;
      this.logger.debug(`Vector search completed in ${duration.toFixed(2)}ms. Found ${rows.length} results.`);

      return rows.map((row) => ({
        id: row.id ?? null,
        content: row.content ?? '',
        source_type: row.source_type ?? 'message',
        metadata: this.toMetadataObject(row.metadata),
        created_at: row.created_at ?? null,
        score: row.score !== null ? Number(row.score) : null,
      }));
    } catch (error: any) {
      this.logger.error(`Vector search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches retrieval context for a message.
   */
  async getContext(
    user_id: string,
    conversation_id: string,
    text: string,
  ): Promise<RetrievalContextResult> {
    const totalStart = performance.now();
    let semanticResults: SemanticSearchResult[] = [];
    let isFallback = false;
    let fallbackReason: string | null = null;
    let embeddingDuration = 0;
    let searchDuration = 0;

    try {
      const embStart = performance.now();
      const embedding = await this.embeddingsService.embedQuery(text);
      embeddingDuration = performance.now() - embStart;

      const searchStart = performance.now();
      semanticResults = await this.vectorSearch(
        user_id,
        embedding,
        RetrievalService.TOP_K,
      );
      searchDuration = performance.now() - searchStart;
    } catch (error: any) {
      isFallback = true;
      fallbackReason = error?.message || 'Retrieval failure';
      this.logger.warn(`Semantic retrieval fallback triggered: ${fallbackReason}`);

      const messages = await this.conversationsService.listMessages(conversation_id);
      semanticResults = messages
        .slice(-RetrievalService.FALLBACK_MESSAGE_COUNT)
        .map((m: any, index: number) => ({
          id: m.id ?? `fallback-${index}`,
          content: m.content ?? '',
          source_type: 'conversation_history',
          metadata: this.toMetadataObject(m.metadata),
          created_at: m.created_at ?? null,
          score: null,
        }));
    }

    const mentionedPeople = await this.detectMentionedPeople(user_id, text);

    const semanticSnippets = this.formatSemanticContext(semanticResults);
    const peopleFacts = this.formatPeopleContext(mentionedPeople);
    const combined = this.buildCombinedContext(semanticSnippets, peopleFacts);

    const totalDuration = performance.now() - totalStart;

    return {
      semantic_results: semanticResults,
      people_results: mentionedPeople.map((p) => ({
        id: p.id,
        name: p.name,
        relationship: p.relationship || null,
        facts: this.normalizeFacts(p.facts),
      })),
      context: {
        semantic_snippets: semanticSnippets,
        people_facts: peopleFacts,
        combined,
      },
      meta: {
        is_fallback: isFallback,
        fallback_reason: fallbackReason,
        semantic_result_count: semanticResults.length,
        people_result_count: mentionedPeople.length,
        context_char_count: combined.length,
        max_context_chars: RetrievalService.MAX_CONTEXT_CHARS,
        durations: {
          embedding: Number(embeddingDuration.toFixed(2)),
          vector_search: Number(searchDuration.toFixed(2)),
          total: Number(totalDuration.toFixed(2)),
        },
      },
    };
  }

  private async detectMentionedPeople(user_id: string, text: string): Promise<Person[]> {
    try {
      const people = await this.peopleService.findMentionedPeople(user_id, text);
      return people.slice(0, RetrievalService.MAX_PEOPLE);
    } catch (error: any) {
      this.logger.error(`Person lookup failed: ${error.message}`);
      return [];
    }
  }

  private formatSemanticContext(results: SemanticSearchResult[]): string {
    if (results.length === 0) return 'No relevant history found.';
    return results
      .map((result, index) => {
        const content = this.truncate(result.content, RetrievalService.MAX_SEMANTIC_ITEM_CHARS);
        return `[Snippet #${index + 1} | Source: ${result.source_type}] ${content}`;
      })
      .join('\n');
  }

  private formatPeopleContext(people: Person[]): string {
    if (people.length === 0) return 'No mentioned people found in records.';
    return people
      .map((p) => {
        const facts = this.normalizeFacts(p.facts)
          .slice(0, 5)
          .map((f) => this.truncate(f, RetrievalService.MAX_FACT_CHARS))
          .join('; ');
        return `- ${p.name} (${p.relationship || 'Unknown'}): ${facts || 'No specific facts known.'}`;
      })
      .join('\n');
  }

  private buildCombinedContext(semanticSnippets: string, peopleFacts: string): string {
    const combined = `RELEVANT MEMORIES:\n${semanticSnippets}\n\nKNOWN PEOPLE FACTS:\n${peopleFacts}`;
    return this.truncate(combined, RetrievalService.MAX_CONTEXT_CHARS);
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

  private toMetadataObject(value: unknown): Record<string, any> {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch { return { raw: value }; }
    }
    return {};
  }

  private normalizeFacts(facts: unknown): string[] {
    if (Array.isArray(facts)) return facts.map(f => String(f)).filter(Boolean);
    if (typeof facts === 'string') return [facts];
    return [];
  }

  private truncate(value: string, maxChars: number): string {
    if (!value || value.length <= maxChars) return value;
    return `${value.slice(0, maxChars - 3)}...`;
  }
}
