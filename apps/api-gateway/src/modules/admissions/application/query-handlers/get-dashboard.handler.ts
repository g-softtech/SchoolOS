import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAdmissionDashboardQuery } from '../queries/dashboard.queries';
import { PrismaClient } from '@saas/core-platform'; // Assuming prisma client is used

@QueryHandler(GetAdmissionDashboardQuery)
export class GetAdmissionDashboardHandler implements IQueryHandler<GetAdmissionDashboardQuery> {
  // In a real application, you'd inject a specialized Projection Repository instead of direct Prisma.
  // We're mocking the db client injection here for the reference architecture.
  constructor(private readonly prisma: PrismaClient) {}

  async execute(query: GetAdmissionDashboardQuery): Promise<any> {
    const projection = await this.prisma.admissionDashboardProjection.findUnique({
      where: { tenantId: query.tenantId },
    });

    if (!projection) {
      // If projection doesn't exist yet, return a default healthy state
      return {
        tenantId: query.tenantId,
        totalApplications: 0,
        pendingReviews: 0,
        conversionRate: 0.0,
        healthStatus: 'HEALTHY',
        lastRebuild: null,
      };
    }

    // Never access the transactional tables (e.g. `AdmissionApplication`) directly in a query handler!
    // We only serve data from the Projection table.
    return {
      tenantId: projection.tenantId,
      totalApplications: projection.totalApplications,
      pendingReviews: projection.pendingReviews,
      conversionRate: projection.conversionRate,
      healthStatus: projection.healthStatus,
      lastRebuild: projection.lastRebuild,
      projectionVersion: projection.projectionVersion,
    };
  }
}
