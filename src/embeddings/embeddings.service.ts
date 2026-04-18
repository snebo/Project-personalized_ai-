import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private pipe: any = null;

  async onModuleInit() {
    // Dynamic import to handle ESM module in CJS project
    const { pipeline } = await (eval(`import('@huggingface/transformers')`) as Promise<any>);
    this.pipe = await pipeline('feature-extraction', 'Supabase/gte-small');
  }

  async generate(text: string): Promise<number[]> {
    if (!this.pipe) {
      await this.onModuleInit();
    }

    const output = await this.pipe(text, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data) as number[];
  }
}
