import { Module } from '@nestjs/common';
import { DbHealthService } from './db.health.service';
import { HealthController } from './db.health.controller';

@Module({
  controllers: [HealthController],
  providers: [DbHealthService],
})
export class HealthModule {}
