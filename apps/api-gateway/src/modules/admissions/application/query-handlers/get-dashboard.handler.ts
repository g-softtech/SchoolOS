import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAdmissionDashboardQuery } from '../queries/dashboard.queries';

@QueryHandler(GetAdmissionDashboardQuery)
export class GetAdmissionDashboardHandler implements IQueryHandler<GetAdmissionDashboardQuery> {
  // In a real application, you'd inject a specialized Projection Repository.
  // We're returning a default state here as the projection is not yet implemented in the schema.
  constructor() {}

  async execute(query: GetAdmissionDashboardQuery): Promise<any> {
    // Return a default healthy state since the projection table is pending
    return {
      tenantId: query.tenantId,
      totalApplications: 0,
      pendingReviews: 0,
      conversionRate: 0.0,
      healthStatus: 'HEALTHY',
      lastRebuild: null,
      projectionVersion: 1,
    };
  }
}
