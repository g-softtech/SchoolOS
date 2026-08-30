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
    
    this.logger.log(`Starting Layer 2 Analytical Projection Rebuild [Correlation: ${correlationId}]`);
    const snapshotDate = new Date();

    // Use Topological Sort (DAG) to ensure dependencies calculate first
    let analyticalMetrics = this.metricRegistry.getTopologicallySortedAnalyticalMetrics();
    
    if (incrementalScope?.metricName) {
      analyticalMetrics = analyticalMetrics.filter(m => m.metricName === incrementalScope.metricName);
    }

    const tenantWhere: any = incrementalScope?.tenantId ? { id: incrementalScope.tenantId } : { status: 'ACTIVE' };
    const tenants = await this.prisma.tenant.findMany({ where: tenantWhere });

    for (const tenant of tenants) {
      let rowsProcessed = 0;
      let rowsSkipped = 0;
      let hasError = false;
      const logs: string[] = [];

      // Create Job History Record per tenant
      const job = await this.prisma.scheduledJob.create({
        data: {
          tenantId: tenant.id,
          type: 'ANALYTICAL_PROJECTION_REBUILD',
          status: 'RUNNING',
          payload: {
            triggerType,
            correlationId,
            metricScope: incrementalScope?.metricName || 'ALL'
          },
          lastRunAt: new Date(),
          nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        }
      });

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
          logs.push(`Successfully rebuilt ${metric.metricName}`);
        } catch (error) {
          const errMsg = `Failed to rebuild ${metric.metricName} for Tenant ${tenant.id}: ${(error as any).message}`;
          this.logger.error(errMsg);
          logs.push(errMsg);
          hasError = true;
          rowsSkipped++;
        }
      }

      // Finalize Job
      await this.prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: hasError ? 'FAILED' : 'COMPLETED',
          logs: logs as any,
          payload: {
            triggerType,
            correlationId,
            metricScope: incrementalScope?.metricName || 'ALL',
            durationMs: Date.now() - startTime,
            rowsProcessed,
            rowsSkipped
          }
        }
      });
      
      this.logger.log(`Tenant ${tenant.id} rebuild complete [Job: ${job.id}]. Processed: ${rowsProcessed}, Skipped: ${rowsSkipped}`);
    }

    this.logger.log(`Layer 2 Analytical Projection Rebuild Complete [Correlation: ${correlationId}].`);
  }
}
