import { IsString, IsOptional, IsNotEmpty, IsObject } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  title?: string;
}

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
