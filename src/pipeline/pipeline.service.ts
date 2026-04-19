import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { StateGraph, START, END } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { LlmService } from '../llm/llm.service';
import { PeopleService } from '../people/people.service';
import { MemoriesService } from '../memories/memories.service';
import { ConversationsService } from '../conversations/conversations.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PipelineState, ExtractedData } from './pipeline.types';
import { MemoryCategory } from '../memories/dto/create-memory.dto';

@Injectable()
export class PipelineService implements OnModuleInit {
  private readonly logger = new Logger(PipelineService.name);
  private graph: any;

  constructor(
    private readonly llmService: LlmService,
    private readonly peopleService: PeopleService,
    private readonly memoriesService: MemoriesService,
    private readonly conversationsService: ConversationsService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  onModuleInit() {
    this.graph = this.createGraph();
  }

  private createGraph() {
    const workflow = new StateGraph<PipelineState>({
      channels: {
        user_id: { value: (a, b) => b },
        conversation_id: { value: (a, b) => b },
        message_id: { value: (a, b) => b },
        text: { value: (a, b) => b },
        extracted: { value: (a, b) => b },
        errors: { value: (a, b) => a.concat(b), default: () => [] },
      }
    });

    workflow.addNode('extract', this.extractNode.bind(this));
    workflow.addNode('store', this.storeNode.bind(this));

    workflow.addEdge(START, 'extract' as any);
    workflow.addEdge('extract' as any, 'store' as any);
    workflow.addEdge('store' as any, END);

    return workflow.compile();
  }

  /**
   * Node: Extract structured data from text
   */
  private async extractNode(state: PipelineState) {
    this.logger.log(`Extracting data for user ${state.user_id}`);
    
    const extractionSchema = z.object({
      people: z.array(z.object({
        name: z.string(),
        relationship: z.string().optional(),
        facts: z.array(z.string()),
      })).default([]),
      emotional_tone: z.array(z.string()).default([]),
      topics_discussed: z.array(z.string()).default([]),
      key_facts: z.array(z.string()).default([]),
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', 'Extract structured information from the user diary entry. Be concise and accurate.'],
      ['user', '{input}'],
    ]);

    try {
      const modelWithStructuredOutput = (this.llmService as any).model.withStructuredOutput(extractionSchema);
      const chain = prompt.pipe(modelWithStructuredOutput);
      
      const extracted = await chain.invoke({ input: state.text }) as ExtractedData;
      
      return { extracted };
    } catch (error: any) {
      this.logger.error(`Extraction node failed: ${error.message}`);
      return { 
        extracted: null, 
        errors: [`Extraction failed: ${error.message}`] 
      };
    }
  }

  /**
   * Node: Store extracted data and generate embeddings
   */
  private async storeNode(state: PipelineState) {
    if (!state.extracted) return {};

    this.logger.log(`Storing data for user ${state.user_id}`);
    const { extracted, user_id, conversation_id, text, message_id } = state;

    try {
      // 1. Process People
      for (const p of extracted.people) {
        const existing = await this.peopleService.findByNameAndUser(p.name, user_id);
        if (existing) {
          const mergedFacts = Array.from(new Set([...(existing.facts || []), ...p.facts]));
          await this.peopleService.update(existing.id, user_id, {
            relationship: p.relationship || existing.relationship,
            facts: mergedFacts,
            last_mentioned_at: new Date(),
          });
        } else {
          await this.peopleService.create({
            user_id,
            name: p.name,
            relationship: p.relationship,
            facts: p.facts,
          });
        }
      }

      // 2. Process Memory Entries & Embeddings
      const memoriesToStore = [
        ...extracted.key_facts.map(f => ({ content: f, category: MemoryCategory.FACT })),
        ...extracted.topics_discussed.map(t => ({ content: `Topic: ${t}`, category: MemoryCategory.FACT })),
      ];

      for (const mem of memoriesToStore) {
        const embedding = await this.embeddingsService.embedQuery(mem.content);
        
        const embRow = await this.conversationsService.insertEmbedding({
          user_id,
          conversation_id,
          content: mem.content,
          source: 'memory',
          embedding: `[${embedding.join(',')}]`,
        });

        await this.memoriesService.createMemoryEntry({
          user_id,
          content: mem.content,
          category: mem.category,
          embedding_id: embRow.id,
        });
      }

      // 3. Embed the original message
      const messageEmbedding = await this.embeddingsService.embedQuery(text);
      await this.conversationsService.insertEmbedding({
        user_id,
        conversation_id,
        message_id,
        content: text,
        source: 'message',
        embedding: `[${messageEmbedding.join(',')}]`,
      });

      return {};
    } catch (error: any) {
      this.logger.error(`Store node failed: ${error.message}`);
      return { errors: [`Store failed: ${error.message}`] };
    }
  }

  /**
   * Public entry point for message processing
   */
  async processMessage(user_id: string, conversation_id: string, content: string, message_id?: string) {
    try {
      this.logger.log(`Starting graph execution for user ${user_id}`);
      
      await this.graph.invoke({
        user_id,
        conversation_id,
        message_id,
        text: content,
        extracted: null,
        errors: [],
      });
      
      this.logger.log(`Graph execution completed for user ${user_id}`);
    } catch (error: any) {
      this.logger.error(`Graph execution failed: ${error.message}`);
    }
  }
}
