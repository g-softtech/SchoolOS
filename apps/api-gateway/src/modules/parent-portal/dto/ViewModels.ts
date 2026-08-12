export type DataClassification = 'PUBLIC' | 'FAMILY' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface BaseBffResponse {
  generatedAt: Date;
  expiresAt?: Date;
  sourceStatus: 'FRESH' | 'CACHED' | 'DEGRADED';
  correlationId: string;
  classification: DataClassification;
}

// -----------------------------------------------------------------------------
// FINANCE DTOs
// -----------------------------------------------------------------------------

export interface FamilyFinanceSummaryView extends BaseBffResponse {
  totalOutstanding: number;
  totalPaidThisTerm: number;
  currency: string;
  children: ChildFinanceSummary[];
  upcomingInstallments: InstallmentView[];
  lastPayment?: PaymentSummaryView;
}

export interface ChildFinanceSummary {
  studentId: string;
  firstName: string;
  totalOutstanding: number;
  // Note: Explanation strings instead of raw equations (Parent Experience Principle)
  explanations: string[]; 
}

export interface InstallmentView {
  dueDate: Date;
  amount: number;
  description: string; // e.g. "Term 2 Tuition - Part 1"
  status: 'PENDING' | 'OVERDUE';
}

export interface PaymentSummaryView {
  date: Date;
  amount: number;
  method: string;
  reference: string;
}

// -----------------------------------------------------------------------------
// ATTENDANCE DTOs
// -----------------------------------------------------------------------------

export interface ChildAttendanceCard extends BaseBffResponse {
  studentId: string;
  firstName: string;
  todayStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'NOT_RECORDED';
  termPercentage: number;
  recentAbsences: number;
  accessibility: {
    attendanceDescription: string;
    statusDescription: string;
  };
}

// -----------------------------------------------------------------------------
// ASSESSMENT DTOs
// -----------------------------------------------------------------------------

export interface AssessmentSummaryCard extends BaseBffResponse {
  studentId: string;
  firstName: string;
  recentResults: AssessmentResultView[];
  reportCardsAvailable: number;
}

export interface AssessmentResultView {
  subject: string;
  grade: string; // e.g. "A", "B+"
  score?: number; 
  publishedAt: Date;
  teacherRemark?: string;
}

// -----------------------------------------------------------------------------
// ANNOUNCEMENT DTOs
// -----------------------------------------------------------------------------

export interface AnnouncementCard extends BaseBffResponse {
  id: string;
  title: string;
  summary: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  publishedAt: Date;
  read: boolean;
}

// -----------------------------------------------------------------------------
// TIMELINE DTOs
// -----------------------------------------------------------------------------

export interface FamilyTimelineEvent {
  time: Date;
  childName?: string;
  eventDescription: string; // e.g. "Joshua checked in", "Payment received"
  type: 'ATTENDANCE' | 'FINANCE' | 'ACADEMIC' | 'COMMUNICATION';
}

export interface FamilyTimelineView extends BaseBffResponse {
  events: FamilyTimelineEvent[];
}

// -----------------------------------------------------------------------------
// DASHBOARD AGGREGATE DTO
// -----------------------------------------------------------------------------

export interface DomainHealthStatus {
  status: 'OK' | 'DEGRADED' | 'UNAVAILABLE';
  reason?: string;
  retryAfterSeconds?: number;
}

export interface FamilyDashboardView extends BaseBffResponse {
  dashboardVersion: string; // ETag
  
  finance: FamilyFinanceSummaryView | null; // Null if degraded
  attendance: ChildAttendanceCard[] | null;
  assessments: AssessmentSummaryCard[] | null;
  announcements: AnnouncementCard[] | null;
  
  status: {
    finance: DomainHealthStatus;
    attendance: DomainHealthStatus;
    assessments: DomainHealthStatus;
    announcements: DomainHealthStatus;
  };
}
