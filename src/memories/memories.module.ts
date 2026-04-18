import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoriesService } from './memories.service';
import { MemoriesController } from './memories.controller';
import { MemoryEntry } from './entities/memory-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MemoryEntry])],
  controllers: [MemoriesController],
  providers: [MemoriesService],
  exports: [MemoriesService],
})
export class MemoriesModule {}
