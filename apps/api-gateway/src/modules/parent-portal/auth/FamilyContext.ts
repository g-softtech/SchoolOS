export interface FamilyContext {
  tenantId: string;
  guardianId: string;
  userId: string;
  studentIds: string[]; // Strict boundary: Any requested student MUST be in this array
  activeChildId?: string; // Optional: Support for Child Switching (viewing a single child)
  permissions: string[];
  capabilities: string[]; // e.g. VIEW_FINANCE, DOWNLOAD_REPORT_CARD
  activeAcademicSessionId?: string;
  featureFlags: Record<string, boolean>;
}
