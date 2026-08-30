import { Controller, Get, Post, Param, Req, ForbiddenException, Logger } from '@nestjs/common';
import { 
  ReportingEngineService, 
  AnalyticalProjectionService,
  MetricValue,
  ExecutiveDashboardReport,
  StudentPerformanceReport,
  CampusComparisonReport
} from '@saas/core-platform';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';

@Controller('v1/reports')
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(
    private readonly reportingEngine: ReportingEngineService,
    private readonly projectionService: AnalyticalProjectionService
  ) {}

  @Get('executive')
  @RequirePermission('reporting.view')
  async getExecutiveReport(@Req() req: any): Promise<ExecutiveDashboardReport> {
    const tenantId = req.headers['x-tenant-id'] as string;
    const ctx = { tenantId, snapshotDate: new Date() };

    // Fetch the metrics concurrently
    const [enrollment, attendance, revenue, outstanding, collection] = await Promise.all([
      this.reportingEngine.getAnalyticalMetric('ENROLLMENT_COUNT', ctx).catch(() => ({ value: 0, explainabilityString: 'Not configured' })),
      this.reportingEngine.getAnalyticalMetric('OVERALL_ATTENDANCE', ctx).catch(() => ({ value: 0, explainabilityString: 'Not configured' })),
      this.reportingEngine.getAnalyticalMetric('TOTAL_REVENUE', ctx).catch(() => ({ value: 0, explainabilityString: 'Not configured' })),
      this.reportingEngine.getOperationalMetric('OUTSTANDING_BALANCE', ctx).catch(() => ({ value: 0, explainabilityString: 'Not configured' })),
      this.reportingEngine.getAnalyticalMetric('COLLECTION_RATE', ctx).catch(() => ({ value: 0, explainabilityString: 'Not configured' }))
    ]);

    const toMetric = (res: any, status: 'FRESH' | 'STALE' = 'FRESH'): MetricValue<number> => ({
      value: res.value || 0,
      freshness: status,
      explainabilityString: res.explainabilityString,
      lineage: {
        metricVersion: res.metricVersion || 'v1',
        generatedAt: res.generatedAt || new Date(),
        lineageJobId: res.lineageJobId || null
      }
    });

    return {
      generatedAt: new Date(),
      totalEnrollment: toMetric(enrollment),
      overallAttendancePercentage: toMetric(attendance),
      totalRevenueCollected: toMetric(revenue),
      totalOutstandingBalance: toMetric(outstanding),
      collectionRatePercentage: toMetric(collection)
    };
  }

  @Get('student/:studentId')
  @RequirePermission('reporting.view')
  async getStudentReport(@Req() req: any, @Param('studentId') studentId: string): Promise<StudentPerformanceReport> {
    const tenantId = req.headers['x-tenant-id'] as string;
    const ctx = { tenantId, studentId, snapshotDate: new Date() };

    const [attendance, outstanding] = await Promise.all([
      this.reportingEngine.getAnalyticalMetric('STUDENT_ATTENDANCE', ctx).catch(() => ({ value: 0, explainabilityString: 'Not configured' })),
      this.reportingEngine.getOperationalMetric('OUTSTANDING_BALANCE', ctx).catch(() => ({ value: 0, explainabilityString: 'Not configured' }))
    ]);

    const toMetric = (res: any): MetricValue<number> => ({
      value: res.value || 0,
      freshness: 'FRESH',
      explainabilityString: res.explainabilityString,
      lineage: {
        metricVersion: res.metricVersion || 'v1',
        generatedAt: res.generatedAt || new Date(),
        lineageJobId: res.lineageJobId || null
      }
    });

    return {
      studentId,
      academicSessionId: 'current',
      attendancePercentage: toMetric(attendance),
      classAverageScore: toMetric({ value: 0, explainabilityString: 'Not implemented yet' }),
      studentAverageScore: toMetric({ value: 0, explainabilityString: 'Not implemented yet' })
    };
  }

  @Get('campus')
  @RequirePermission('reporting.view')
  async getCampusComparisonReport(@Req() req: any): Promise<CampusComparisonReport> {
    return {
      generatedAt: new Date(),
      campuses: []
    };
  }

  @Post('jobs/rebuild')
  @RequirePermission('reporting.manage')
  async triggerRebuild(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] as string;
    await this.projectionService.rebuildAnalyticalSnapshots('MANUAL', { tenantId });
    return { success: true, message: 'Rebuild completed for tenant' };
  }
}
