# SchoolOS Finance Certification Standard

This document serves as the constitution for the Finance module. It defines the non-negotiable standards that **every** future change to Finance must satisfy. No feature, fix, or enhancement may be merged if it violates these principles. 

> **Constitutional Rule**: No Finance code may be merged unless the full Finance Certification Suite passes with 100% success.

Before the Finance module can be marked as **⚪ Certified Frozen**, the entire system must pass the 9-Level Certification Gate.

---

## The 11 Constitutional Principles

1. **All financial records are immutable.** 
   `JournalEntry`, `JournalEntryLine`, `Payment`, and `PaymentAllocation` records cannot be updated or hard-deleted. Corrections must be handled via reversing or adjusting entries.
2. **All balances are derived, never manually stored.** 
   Student Account balances, Credit Wallets, and General Ledger balances are strictly computed at runtime from immutable ledger activity.
3. **Every amount is explainable.** 
   The system must support an unbroken traceability chain: Balance -> Journal Entry -> Journal Line -> Financial Transaction -> Payment Allocation -> Payment -> Receipt -> Invoice -> Invoice Item -> Fee Structure.
4. **Double-entry accounting is mandatory.** 
   Every transaction must post balanced Debits and Credits (`Sum(Debits) === Sum(Credits)`).
5. **High-risk operations require approvals.** 
   Refunds, waivers, write-offs, invoice voids, plan renegotiations, and manual adjustments must pass through the `ApprovalEngineService`.
6. **All external integrations are idempotent.** 
   Gateway webhooks and payment processing callbacks must guarantee exact-once execution using transaction correlation IDs and idempotency keys.
7. **Every transaction carries a correlation ID.** 
   Every event spanning the application must carry a `correlationId` linking the `PaymentAttempt`, `Payment`, `PaymentAllocation`, `FinancialTransaction`, `JournalEntry`, and `Receipt`.
8. **No destructive deletes of financial records.** 
   Invoices, Payment Plans, and Schedules transition through statuses (e.g., `CANCELLED`, `VOID`, `SUPERSEDED`). They are never deleted.
9. **Reconciliation is mandatory for external settlements.** 
   Bank and gateway settlements must be reconciled. Unmatched transactions must surface as exceptions, never silently discarded.
10. **Every change must pass the finance certification pipeline.** 
    The automated tests (recovery, load, ledger integrity) must pass before release.
11. **Every financial action must be reconstructable from immutable records.**
    Without relying on cached balances, denormalized totals, or timeline projections. This keeps the ledger as the ultimate source of truth.

---

## The 9-Level Certification Gate

### Level 1 — Accounting Integrity (Must Pass 100%)
These are absolute invariants. A single failure here blocks release.
- [ ] Every journal entry balances exactly.
- [ ] No negative allocation unless it's a reversal.
- [ ] Ledger is immutable (No UPDATE/DELETE on Journal or Payment records).
- [ ] Trial Balance always equals zero.
- [ ] Account balances are derived—not stored.
- [ ] Closed accounting periods reject postings.
- [ ] Every payment has an auditable chain.
- [ ] Every refund is implemented as reversing entries.
- [ ] No orphan allocations, receipts, or invoices.

### Level 2 — Reliability (Production Failure Simulation)
- [ ] Server crashes halfway through posting recovers safely.
- [ ] Database connection lost mid-transaction reverts safely.
- [ ] Gateway callback delayed handles gracefully.
- [ ] Callback arrives twice (Idempotency check passes).
- [ ] Callback arrives 100 times (Only ONE payment, zero duplicates).
- [ ] Callback arrives out of order handles gracefully.

### Level 3 — Concurrency (Race Condition Prevention)
- [ ] 100 staff pay simultaneously.
- [ ] 500 parents pay simultaneously.
- [ ] 1000 webhook callbacks arrive together.
- [ ] 100 bursars issue invoices simultaneously.
- [ ] 50 refunds execute simultaneously.
*Expected:* Every result remains deterministic. No race conditions, double allocations, or lost updates.

### Level 4 — Explainability
For **every displayed amount**, the system must dynamically generate an unbroken, zero-math explanation string tracing back through:
`Fee Structure -> Invoice -> Invoice Item -> Payment -> Allocation -> Receipt -> Journal Entry -> Journal Line`

### Level 5 — Audit
Verify that corrections strictly use Adjustments, Reversals, Credit Notes, or Debit Notes. Historical UPDATE/DELETE is physically impossible for financial records.

### Level 6 — Performance (Realistic Load Latency)
- [ ] Student statement < 150 ms
- [ ] Balance lookup < 50 ms
- [ ] Receipt generation < 100 ms
- [ ] Allocation < 100 ms
- [ ] Ledger posting < 200 ms
- [ ] Explainability report < 500 ms
- [ ] Trial balance (10 million journal lines) < 5 s
*(Must track p95 and p99 latency, not just averages)*

### Level 7 — Security
- [ ] SQL injection, IDOR, Cross-tenant access blocked.
- [ ] Replay attacks and Forged gateway callbacks rejected.
- [ ] Expired webhook signature rejected.
- [ ] Tampered payload and Permission escalation blocked.
*Expected:* Every test must fail safely.

### Level 8 — Disaster Recovery
- [ ] Database restore and Server restart simulate flawlessly.
- [ ] Message queue replay and Duplicate event replay are fully idempotent.
*Expected:* The ledger after recovery must be **identical** to the ledger before failure.

### Level 9 — Period Closing Certification
- [ ] Cannot post into CLOSED or SOFT_CLOSED periods without valid adjustment workflow.
- [ ] Cannot reopen without approval.
- [ ] Year-end close transfers balances correctly.
- [ ] Trial balance before close exactly equals trial balance after close.
- [ ] Closing is idempotent.
- [ ] Closing survives crash recovery and concurrent requests.

---

## Finance Integrity Verification Service
The internal `FinanceIntegrityVerificationService` continuously verifies that the finance system remains internally consistent. It runs scheduled checks to detect imbalances, orphans, sequence gaps, closed-period violations, and cross-tenant leakage. 
If an invariant fails, it raises a critical alert and locks further posting until investigated.
