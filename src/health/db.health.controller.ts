import { DbHealthService } from './db.health.service';
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: DbHealthService) {}

  @Get('db')
  checkDb() {
    return this.healthService.checkDatabase();
  }

  @Get('supabase')
  checkSupabase() {
    return this.healthService.checkSupabase();
  }

  @Get()
  checkAll() {
    return this.healthService.checkAll();
  }
}
