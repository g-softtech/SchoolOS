import { Module } from '@nestjs/common';
import { ReportingModule } from '@saas/core-platform';
import { ReportingController } from './controllers/reporting.controller';

@Module({
  imports: [ReportingModule],
  controllers: [ReportingController],
})
export class ReportingApiModule {}
