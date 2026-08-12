# SchoolOS Finance Operational Runbook

This runbook serves as the definitive guide for administrators, bursars, and engineers operating the SchoolOS Finance Module in production. It defines the exact standard operating procedures (SOPs) for daily reconciliation, month/year closing, disaster recovery, and incident response.

---

## 1. Daily Operations

### 1.1 How to Reconcile Payments
1. Navigate to **Finance > Bank Reconciliation**.
2. Upload the daily settlement CSV from Paystack or the bank statement.
3. The `ReconciliationService` will automatically run its rules engine and match exactly (Reference & Amount).
4. Review the "Reconciled" total vs "Exceptions" total.

### 1.2 How to Resolve Unmatched Transactions (Exceptions)
1. Navigate to the **Reconciliation Exceptions** tab.
2. For each exception (e.g., `AMOUNT_MISMATCH`, `MISSING_REFERENCE`), click **Resolve**.
3. The system will display Match Candidates. Select the correct `Payment`.
4. Add a mandatory `Resolution Note`. The system will link the statement line to the payment and update the exception to `RESOLVED`.

### 1.3 How to Monitor Failed Webhooks
1. Navigate to **System Admin > Webhook Logs**.
2. Filter by `status: FAILED` and `topic: finance.*`.
3. The system ensures Idempotency. Verify the `reference` against the `PaymentAttempt` table to confirm if it was truly missed or if it failed due to a duplicate attempt.

### 1.4 How to Rerun Failed Jobs
1. Open the **Background Jobs** dashboard.
2. Locate the failed job (e.g., `Installment.Overdue.Processor`).
3. Click **Retry**. The jobs are designed to be idempotent and will safely resume without double-applying penalties.

### 1.5 How to Verify Gateway Synchronization
1. Run the `FinanceIntegrityVerificationService` check for `GHOST_RECEIPTS`.
2. Compare the total daily successful transactions in Paystack against the total `SUCCESS` Payments recorded in SchoolOS for that day.

---

## 2. Month End Operations

### 2.1 Closing Checklist
- [ ] Ensure all bank and gateway settlements for the month are fully reconciled.
- [ ] Ensure no open `ReconciliationExceptions` remain.
- [ ] Process all pending Refunds or Waivers via the `ApprovalEngineService`.
- [ ] Run the `FinanceIntegrityVerificationService` health audit to ensure no imbalances.

### 2.2 Trial Balance Verification
1. Navigate to **Finance Reports > Trial Balance**.
2. Select the current Accounting Period.
3. Verify that `Total Debits === Total Credits` exactly.

### 2.3 Exception Review
Review all `ReconciliationException` instances resolved during the month to ensure resolution notes are accurate and compliant with school policy.

### 2.4 Soft Closing the Period
1. Navigate to **Accounting Periods**.
2. Select the current month and click **Soft Close**.
3. This prevents automated postings but allows Bursars to execute final manual Adjustments via workflows.

### 2.5 Hard Closing the Period
1. Once all adjustments are complete, click **Hard Close**.
2. The period transitions to `CLOSED`. No further postings are allowed.

---

## 3. Year End Operations

### 3.1 Year Close Procedure
1. Complete all Month-End procedures for the final month (Month 12).
2. Navigate to **Year End Close**.
3. Execute the formal Year Close. The system will automatically generate the closing journal entries to zero out revenue/expense accounts into Retained Earnings.
4. The period transitions to `YEAR_CLOSED` and is permanently frozen.

### 3.2 Opening a New Accounting Year
1. Navigate to **Accounting Periods > New Fiscal Year**.
2. Generate the 12 new periods. They will initially be in `SCHEDULED` status.
3. Open Period 1.

### 3.3 Archive Policy
Data in `YEAR_CLOSED` periods remains queryable forever. It is never physically deleted, adhering to Constitutional Rule #8.

---

## 4. Disaster Recovery

> **Constitutional Guarantee**: The ledger after recovery must be **identical** to the ledger before failure.

### 4.1 Database Restore
1. Restore the PostgreSQL volume from the latest Point-In-Time Recovery (PITR) backup.
2. Because balances are dynamically derived (Rule #2), no cache invalidation or recalculation scripts are required. The system is immediately healthy.

### 4.2 Webhook / Queue Replay
1. Re-configure the gateway to replay webhooks from the timestamp of the crash.
2. The `PaymentProcessingService` uses idempotency keys (`PaymentAttempt` reference). If a webhook was already processed before the crash, it will be safely ignored. No duplicate payments or receipts will be created.

### 4.3 Ledger Verification
After any disaster recovery, immediately run the `FinanceIntegrityVerificationService` to confirm `LEDGER_IMBALANCE == 0`.

---

## 5. Incident Response

### 5.1 Customer Paid Twice
**Symptoms**: A parent accidentally transferred money twice for the same invoice.
**Response**: 
1. The first payment automatically settles the invoice.
2. The second payment is recorded, but since the invoice outstanding is `0`, the `PaymentAllocationService` routes the excess to the student's **Credit Wallet**.
3. The parent can use this wallet for future fees, or the Bursar can initiate a `REFUND` Approval Workflow to return the excess.

### 5.2 Gateway Timed Out Mid-Transaction
**Symptoms**: Parent is charged, but SchoolOS shows `PENDING`.
**Response**: 
1. Do nothing manually. Wait for the asynchronous webhook. 
2. When the webhook arrives, the `PaymentProcessingService` will safely progress the state to `CAPTURED`, post the ledger, and issue the receipt.

### 5.3 Receipt Missing
**Symptoms**: Payment is `SUCCESS` but no receipt generated.
**Response**: 
1. Check the `FinancialAuditService` for `GHOST_RECEIPTS` or broken chains. 
2. Because receipt generation is the *final* step of the ACID transaction, if it is missing, the transaction likely rolled back. Check webhook logs for failure reasons.

### 5.4 Bank Imported Duplicate Statement
**Symptoms**: The same CSV was uploaded twice.
**Response**: 
The `ReconciliationService` will flag all lines as `DUPLICATE_PAYMENT_REFERENCES` or fail uniqueness constraints on the statement reference. Discard the duplicate import batch.

### 5.5 Accounting Period Accidentally Closed
**Symptoms**: A Bursar accidentally clicked Hard Close prematurely.
**Response**: 
1. A user with `ADMIN` role must initiate a `Reopen Period` Request.
2. This creates an `ApprovalWorkflow`.
3. Once the Principal (or defined authority) approves the workflow, the `FinancialClosingEngine` transitions the period back to `OPEN`.
