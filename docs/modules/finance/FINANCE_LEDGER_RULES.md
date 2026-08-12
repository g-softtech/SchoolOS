# Finance Ledger Rules

The `FinancialLedgerEntry` is the heart of the Finance module. To ensure 100% financial accuracy, auditability, and safety, the following rules must be strictly adhered to in all implementations.

## 1. Immutable Accounting
- **No Deletion**: Ledger entries, Payments, and Receipts can never be deleted or mutated once written.
- **Double-Entry Mandate**: Every monetary movement must have a matching effect. A payment applies a credit to the student account and a debit elsewhere (or closes out an existing debit).
- **Balance Computation**: Balances (total charges, total paid, outstanding) must NEVER be stored as a mutable static field. They must always be derived dynamically by aggregating `debit` and `credit` values from the ledger.

## 2. Idempotency & Duplicate Prevention
- **Unique Transaction References**: Every payment transaction must possess a unique gateway reference or internal idempotency key.
- **Duplicate Callback Protection**: If a gateway (e.g., Paystack) fires a webhook multiple times due to a network timeout, the idempotency key must safely ignore the duplicate payload, preventing duplicate ledger entries.
- **Concurrency Locking**: Optimistic or pessimistic locking must be used when processing payments, issuing receipts, or applying refunds to ensure two simultaneous transactions don't corrupt the ledger.

## 3. Credits & Refunds
- **Credits over Deletion**: If a parent overpays, the excess amount remains as a Credit Balance on the ledger. It is never "deleted" or "reset." This credit is available to offset future invoices.
- **Refund Workflows**: Reversing a payment must create a new `Refund` entity and a corresponding ledger entry to offset the original payment.

## 4. Required Approvals & Audit Trails
- **Auditable Actions**: The following actions require an explicit approval workflow (capturing the approver's ID, timestamp, and reason):
  - Refunds
  - Large discounts or fee waivers
  - Invoice cancellations
  - Manual balance adjustments
  - Backdated payments

## 5. Real-Time Propagation
- **Synchronous Updates**: A payment received must immediately reflect in the Ledger.
- **Event Broadcasting**: The moment the ledger updates, Finance must publish domain events (e.g., `Finance.Payment.Received`, `Finance.Ledger.Updated`). Downstream dashboards, Parent Portals, and Cashier UI must reflect this instantly. No nightly CRON jobs for basic reconciliation.
