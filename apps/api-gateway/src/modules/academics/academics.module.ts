import { Module } from '@nestjs/common';
import { AcademicCalendarController } from './controllers/academic-calendar.controller';
import { AcademicCalendarService } from './services/academic-calendar.service';
import { PrismaModule } from '@saas/core-platform';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicCalendarController],
  providers: [AcademicCalendarService],
  exports: [AcademicCalendarService],
})
export class AcademicsModule {}
