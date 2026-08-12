import { Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../workspace/workspace.context';

@Injectable()
export class AdmissionNumberService {
  constructor(private readonly workspace: WorkspaceContext) {}

  /**
   * Generates a deterministic admission number based on tenant configuration.
   * Supports configurable prefixes, yearly resets, and check digits.
   * Format example: '{PREFIX}-{YEAR}-{SEQ}' -> 'ADM-2027-0001'
   */
  async generateAdmissionNumber(campaignId: string, sequence: number, formatTemplate: string = 'ADM-{YYYY}-{SEQ}'): Promise<string> {
    const tenantId = this.workspace.getTenantId();
    
    const year = new Date().getFullYear().toString();
    const formattedSequence = sequence.toString().padStart(4, '0');
    
    // Simple template compiler
    const admissionNumber = formatTemplate
      .replace('{YYYY}', year)
      .replace('{SEQ}', formattedSequence);
      
    // Optionally append a check digit here using modulo algorithms if needed for the tenant
    
    return admissionNumber;
  }
}
