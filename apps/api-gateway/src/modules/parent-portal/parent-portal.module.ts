import { Module } from '@nestjs/common';
import { FamilyContextService } from './auth/FamilyContextService';
import { FamilyContextGuard } from './auth/FamilyContext.guard';
import { FamilyQueryGateway } from './gateway/FamilyQueryGateway';
import { FamilyDashboardService } from './services/FamilyDashboardService';
import { ParentAuditService } from './services/ParentAuditService';
import { FinanceFacade } from './facades/FinanceFacade';
import { AttendanceFacade } from './facades/AttendanceFacade';
import { AssessmentFacade, AnnouncementFacade } from './facades/OtherFacades';
import { DashboardController } from './controllers/DashboardController';
import { ParentFinanceController } from './controllers/ParentFinanceController';
import { ParentEventsController } from './controllers/ParentEventsController';
// NOTE: Core Domain Services (like FinancialReportingReadService) must be exported from their 
// respective Domain Modules and imported here via standard NestJS imports.

import { ExaminationsModule } from '../examinations/examinations.module';

@Module({
  imports: [
    ExaminationsModule
    // FinanceModule, AttendanceModule, AcademicsModule, etc...
  ],
  controllers: [
    DashboardController,
    ParentFinanceController,
    ParentEventsController
  ],
  providers: [
    FamilyContextService,
    FamilyContextGuard,
    FamilyQueryGateway,
    FamilyDashboardService,
    ParentAuditService,
    FinanceFacade,
    AttendanceFacade,
    AssessmentFacade,
    AnnouncementFacade
  ],
  exports: []
})
export class ParentPortalModule {}
