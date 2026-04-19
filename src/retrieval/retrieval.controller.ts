import { Body, Controller, Post } from '@nestjs/common';
import { RetrievalService } from './retrieval.service';
import { IsString } from 'class-validator';

export class ContextDTO {
  @IsString()
  text!: string;

  @IsString()
  conversation_id!: string;

  @IsString()
  user_id!: string;
}

@Controller('retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('context')
  async getContext(@Body() body: ContextDTO) {
    return this.retrievalService.getContext(
      body.user_id,
      body.conversation_id,
      body.text,
    );
  }
}
