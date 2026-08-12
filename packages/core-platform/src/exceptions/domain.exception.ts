import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorDomain = 'IDENTITY' | 'FINANCE' | 'REPORTING' | 'CREDENTIALS' | 'PLATFORM';

export interface ExplainabilityPayload {
  code: string;
  reason: string;
  correlationId?: string;
  domain: ErrorDomain;
  timestamp?: string;
}

/**
 * Base class for all typed domain exceptions in the platform.
 * Enforces the Explainability payload standard.
 */
export class DomainException extends HttpException {
  constructor(
    public readonly domain: ErrorDomain,
    public readonly code: string,
    public readonly reason: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(reason, status);
  }
}

export class AuthenticationException extends DomainException {
  constructor(code: string, reason: string, status: HttpStatus = HttpStatus.UNAUTHORIZED) {
    super('IDENTITY', code, reason, status);
  }
}

export class AuthorizationException extends DomainException {
  constructor(
    code: string,
    reason: string,
    public readonly policyVersion?: string,
    public readonly capabilityVersion?: string,
    status: HttpStatus = HttpStatus.FORBIDDEN
  ) {
    super('IDENTITY', code, reason, status);
  }
}

export class LifecycleException extends DomainException {
  constructor(code: string, reason: string, status: HttpStatus = HttpStatus.CONFLICT) {
    super('IDENTITY', code, reason, status);
  }
}
