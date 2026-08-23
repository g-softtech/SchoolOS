// Core Platform Exports

// Application Layer
export * from './responses/api-response';
export * from './pagination/pagination-options';
export * from './api/client';

// Infrastructure Layer
export * from './tenant';
export * from './exceptions/domain.exception';
export * from './exceptions/global-exception.filter';
export * from './domain/policy.types';
export * from './domain/access-context.types';
export * from './domain/audit';
export * from './domain/events';
export { AggregateRoot, Entity, ValueObject } from './domain';

// Prisma generated client re-export
export * from '../prisma/generated/client';

// Providers
export * from './providers/platform-event-bus';
export * from './providers/platform-storage.service';
export * from './providers/prisma.service';
export * from './providers/prisma.module';
export * from './providers';

// Finance Domain Services
export * from './domain/finance/services/errors';
export * from './domain/finance/services/FinancialLedgerService';
export * from './domain/finance/services/StudentCreditService';
export * from './domain/finance/services/InvoiceService';
export * from './domain/finance/services/PaymentAllocationService';
export * from './domain/finance/services/PaymentProcessingService';
export * from './domain/finance/services/TransferService';
export * from './domain/finance/services/RefundService';
export * from './domain/finance/services/GatewayWebhookService';
export * from './domain/finance/services/ReconciliationService';
export * from './domain/finance/services/FinancialReportingReadService';
export * from './domain/finance/services/FinanceIntegrityVerificationService';
export * from './domain/finance/services/allocation/AllocationStrategy';
export * from './domain/finance/services/allocation/OldestFirstStrategy';
export * from './domain/finance/services/allocation/PriorityFirstStrategy';

// Document Domain Services
export * from './domain/documents/services/DocumentService';
export * from './domain/documents/services/IdCardService';

// Library Domain Services
export * from './domain/library/services/BookService';
export * from './domain/library/services/CirculationService';
export * from './domain/library/services/FineService';
