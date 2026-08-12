export type MetricFreshness = 'FRESH' | 'STALE' | 'REBUILDING' | 'FAILED' | 'UNKNOWN';

export interface MetricValue<T> {
  value: T;
  freshness: MetricFreshness;
  explainabilityString?: string | null;
  lineage: {
    metricVersion: string;
    generatedAt: Date;
    lineageJobId: string | null;
  };
}

export interface ExecutiveDashboardReport {
  generatedAt: Date;
  campusId?: string;
  totalEnrollment: MetricValue<number>;
  overallAttendancePercentage: MetricValue<number>;
  totalRevenueCollected: MetricValue<number>;
  totalOutstandingBalance: MetricValue<number>;
  collectionRatePercentage: MetricValue<number>;
}

export interface StudentPerformanceReport {
  studentId: string;
  academicSessionId: string;
  attendancePercentage: MetricValue<number>;
  classAverageScore: MetricValue<number>;
  studentAverageScore: MetricValue<number>;
  classRank?: MetricValue<number>; // Depending on policy
}

export interface CampusComparisonReport {
  generatedAt: Date;
  campuses: Array<{
    campusId: string;
    campusName: string;
    enrollment: number;
    attendanceRate: number;
    revenue: number;
  }>;
}

// These DTOs represent the strictly typed Layer 4 API boundaries.
// The Parent Portal, Admin Portal, and mobile apps will consume these.
