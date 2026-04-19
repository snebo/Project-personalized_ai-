import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogle } from '@langchain/google';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Observable } from 'rxjs';

@Injectable()
export class LlmService implements OnModuleInit {
  public model!: ChatGoogle;
  private chatPrompt!: ChatPromptTemplate;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.model = new ChatGoogle({
      apiKey: this.configService.getOrThrow<string>('GOOGLE_API_KEY'),
      model: this.configService.get<string>('GOOGLE_MODEL_NAME') || 'gemini-1.5-flash',
      maxOutputTokens: 2048,
    });

    // Define the prompt template with system and user messages
    this.chatPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are a helpful and empathetic diary assistant.\n\n' +
        'GUIDELINES:\n' +
        '1. Use the provided context (RELEVANT MEMORIES and KNOWN PEOPLE FACTS) to personalize your response.\n' +
        '2. Reference earlier facts when appropriate to show you remember the user.\n' +
        '3. STATED TRUTH: Only state facts provided in the context. If you are asked about something not in the context or conversation history, honestly admit that you do not know or do not have that information yet.\n' +
        '4. AVOID FABRICATION: Do not make up facts about people or past events.\n' +
        '5. Keep your responses conversational, supportive, and concise.\n\n' +
        '--- CONTEXT ---\n' +
        '{retrieval_context}',
      ],
      ['user', '{input}'],
    ]);
  }

  /**
   * Streams the chat response from Gemini using LangChain and Prompt Templates.
   */
  streamChat(input: string, retrieval_context: string): Observable<string> {
    return new Observable<string>((subscriber) => {
      (async () => {
        try {
          const chain = this.chatPrompt.pipe(this.model);
          const stream = await chain.stream({ input, retrieval_context });

          for await (const chunk of stream) {
            const content = chunk.content as string;
            if (content) {
              subscriber.next(content);
            }
          }
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }

  /**
   * Generates a single completion from Gemini using Prompt Templates.
   */
  async generateCompletion(input: string, retrieval_context: string): Promise<string> {
    const chain = this.chatPrompt.pipe(this.model);
    const response = await chain.invoke({ input, retrieval_context });
    return response.content as string;
  }
}
