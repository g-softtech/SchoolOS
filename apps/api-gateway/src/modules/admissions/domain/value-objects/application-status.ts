import { ValueObject } from '@saas/core-platform/domain';

export type ApplicationState = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ENROLLED';

interface ApplicationStatusProps {
  state: ApplicationState;
}

export class ApplicationStatus extends ValueObject<ApplicationStatusProps> {
  private constructor(props: ApplicationStatusProps) {
    super(props);
  }

  get value(): ApplicationState {
    return this.props.state;
  }

  public static create(state: ApplicationState): ApplicationStatus {
    return new ApplicationStatus({ state });
  }

  public canTransitionTo(newState: ApplicationState): boolean {
    // In a real CQRS setup, this logic can be informed by the Workflow Engine SDK
    if (this.props.state === 'REJECTED' || this.props.state === 'ENROLLED') {
      return false; // Terminal states
    }
    return true; 
  }
}
