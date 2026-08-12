export interface ReadModel {
  readonly viewId: string;
  readonly lastUpdatedAt: Date;
  readonly version: number;
}

export interface AdmissionDashboardProjection extends ReadModel {
  tenantId: string;
  totalApplications: number;
  pendingReviews: number;
  conversionRate: number;
  enrollmentFunnel: {
    stageId: string;
    stageName: string;
    count: number;
  }[];
}

export interface AdmissionReviewerProjection extends ReadModel {
  tenantId: string;
  reviewerId: string;
  assignedCount: number;
  completedCount: number;
  avgTurnaroundTimeMs: number;
}
