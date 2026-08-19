import { Module } from '@nestjs/common';
import { BellSchedulesController } from './controllers/bell-schedules.controller';
import { BellScheduleService } from './services/bell-schedule.service';
import { BellScheduleRepository } from './repositories/bell-schedule.repository';
import { CorePlatformModule } from '@saas/core-platform';

@Module({
  imports: [CorePlatformModule],
  controllers: [BellSchedulesController],
  providers: [BellScheduleService, BellScheduleRepository],
  exports: [BellScheduleService],
})
export class TimetablesModule {}
