import { IsString, IsOptional, IsNotEmpty, IsArray } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  relationship?: string;

  @IsArray()
  @IsOptional()
  facts?: any[];
}

export class UpdatePersonDto extends PartialType(CreatePersonDto) {}
