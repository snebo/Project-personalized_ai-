import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryEntry } from './entities/memory-entry.entity';

@Injectable()
export class MemoriesService {
  constructor(
    @InjectRepository(MemoryEntry)
    private readonly memoryRepo: Repository<MemoryEntry>,
  ) {}

  async createMemoryEntry(data: Partial<MemoryEntry>): Promise<MemoryEntry> {
    const memory = this.memoryRepo.create(data);
    return this.memoryRepo.save(memory);
  }

  async findByUser(user_id: string): Promise<MemoryEntry[]> {
    return this.memoryRepo.find({ where: { user_id } });
  }

  async findByEntity(entity_id: string, user_id: string): Promise<MemoryEntry[]> {
    return this.memoryRepo.find({ where: { entity_id, user_id } });
  }
}
