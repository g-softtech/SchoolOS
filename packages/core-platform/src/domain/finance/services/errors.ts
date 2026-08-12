export class LedgerImbalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerImbalanceError';
  }
}

export class ImmutableRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableRecordError';
  }
}

export class PeriodLockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PeriodLockedError';
  }
}

export class DuplicateTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateTransactionError';
  }
}
