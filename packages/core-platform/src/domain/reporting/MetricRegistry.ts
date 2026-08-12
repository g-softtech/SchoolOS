import { Injectable, Logger } from '@nestjs/common';

export interface MetricCalculationContext {
  tenantId: string;
  campusId?: string;
  sessionId?: string;
  classId?: string;
  studentId?: string;
  snapshotDate: Date;
}

export type MetricCertificationStatus = 'DRAFT' | 'TESTING' | 'CERTIFIED' | 'DEPRECATED';
export type MetricSLA = '30_SECONDS' | 'REAL_TIME' | 'HOURLY' | 'NIGHTLY' | 'WEEKLY' | 'END_OF_TERM';
export type MetricGranularity = 'OPERATIONAL' | 'DAILY' | 'MONTHLY' | 'YEARLY';

export interface MetricOwnership {
  technicalOwner: string; // e.g., 'AttendanceReporter'
  businessOwner: string;  // e.g., 'Attendance Domain'
  approvedBy: string;     // e.g., 'Reporting Governance Board'
}

export interface MetricDefinition {
  metricName: string;         // e.g., 'ATTENDANCE_PERCENTAGE'
  metricVersion: string;      // e.g., 'v1'
  ownership: MetricOwnership;
  certificationStatus: MetricCertificationStatus;
  expectedSLA: MetricSLA;
  isOperational: boolean;     // If true, it's calculated live. If false, it's a scheduled projection.
  dependsOn: string[];        // Array of metricNames this metric depends on (DAG)
  explainabilityTemplate: string; // Plain language template
  calculate: (context: MetricCalculationContext) => Promise<{ value: number; explanationArgs?: Record<string, string | number> }>;
}

@Injectable()
export class MetricRegistry {
  private readonly logger = new Logger(MetricRegistry.name);
  private readonly metrics = new Map<string, MetricDefinition>();

  /**
   * Domain Reporters call this method to register their metrics on startup.
   */
  register(definition: MetricDefinition): void {
    if (definition.certificationStatus === 'DRAFT' || definition.certificationStatus === 'TESTING') {
      this.logger.warn(`Registering uncertified metric ${definition.metricName}. It may not be available in production API endpoints.`);
    }

    if (this.metrics.has(definition.metricName)) {
      this.logger.warn(`Metric ${definition.metricName} is already registered. Overwriting with new definition from ${definition.ownership.technicalOwner}.`);
    }
    this.metrics.set(definition.metricName, definition);
    this.logger.debug(`Registered Metric: ${definition.metricName} (Owner: ${definition.ownership.technicalOwner}, Status: ${definition.certificationStatus})`);
  }

  getMetric(metricName: string): MetricDefinition {
    const metric = this.metrics.get(metricName);
    if (!metric) {
      throw new Error(`Metric ${metricName} is not registered in the MetricRegistry. Governance Violation.`);
    }
    return metric;
  }

  getAllAnalyticalMetrics(): MetricDefinition[] {
    return Array.from(this.metrics.values()).filter(m => !m.isOperational);
  }

  /**
   * Returns analytical metrics sorted topologically based on their dependencies (DAG).
   * Ensures dependencies are calculated before the metrics that rely on them.
   */
  getTopologicallySortedAnalyticalMetrics(): MetricDefinition[] {
    const analyticals = this.getAllAnalyticalMetrics();
    const sorted: MetricDefinition[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (metricName: string) => {
      if (visited.has(metricName)) return;
      if (visiting.has(metricName)) {
        throw new Error(`Cycle detected in Metric Dependency Graph involving: ${metricName}`);
      }

      visiting.add(metricName);
      
      const metric = this.metrics.get(metricName);
      if (metric) {
        for (const dep of metric.dependsOn) {
          visit(dep);
        }
        if (!metric.isOperational) {
          sorted.push(metric);
        }
      }
      
      visiting.delete(metricName);
      visited.add(metricName);
    };

    for (const m of analyticals) {
      visit(m.metricName);
    }

    return sorted;
  }
}
