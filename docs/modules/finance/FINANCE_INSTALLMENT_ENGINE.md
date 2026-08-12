# Finance Installment Engine

The Installment Engine treats multi-part payments as first-class citizens, ensuring that partial payments, penalties, and schedules are handled robustly without messy invoice division hacks.

## 1. Installment Configuration & Types
- **Configuration Flexibility**: Plans can be percentage-based (e.g., 40% deposit / 30% / 30%), fixed amount allocations, or customized schedules per student.
- **Independence**: An `InstallmentPlan` sits on top of an Invoice. The `InstallmentSchedule` represents the individual tranches.

## 2. Granular Payment Distribution & Reallocation
- **Partial Payments**: A payment can satisfy a single installment partially (e.g., paying 50% of the first installment).
- **Multiple Installments**: A single payment can satisfy multiple installments simultaneously.
- **Automatic Recalculation**: If a partial payment is made, or an early payment is received, the outstanding balances of the affected `InstallmentSchedule` entries must auto-recalculate instantly.

## 3. Timeline & Status Enforcement
- **Grace Periods & Penalties**: Installment schedules can carry individual grace periods. Configurable late penalties can be assessed if the grace period expires.
- **Early Payment**: Early payments are fully supported and must not incur penalties.
- **Status Independence**: Each `InstallmentSchedule` maintains its own status (`PENDING`, `PAID`, `OVERDUE`) independent of the master Invoice.

## 4. User-Friendly Breakdown (Transparency)
- **Extreme Transparency**: The parent/student must never have to guess their balance. The engine must expose data capable of rendering exact breakdowns:
  - Original Invoice amount
  - Discounts / Scholarships subtracted (with audit trail)
  - Previous payments subtracted
  - Total Outstanding
  - Current Installment Due (Amount + Date)
  - Next Installment Due (Amount + Date)
- **Granular Traceability**: Every discount, payment, and charge must be mapped back to a specific `InvoiceItem` so parents can see exactly how much they owe for Tuition vs Transport vs Library fines.
