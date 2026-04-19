import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogle } from '@langchain/google';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Observable } from 'rxjs';

@Injectable()
export class LlmService implements OnModuleInit {
  private model!: ChatGoogle;
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
        'You are a helpful and empathetic diary assistant. ' +
        'Your goal is to help the user reflect on their day, manage their memories, and track relationships with people they mention. ' +
        'Keep your responses conversational, supportive, and concise.',
      ],
      ['user', '{input}'],
    ]);
  }

  /**
   * Streams the chat response from Gemini using LangChain and Prompt Templates.
   */
  streamChat(input: string): Observable<string> {
    return new Observable<string>((subscriber) => {
      (async () => {
        try {
          // Create a chain: Prompt -> Model
          const chain = this.chatPrompt.pipe(this.model);
          
          const stream = await chain.stream({ input });

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
  async generateCompletion(input: string): Promise<string> {
    const chain = this.chatPrompt.pipe(this.model);
    const response = await chain.invoke({ input });
    return response.content as string;
  }
}
