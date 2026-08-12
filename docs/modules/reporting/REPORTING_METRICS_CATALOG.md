# SchoolOS Metrics Catalog
**Version 1.0.0**

This document serves as the absolute canonical registry for every metric exposed by the SchoolOS Reporting Engine. Any metric not listed here does not exist in the system.

## 1. Governance Principles
- **Single Owner:** Every metric must have exactly one canonical owner (e.g., AttendanceReporter).
- **Exact Formula:** The formula must be explicit and reproducible.
- **Certification Requirement:** No metric is exposed to an API without passing the Accuracy and Explainability certification gates.
- **Versioning:** If a formula changes structurally (e.g., Attendance policy shift), a new version of the metric must be registered (e.g., `ATTENDANCE_PERCENTAGE_V2`).

---

## 2. Attendance Metrics

```yaml
Metric:
  Name: ATTENDANCE_PERCENTAGE_V1
  DisplayName: Student Attendance %

Owner:
  Reporting (AttendanceReporter)

Canonical Source:
  Attendance Module (AttendanceRecord)

Formula:
  (Present Days + Excused Days) / (Total School Days) * 100

Refresh:
  Real-time (Operational Layer)

Dimensions:
  - Tenant
  - Campus
  - AcademicSession
  - Class
  - Student

Security:
  Family (For specific student)
  Restricted (For aggregate class data)

Consumers:
  - Parent Portal
  - Admin Dashboard
  - Student Portal

Certification:
  - Accuracy (Must match raw `AttendanceRecord` counts exactly)
  - Explainability
```

---

## 3. Finance Metrics

```yaml
Metric:
  Name: COLLECTION_RATE_V1
  DisplayName: Collection Rate

Owner:
  Reporting (FinanceReporter)

Canonical Source:
  Finance Module (FinancialTransaction Ledger)

Formula:
  Total Cleared Payments Received / Total Invoice Item Amounts Issued * 100

Refresh:
  Scheduled (Layer 2 Projection - Nightly)

Dimensions:
  - Tenant
  - Campus
  - AcademicSession
  - FeeType

Security:
  Restricted (Admin/Bursar only)

Consumers:
  - Executive Dashboard
  - Bursar Portal

Certification:
  - Accuracy
  - Isolation (Projection query must not lock the ledger)
```

```yaml
Metric:
  Name: OUTSTANDING_BALANCE_V1
  DisplayName: Outstanding Balance

Owner:
  Reporting (FinanceReporter)

Canonical Source:
  Finance Module (FinancialTransaction Ledger)

Formula:
  Sum of all DEBIT balances - Sum of all CREDIT balances for a Student's AR Account

Refresh:
  Real-time (Operational Layer)

Dimensions:
  - Tenant
  - Student

Security:
  Family
  Restricted

Consumers:
  - Parent Portal
  - Admin Dashboard

Certification:
  - Accuracy (Must match exact Trial Balance derivation)
  - Explainability
```

---

## 4. Assessment Metrics

```yaml
Metric:
  Name: CLASS_AVERAGE_SCORE_V1
  DisplayName: Class Average Score

Owner:
  Reporting (AssessmentReporter)

Canonical Source:
  Academics Module (AssessmentResult)

Formula:
  Sum(Published Assessment Scores) / Count(Published Assessment Scores)
  *NOTE: Excludes Draft or Unpublished results.*

Refresh:
  Scheduled (Layer 2 Projection)

Dimensions:
  - Tenant
  - AcademicSession
  - Class
  - Subject

Security:
  Restricted (Teachers, Admins)
  Family (Only compared against their own child's score)

Consumers:
  - Parent Portal (Report Cards)
  - Staff Portal (Class Analytics)

Certification:
  - Consistency
  - Accuracy
```
