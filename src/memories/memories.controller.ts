import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateMemoryDto } from './dto/create-memory.dto';

@Controller('memories')
@UseGuards(AuthGuard)
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateMemoryDto) {
    return this.memoriesService.createMemoryEntry({
      ...dto,
      user_id: req.user.sub,
    });
  }

  @Get()
  findAll(@Request() req: any) {
    return this.memoriesService.findByUser(req.user.sub);
  }

  @Get('entity/:id')
  findByEntity(@Param('id') id: string, @Request() req: any) {
    return this.memoriesService.findByEntity(id, req.user.sub);
  }
}
