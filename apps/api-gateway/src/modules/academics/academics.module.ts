import { Module } from '@nestjs/common';
import { AcademicCalendarController } from './controllers/academic-calendar.controller';
import { AcademicCalendarService } from './services/academic-calendar.service';
import { InstitutionalStructureController } from './controllers/institutional-structure.controller';
import { InstitutionalStructureService } from './services/institutional-structure.service';
import { StudentPlacementController } from './controllers/student-placement.controller';
import { StudentPlacementService } from './services/student-placement.service';
import { PrismaModule } from '@saas/core-platform';

@Module({
  imports: [PrismaModule],
  controllers: [
    AcademicCalendarController,
    InstitutionalStructureController,
    StudentPlacementController
  ],
  providers: [
    AcademicCalendarService,
    InstitutionalStructureService,
    StudentPlacementService
  ],
  exports: [
    AcademicCalendarService,
    InstitutionalStructureService,
    StudentPlacementService
  ],
})
export class AcademicsModule {}
