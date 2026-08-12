import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../prisma/generated/client';
import { MetricRegistry } from './MetricRegistry';

export interface ExplainabilityResponse {
  metricName: string;
  metricVersion: string;
  value: number;
  explainabilityString: string | null;
  lineage: {
    generatedAt: Date;
    generatedBy: string | null;
    calculationDurationMs: number | null;
    lineageJobId: string | null;
    sourceOwner: string;
  };
  confidence: 'FRESH' | 'STALE' | 'UNKNOWN';
}

@Injectable()
export class MetricExplainabilityService {
  private readonly logger = new Logger(MetricExplainabilityService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly metricRegistry: MetricRegistry
  ) {}

  /**
   * Explains a specific metric snapshot instance
   */
  async explainMetricSnapshot(snapshotId: string): Promise<ExplainabilityResponse> {
    const snapshot = await this.prisma.metricSnapshot.findUnique({
      where: { id: snapshotId }
    });

    if (!snapshot) {
      throw new Error(`MetricSnapshot ${snapshotId} not found.`);
    }

    const metricDef = this.metricRegistry.getMetric(snapshot.metricName);

    // Determine Freshness (e.g., if it's over 24 hours old, mark STALE)
    const ageMs = Date.now() - snapshot.generatedAt.getTime();
    const isStale = ageMs > 24 * 60 * 60 * 1000;

    return {
      metricName: snapshot.metricName,
      metricVersion: snapshot.metricVersion,
      value: snapshot.value,
      explainabilityString: snapshot.explainabilityString,
      lineage: {
        generatedAt: snapshot.generatedAt,
        generatedBy: snapshot.generatedBy,
        calculationDurationMs: snapshot.calculationDurationMs,
        lineageJobId: snapshot.lineageId,
        sourceOwner: metricDef.owner,
      },
      confidence: isStale ? 'STALE' : 'FRESH'
    };
  }
}
