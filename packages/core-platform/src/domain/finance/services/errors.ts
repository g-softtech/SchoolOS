export class FinanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinanceError';
  }
}

export class LedgerImbalanceError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerImbalanceError';
  }
}

export class ImmutableRecordError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableRecordError';
  }
}

export class PeriodLockedError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'PeriodLockedError';
  }
}

export class NoPeriodFoundError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'NoPeriodFoundError';
  }
}

export class DuplicateTransactionError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateTransactionError';
  }
}

export class InvalidJournalLineError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidJournalLineError';
  }
}

export class InsufficientFundsError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

export class OverAllocationError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'OverAllocationError';
  }
}

export class TenantMismatchError extends FinanceError {
  constructor(message: string) {
    super(message);
    this.name = 'TenantMismatchError';
  }
}
