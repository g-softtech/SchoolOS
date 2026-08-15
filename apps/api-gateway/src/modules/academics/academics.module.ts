import { Module } from '@nestjs/common';
import { AcademicCalendarController } from './controllers/academic-calendar.controller';
import { AcademicCalendarService } from './services/academic-calendar.service';
import { InstitutionalStructureController } from './controllers/institutional-structure.controller';
import { InstitutionalStructureService } from './services/institutional-structure.service';
import { PrismaModule } from '@saas/core-platform';

@Module({
  imports: [PrismaModule],
  controllers: [
    AcademicCalendarController,
    InstitutionalStructureController
  ],
  providers: [
    AcademicCalendarService,
    InstitutionalStructureService
  ],
  exports: [
    AcademicCalendarService,
    InstitutionalStructureService
  ],
})
export class AcademicsModule {}
