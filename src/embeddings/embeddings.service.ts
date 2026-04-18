import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}
  private logger = new Logger(EmbeddingsService.name);
  private pipe: any = null;

  async onModuleInit() {
    const { pipeline, env } = await (eval(
      `import('@huggingface/transformers')`,
    ) as Promise<any>);

    // Point to local models folder, disable remote fetching in dev
    if (this.config.get<string>('NODE_ENV') === 'development') {
      env.localModelPath = path.join(process.cwd(), 'hf_models/models');
      env.allowRemoteModels = false;
    }

    this.pipe = await pipeline('feature-extraction', 'gte-small'); // just the folder name
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
