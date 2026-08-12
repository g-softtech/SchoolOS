export type ExportFormat = 'PDF' | 'XLSX' | 'CSV' | 'JSON';

export interface ExportMetadata {
  generatedAt: Date;
  metricVersions: Record<string, string>; // e.g., { 'ATTENDANCE_PERCENTAGE': 'v1' }
  reportingPeriod: {
    startDate?: Date;
    endDate?: Date;
    sessionScope?: string;
  };
  tenantId: string;
  filtersApplied: Record<string, string>;
}

export interface ReportDefinition {
  reportId: string;
  sections: Array<{
    title: string;
    metrics: string[]; // List of metricNames
  }>;
  defaultTimeRange: string;
  permissions: string[];
}

export interface IExportService {
  /**
   * Centralized method to export any defined report to a specific format.
   * Ensures consistent styling, metadata inclusion, and calculation accuracy.
   */
  exportReport(
    format: ExportFormat,
    definition: ReportDefinition,
    metadata: ExportMetadata,
    data: any // The materialized data payload
  ): Promise<Buffer>;
}
