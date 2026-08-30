import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricRegistry } from './MetricRegistry';
import { ReportingEngineService } from './ReportingEngineService';
import { AnalyticalProjectionService } from './AnalyticalProjectionService';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    MetricRegistry,
    ReportingEngineService,
    AnalyticalProjectionService
  ],
  exports: [
    ReportingEngineService,
    AnalyticalProjectionService,
    MetricRegistry
  ]
})
export class ReportingModule {}
