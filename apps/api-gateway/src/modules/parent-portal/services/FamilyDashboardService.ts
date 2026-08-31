import { Injectable } from '@nestjs/common';
import { FamilyContext } from '../auth/FamilyContext';
import { FamilyQueryGateway } from '../gateway/FamilyQueryGateway';
import { FinanceFacade } from '../facades/FinanceFacade';
import { AttendanceFacade } from '../facades/AttendanceFacade';
import { AssessmentFacade, AnnouncementFacade } from '../facades/OtherFacades';
import { FamilyDashboardView } from '../dto/ViewModels';

@Injectable()
export class FamilyDashboardService {
  constructor(
    private readonly gateway: FamilyQueryGateway,
    private readonly financeFacade: FinanceFacade,
    private readonly attendanceFacade: AttendanceFacade,
    private readonly assessmentFacade: AssessmentFacade,
    private readonly announcementFacade: AnnouncementFacade
  ) {}

  /**
   * Orchestrates the fetching of all dashboard cards in parallel.
   * Utilizes Promise.allSettled and the Query Gateway to guarantee response degradation
   * if any downstream service breaches its timeout budget or throws an error.
   */
  async getDashboard(context: FamilyContext): Promise<FamilyDashboardView> {
    
    // Child Switching: If the frontend requested a specific child, we filter the context
    // However, the requested child MUST still be part of the authorized studentIds list
    if (context.activeChildId && !context.studentIds.includes(context.activeChildId)) {
      throw new Error('Unauthorized: Requested child is not linked to this guardian context.');
    }
    
    const targetStudentIds = context.activeChildId ? [context.activeChildId] : context.studentIds;
    // We clone the context for downstream so it only processes the target student(s)
    const queryContext: FamilyContext = { ...context, studentIds: targetStudentIds };

    // E2E Correlation ID for this dashboard request
    const reqCorrelationId = `dash-${Date.now()}`;

    // Launch all queries in parallel, each protected by the Gateway's timeout budgets
    const [financeRes, attendanceRes, assessmentRes, announcementRes] = await Promise.all([
      
      this.gateway.executeSafely(
        () => this.financeFacade.getFamilyFinanceSummary(queryContext, reqCorrelationId),
        { timeoutMs: 15000, retries: 1, queryName: 'FinanceFacade' },
        reqCorrelationId
      ),

      this.gateway.executeSafely(
        () => this.attendanceFacade.getFamilyAttendanceSummary(queryContext, reqCorrelationId),
        { timeoutMs: 15000, retries: 2, queryName: 'AttendanceFacade' },
        reqCorrelationId
      ),

      this.gateway.executeSafely(
        () => this.assessmentFacade.getFamilyAssessments(queryContext, reqCorrelationId),
        { timeoutMs: 15000, retries: 1, queryName: 'AssessmentFacade' },
        reqCorrelationId
      ),

      this.gateway.executeSafely(
        () => this.announcementFacade.getFamilyAnnouncements(queryContext, reqCorrelationId),
        { timeoutMs: 15000, retries: 2, queryName: 'AnnouncementFacade' },
        reqCorrelationId
      )
    ]);

    const now = new Date();
    const dashboardVersion = now.toISOString(); // ETag for dashboard

    return {
      dashboardVersion,
      generatedAt: now,
      sourceStatus: 'FRESH',
      correlationId: reqCorrelationId,
      classification: 'FAMILY',
      finance: financeRes.data ? { ...financeRes.data, generatedAt: now, sourceStatus: 'FRESH', correlationId: reqCorrelationId, classification: 'CONFIDENTIAL' } : null,
      attendance: attendanceRes.data,
      assessments: assessmentRes.data,
      announcements: announcementRes.data,
      status: {
        finance: financeRes.status,
        attendance: attendanceRes.status,
        assessments: assessmentRes.status,
        announcements: announcementRes.status
      }
    };
  }
}
