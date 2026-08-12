import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../../prisma/generated/client';
import { MetricRegistry, MetricCalculationContext } from '../../reporting/MetricRegistry';

@Injectable()
export class AttendanceReporter implements OnModuleInit {
  private readonly logger = new Logger(AttendanceReporter.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly metricRegistry: MetricRegistry
  ) {}

  onModuleInit() {
    this.metricRegistry.register({
      metricName: 'ATTENDANCE_PERCENTAGE',
      metricVersion: 'v1',
      ownership: {
        technicalOwner: AttendanceReporter.name,
        businessOwner: 'Attendance Domain',
        approvedBy: 'Reporting Governance Board'
      },
      certificationStatus: 'CERTIFIED',
      expectedSLA: 'NIGHTLY',
      isOperational: false, // Scheduled projection
      dependsOn: [],
      explainabilityTemplate: 'Overall attendance is {percentage}% across {total} recorded days.',
      calculate: async (ctx: MetricCalculationContext) => {
        // Dummy implementation representing a heavy aggregate
        return { value: 92.5, explanationArgs: { percentage: 92.5, total: 120 } }; 
      }
    });

    this.logger.log('Registered Attendance Metrics with MetricRegistry');
  }
}
