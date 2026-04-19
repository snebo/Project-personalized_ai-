import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEmbedding } from '../conversations/entities/message-embedding.entity';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PeopleService } from '../people/people.service';
import { ConversationsService } from '../conversations/conversations.service';
import { Person } from '../people/entities/person.entity';

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

  constructor(
    @InjectRepository(MessageEmbedding)
    private readonly embeddingRepository: Repository<MessageEmbedding>,
    private readonly embeddingsService: EmbeddingsService,
    private readonly peopleService: PeopleService,
    private readonly conversationsService: ConversationsService,
  ) {}

  /**
   * Top-k vector search scoped by user_id, optionally filtered by source type.
   * Returns structured results including metadata and source_type.
   */
  async vectorSearch(
    user_id: string,
    query_embedding: number[],
    limit: number = RetrievalService.TOP_K,
    source?: string,
  ): Promise<SemanticSearchResult[]> {
    const embeddingString = `[${query_embedding.join(',')}]`;

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

    const rows = await query.getRawMany();

    return rows.map((row) => ({
      id: row.id ?? null,
      content: row.content ?? '',
      source_type: row.source_type ?? 'message',
      metadata: this.toMetadataObject(row.metadata),
      created_at: row.created_at ?? null,
      score:
        row.score !== undefined && row.score !== null
          ? Number(row.score)
          : null,
    }));
  }

  /**
   * Fetches retrieval context for a message.
   * Tries semantic search first, then falls back to recent conversation history if embeddings fail.
   */
  async getContext(
    user_id: string,
    conversation_id: string,
    text: string,
  ): Promise<RetrievalContextResult> {
    let semanticResults: SemanticSearchResult[] = [];
    let isFallback = false;
    let fallbackReason: string | null = null;

    try {
      const embedding = await this.embeddingsService.embedQuery(text);
      semanticResults = await this.vectorSearch(
        user_id,
        embedding,
        RetrievalService.TOP_K,
      );
    } catch (error: any) {
      isFallback = true;
      fallbackReason = error?.message || 'Embedding service failure';
      this.logger.warn(
        `Semantic retrieval skipped due to embedding failure. Falling back to recent conversation messages. Error: ${fallbackReason}`,
      );

      const messages =
        await this.conversationsService.listMessages(conversation_id);
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
      },
    };
  }

  /**
   * DB-level person lookup.
   */
  private async detectMentionedPeople(
    user_id: string,
    text: string,
  ): Promise<Person[]> {
    const people = await this.peopleService.findMentionedPeople(user_id, text);
    return people.slice(0, RetrievalService.MAX_PEOPLE);
  }

  private formatSemanticContext(results: SemanticSearchResult[]): string {
    if (results.length === 0) return 'No relevant history found.';

    return results
      .map((result, index) => {
        const content = this.truncate(
          result.content,
          RetrievalService.MAX_SEMANTIC_ITEM_CHARS,
        );
        const metadataSummary = this.formatMetadata(result.metadata);

        return [
          `#${index + 1}`,
          `Source Type: ${result.source_type}`,
          result.score !== null && result.score !== undefined
            ? `Score: ${result.score.toFixed(4)}`
            : null,
          metadataSummary ? `Metadata: ${metadataSummary}` : null,
          `Content: ${content}`,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n---\n');
  }

  private formatPeopleContext(people: Person[]): string {
    if (people.length === 0) return 'No mentioned people found in records.';

    return people
      .map((p) => {
        const facts = this.normalizeFacts(p.facts)
          .slice(0, 10)
          .map((fact) => this.truncate(fact, RetrievalService.MAX_FACT_CHARS));

        return [
          `Name: ${p.name}`,
          `Relationship: ${p.relationship || 'Unknown'}`,
          `Facts: ${facts.length > 0 ? facts.join('; ') : 'No specific facts known.'}`,
        ].join('\n');
      })
      .join('\n---\n');
  }

  private buildCombinedContext(
    semanticSnippets: string,
    peopleFacts: string,
  ): string {
    const parts = [
      'RETRIEVED MEMORY',
      semanticSnippets,
      '',
      'MATCHED PEOPLE',
      peopleFacts,
    ];

    const combined = parts.join('\n');
    return this.truncate(combined, RetrievalService.MAX_CONTEXT_CHARS);
  }

  private formatMetadata(metadata: Record<string, any>): string {
    if (!metadata || Object.keys(metadata).length === 0) {
      return '';
    }

    const compact = Object.entries(metadata)
      .slice(0, 6)
      .map(([key, value]) => `${key}=${this.stringifyMetadataValue(value)}`)
      .join(', ');

    return this.truncate(compact, 300);
  }

  private stringifyMetadataValue(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value);

    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  }

  private normalizeFacts(facts: unknown): string[] {
    if (Array.isArray(facts)) {
      return facts
        .map((fact) => (typeof fact === 'string' ? fact.trim() : String(fact)))
        .filter(Boolean);
    }

    if (typeof facts === 'string' && facts.trim()) {
      return [facts.trim()];
    }

    return [];
  }

  private toMetadataObject(value: unknown): Record<string, any> {
    if (!value) return {};

    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return { raw: value };
      }
    }

    return {};
  }

  private truncate(value: string, maxChars: number): string {
    if (!value) return '';
    if (value.length <= maxChars) return value;
    return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
  }
}
