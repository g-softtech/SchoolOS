export interface ReportProvider {
  generatePdf(templateId: string, data: any): Promise<Buffer>;
  generateCsv(headers: string[], rows: any[][]): Promise<Buffer>;
}

export interface ProjectionRepository {
  getFunnelMetrics(tenantId: string, campaignId: string): Promise<any>;
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class AdmissionsReportService {
  constructor(
    private readonly reportProvider: ReportProvider,
    private readonly projectionRepo: ProjectionRepository
  ) {}

  async generateCampaignFunnelReport(tenantId: string, campaignId: string, format: 'pdf' | 'csv'): Promise<Buffer> {
    const metrics = await this.projectionRepo.getFunnelMetrics(tenantId, campaignId);
    
    if (format === 'pdf') {
      return this.reportProvider.generatePdf('admissions-funnel', metrics);
    } else {
      const headers = ['Stage', 'Count', 'Conversion Rate'];
      const rows = [
        ['Total Applications', metrics.total, '100%'],
        ['Submitted', metrics.submitted, `${(metrics.submitted/metrics.total)*100}%`],
        ['Approved', metrics.approved, `${(metrics.approved/metrics.submitted)*100}%`],
        ['Enrolled', metrics.enrolled, `${(metrics.enrolled/metrics.approved)*100}%`],
      ];
      return this.reportProvider.generateCsv(headers, rows);
    }
  }
}
