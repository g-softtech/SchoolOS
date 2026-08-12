import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../prisma/generated/client';
import { MetricRegistry, MetricCalculationContext } from './MetricRegistry';

@Injectable()
export class ReportingEngineService {
  private readonly logger = new Logger(ReportingEngineService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly metricRegistry: MetricRegistry
  ) {}

  /**
   * Layer 1: Operational Reporting
   * Fetches the metric live from the domain reporter (No persistence).
   */
  async getOperationalMetric(metricName: string, context: MetricCalculationContext): Promise<{ value: number; explainabilityString: string }> {
    const metric = this.metricRegistry.getMetric(metricName);
    
    if (!metric.isOperational) {
      throw new Error(`Metric ${metricName} is an Analytical metric. It must be queried from Layer 2 (Snapshots), not Operational.`);
    }

    // Call the domain reporter to perform the real-time calculation
    const result = await metric.calculate(context);
    
    // Construct explainability string
    let explainabilityString = metric.explainabilityTemplate;
    if (result.explanationArgs) {
      for (const [key, val] of Object.entries(result.explanationArgs)) {
        explainabilityString = explainabilityString.replace(`{${key}}`, String(val));
      }
    }

    return { value: result.value, explainabilityString };
  }

  /**
   * Layer 2: Projection Reporting
   * Queries the canonical reporting storage (`MetricSnapshot`).
   * Supports Time Travel (asOf) via immutable historical snapshots.
   */
  async getAnalyticalMetric(
    metricName: string, 
    context: MetricCalculationContext,
    asOf?: Date
  ): Promise<{ value: number; explainabilityString: string | null }> {
    const metric = this.metricRegistry.getMetric(metricName);

    // Governance: Ensure only CERTIFIED metrics are routinely queried
    if (metric.certificationStatus !== 'CERTIFIED') {
      this.logger.warn(`Querying uncertified metric: ${metricName} (${metric.certificationStatus})`);
    }

    if (metric.isOperational) {
      this.logger.warn(`Querying Operational metric ${metricName} from Layer 2. This is allowed but typically it is fetched live.`);
    }

    // Time Travel Logic: If an asOf date is provided, we ignore `isLatest = true`.
    // Instead we find the snapshot generated on or before `asOf` 
    // that was NOT superseded before `asOf`.
    const timeTravelWhere = asOf ? {
      snapshotDate: { lte: asOf },
      OR: [
        { supersededAt: null },
        { supersededAt: { gt: asOf } }
      ]
    } : { isLatest: true };

    // Retrieve from the snapshot table (Canonical Reporting Persistence)
    const snapshot = await this.prisma.metricSnapshot.findFirst({
      where: {
        tenantId: context.tenantId,
        metricName,
        ...timeTravelWhere,
        campusId: context.campusId,
        sessionId: context.sessionId,
        classId: context.classId,
        studentId: context.studentId
      },
      orderBy: { snapshotDate: 'desc' }
    });

    if (!snapshot) {
      return { value: 0, explainabilityString: null };
    }

    return { value: snapshot.value, explainabilityString: snapshot.explainabilityString };
  }
}
