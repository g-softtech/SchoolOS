import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { PrismaClient } from '../../../prisma/generated/client';
import { MetricRegistry } from './MetricRegistry';

@Injectable()
export class AnalyticalProjectionService {
  private readonly logger = new Logger(AnalyticalProjectionService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly metricRegistry: MetricRegistry
  ) {}

  /**
   * Rebuilds Layer 2 Analytical Projections topologically.
   * Can be scoped incrementally (e.g. specific tenant or metric).
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async rebuildAnalyticalSnapshots(
    triggerType: 'SCHEDULED' | 'MANUAL' | 'EVENT_DRIVEN' = 'SCHEDULED',
    incrementalScope?: { tenantId?: string; metricName?: string }
  ) {
    const correlationId = randomUUID();
    const startTime = Date.now();
    
    // Create Job History Record
    const job = await this.prisma.reportingJob.create({
      data: {
        jobName: 'AnalyticalProjectionRebuild',
        status: 'RUNNING',
        triggerType,
        tenantScope: incrementalScope?.tenantId,
        correlationId,
        startedAt: new Date()
      }
    });

    this.logger.log(`Starting Layer 2 Analytical Projection Rebuild [Job: ${job.id}]`);
    const snapshotDate = new Date();

    // Use Topological Sort (DAG) to ensure dependencies calculate first
    let analyticalMetrics = this.metricRegistry.getTopologicallySortedAnalyticalMetrics();
    
    if (incrementalScope?.metricName) {
      // Filter if incremental metric rebuild requested
      analyticalMetrics = analyticalMetrics.filter(m => m.metricName === incrementalScope.metricName);
    }

    const tenantWhere = incrementalScope?.tenantId ? { id: incrementalScope.tenantId } : { status: 'ACTIVE' };
    const tenants = await this.prisma.tenant.findMany({ where: tenantWhere });

    let rowsProcessed = 0;
    let rowsSkipped = 0;
    let hasError = false;

    for (const tenant of tenants) {
      for (const metric of analyticalMetrics) {
        try {
          const calcStart = Date.now();
          const { value, explanationArgs } = await metric.calculate({
            tenantId: tenant.id,
            snapshotDate
          });
          const calcDuration = Date.now() - calcStart;

          // Construct Explainability String
          let explainabilityString = metric.explainabilityTemplate;
          if (explanationArgs) {
            for (const [key, val] of Object.entries(explanationArgs)) {
              explainabilityString = explainabilityString.replace(`{${key}}`, String(val));
            }
          }

          // Immutable Snapshot creation
          await this.prisma.$transaction(async (tx) => {
            // Supersede older versions
            await tx.metricSnapshot.updateMany({
              where: {
                tenantId: tenant.id,
                metricName: metric.metricName,
                isLatest: true
              },
              data: {
                isLatest: false,
                supersededAt: new Date()
              }
            });

            // Insert new version with Full Lineage
            await tx.metricSnapshot.create({
              data: {
                tenantId: tenant.id,
                metricName: metric.metricName,
                metricVersion: metric.metricVersion,
                value,
                snapshotDate: new Date(),
                isLatest: true,
                generatedBy: 'SYSTEM',
                lineageId: job.id,
                calculationDurationMs: calcDuration,
                explainabilityString
              }
            });
          });

          rowsProcessed++;
        } catch (error) {
          this.logger.error(`Failed to rebuild ${metric.metricName} for Tenant ${tenant.id}: ${error.message}`);
          hasError = true;
          rowsSkipped++;
        }
      }
    }

    // Finalize Job
    await this.prisma.reportingJob.update({
      where: { id: job.id },
      data: {
        status: hasError ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        finishedAt: new Date(),
        durationMs: Date.now() - startTime,
        rowsProcessed,
        rowsSkipped
      }
    });

    this.logger.log(`Layer 2 Analytical Projection Rebuild Complete [Job: ${job.id}]. Processed: ${rowsProcessed}, Skipped: ${rowsSkipped}`);
  }
}
