export enum CredentialEventType {
  ISSUED = 'CredentialIssued',
  ACTIVATED = 'CredentialActivated',
  SUSPENDED = 'CredentialSuspended',
  VERIFIED = 'CredentialVerified',
  EXPIRED = 'CredentialExpired',
  REVOKED = 'CredentialRevoked',
  REPLACED = 'CredentialReplaced'
}

export interface CredentialEventPayload {
  tenantId: string;
  credentialId: string;
  userId: string;
  ownerType: string;
  occurredAt: Date;
}

export interface CredentialVerifiedEvent extends CredentialEventPayload {
  context: string;
  deviceId: string;
  result: 'SUCCESS' | 'DENIED';
  correlationId: string;
}

/**
 * Event Stream interface for the Credential Module.
 * Domain modules (Attendance, Library, Transport, Reporting) subscribe to these events
 * via the platform's EventBus rather than polling or validating logic directly.
 */
export interface ICredentialEventStream {
  publishEvent(eventType: CredentialEventType, payload: CredentialEventPayload): Promise<void>;
}
