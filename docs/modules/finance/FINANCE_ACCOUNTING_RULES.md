# Finance Accounting Rules

To support rigorous financial reporting, auditing, and multi-campus operation without future redesigns, the Finance module strictly separates basic student accounts from true General Ledger (GL) accounting.

## 1. General Ledger & Chart of Accounts
- **Chart of Accounts (CoA)**: Standardized structure of accounts (Assets, Liabilities, Equity, Revenue, Expenses).
- **GL Account**: Specific accounting codes (e.g., "1001 - Cash in Bank", "4001 - Tuition Revenue").
- **Journal Entry (JE)**: The root accounting transaction. Every financial event (Payment, Invoice, Refund) generates a balanced Journal Entry.
- **Journal Entry Line**: The debit/credit components of a JE. The sum of debits must always equal the sum of credits.
- **Accounting Period & Fiscal Year**: Financial data is bound to specific periods. Periods can be 'OPEN', 'CLOSED', or 'LOCKED'. Once a period is locked, no Journal Entries can be added or modified for that date range.

## 2. Receivables vs. Collections
- **Receivables (AR)**: Charges create receivables. When an invoice is issued, it debits Accounts Receivable and credits Revenue.
- **Collections**: Payments settle receivables. When cash is collected, it debits Cash and credits Accounts Receivable.
- **Reconciliation**: A dedicated submodule (or external context) will reconcile bank statements and gateway settlements against the cash collections in the GL.

## 3. Currency & Precision
- **Currency Code**: All monetary fields must be accompanied by a currency code (e.g., NGN, USD).
- **Precision**: Money is tracked using exact decimal precision. Rounding rules strictly follow standard accounting practices (half-up).
- **Future-proofing**: The schema supports exchange rate history for future multi-currency scaling.

## 4. Multi-Campus & Allocation Policies
- **Inheritance vs Override**: Fee structures are defined at the Tenant level but can be overridden or scoped specifically to a Campus.
- **Allocation Rules**: Payments against an account with multiple invoices are resolved using configurable policies:
  1. Oldest Overdue First
  2. Mandatory Fees First (Tuition > Transport > Optional)
  3. Custom allocation

## 5. Scheduled Jobs
Finance operations that rely on time instead of user events run via idempotent scheduled jobs:
- Overdue reminders and status transitions
- Late penalty calculation
- Installment maturity
- Automatic invoice generation (e.g., monthly hostel fees)
- Scholarship/Subsidy expiry
