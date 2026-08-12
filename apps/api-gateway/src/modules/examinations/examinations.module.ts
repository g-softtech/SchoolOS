import { Module } from '@nestjs/common';
import { AssessmentSeriesService } from './services/assessment-series.service';
import { ExamCycleService } from './services/exam-cycle.service';
import { ExamResultService } from './services/exam-result.service';
import { CorePlatformModule } from '@saas/core-platform';

@Module({
  imports: [CorePlatformModule],
  providers: [
    AssessmentSeriesService,
    ExamCycleService,
    ExamResultService,
  ],
  exports: [
    AssessmentSeriesService,
    ExamCycleService,
    ExamResultService,
  ],
})
export class ExaminationsModule {}
