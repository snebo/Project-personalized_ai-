import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum MemoryCategory {
  FACT = 'fact',
  PREFERENCE = 'preference',
  RELATIONSHIP = 'relationship',
  EMOTION = 'emotion',
}

export class CreateMemoryDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(MemoryCategory)
  @IsNotEmpty()
  category!: MemoryCategory;

  @IsUUID()
  @IsOptional()
  entity_id?: string;

  @IsUUID()
  @IsOptional()
  embedding_id?: string;
}
