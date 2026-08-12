import { AggregateRoot } from '@saas/core-platform';
import { AdmissionNumber } from '../value-objects/admission-number';
import { ApplicationStatus, ApplicationState } from '../value-objects/application-status';

export interface AdmissionApplicationProps {
  tenantId: string;
  campaignId: string;
  applicantId: string;
  admissionNumber?: AdmissionNumber;
  status: ApplicationStatus;
  submittedAt?: Date;
}

export class AdmissionApplication extends AggregateRoot<AdmissionApplicationProps> {
  private constructor(id: string, props: AdmissionApplicationProps, version: number = 0) {
    super(id, props, version);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get status(): ApplicationStatus {
    return this.props.status;
  }

  get admissionNumber(): AdmissionNumber | undefined {
    return this.props.admissionNumber;
  }

  public static create(id: string, props: AdmissionApplicationProps, version: number = 0): AdmissionApplication {
    return new AdmissionApplication(id, props, version);
  }

  // The workflow engine verified this transition is allowed. We just apply the state change and bump version.
  public changeStatus(newStatus: ApplicationState): void {
    this.props.status = ApplicationStatus.create(newStatus);
    if (newStatus === 'SUBMITTED') {
      this.props.submittedAt = new Date();
    }
    this.incrementVersion();
    
    // Domain Events would be dispatched by the handler after persistence.
  }

  public assignAdmissionNumber(admissionNumber: AdmissionNumber): void {
    this.props.admissionNumber = admissionNumber;
    this.incrementVersion();
  }
}
