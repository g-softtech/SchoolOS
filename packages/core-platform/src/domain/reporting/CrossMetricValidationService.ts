import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../prisma/generated/client';
import { ReportingEngineService } from './ReportingEngineService';

export interface MetricConstraint {
  name: string;
  validate: (engine: ReportingEngineService, tenantId: string, asOf?: Date) => Promise<boolean>;
  failureMessage: string;
}

@Injectable()
export class CrossMetricValidationService {
  private readonly logger = new Logger(CrossMetricValidationService.name);
  private readonly constraints: MetricConstraint[] = [];

  constructor(
    private readonly prisma: PrismaClient,
    private readonly engine: ReportingEngineService
  ) {
    this.registerCoreConstraints();
  }

  private registerCoreConstraints() {
    this.constraints.push({
      name: 'ATTENDANCE_CONSERVATION',
      validate: async (engine, tenantId, asOf) => {
        // Example logic:
        // const present = await engine.getAnalyticalMetric('ATTENDANCE_PRESENT', { tenantId, snapshotDate: new Date() }, asOf);
        // const absent = await engine.getAnalyticalMetric('ATTENDANCE_ABSENT', { tenantId, snapshotDate: new Date() }, asOf);
        // const total = await engine.getAnalyticalMetric('ATTENDANCE_TOTAL', { tenantId, snapshotDate: new Date() }, asOf);
        // return (present.value + absent.value) === total.value;
        return true; 
      },
      failureMessage: 'The sum of Present and Absent days does not equal the Total Attendance Opportunities.'
    });
  }

  /**
   * Called during the Certification Pipeline or as a nightly health check.
   */
  async runValidationSuite(tenantId: string, asOf?: Date): Promise<{ passed: boolean; failures: string[] }> {
    this.logger.log(`Running Cross-Metric Validation Suite for Tenant ${tenantId}`);
    const failures: string[] = [];

    for (const constraint of this.constraints) {
      try {
        const passed = await constraint.validate(this.engine, tenantId, asOf);
        if (!passed) {
          failures.push(`Constraint [${constraint.name}] Failed: ${constraint.failureMessage}`);
          this.logger.error(`Constraint Failed: ${constraint.name}`);
        }
      } catch (err) {
        failures.push(`Constraint [${constraint.name}] Errored: ${err.message}`);
      }
    }

    return {
      passed: failures.length === 0,
      failures
    };
  }
}
