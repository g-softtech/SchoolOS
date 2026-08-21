import { Module } from '@nestjs/common';
import { BellSchedulesController } from './controllers/bell-schedules.controller';
import { TimetablesController } from './controllers/timetables.controller';
import { BellScheduleService } from './services/bell-schedule.service';
import { TimetableService } from './services/timetable.service';
import { BellScheduleRepository } from './repositories/bell-schedule.repository';
import { TimetableRepository } from './repositories/timetable.repository';
import { CorePlatformModule } from '@saas/core-platform';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [CorePlatformModule, StaffModule],
  controllers: [BellSchedulesController, TimetablesController],
  providers: [
    BellScheduleService,
    BellScheduleRepository,
    TimetableService,
    TimetableRepository,
  ],
  exports: [BellScheduleService, TimetableService],
})
export class TimetablesModule {}
