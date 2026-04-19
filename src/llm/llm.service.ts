import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogle } from '@langchain/google';
import { Observable } from 'rxjs';

@Injectable()
export class LlmService implements OnModuleInit {
  private model!: ChatGoogle;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.model = new ChatGoogle({
      apiKey: this.configService.getOrThrow<string>('GOOGLE_API_KEY'),
      model: this.configService.get<string>('GOOGLE_MODEL_NAME') || 'gemini-1.5-flash',
      maxOutputTokens: 2048,
    });
  }

  /**
   * Streams the chat response from Gemini using LangChain.
   */
  streamChat(prompt: string): Observable<string> {
    return new Observable<string>((subscriber) => {
      (async () => {
        try {
          const stream = await this.model.stream(prompt);
          for await (const chunk of stream) {
            subscriber.next(chunk.content as string);
          }
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }

  /**
   * Generates a single completion from Gemini.
   */
  async generateCompletion(prompt: string): Promise<string> {
    const response = await this.model.invoke(prompt);
    return response.content as string;
  }
}
