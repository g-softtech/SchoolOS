# Admissions Module: Test Plan

Before the Admissions Module is marked as **Frozen**, it must pass all defined tests in this specification. The testing strategy enforces the 12-Step Lifecycle and strict enterprise requirements for the platform.

## 1. Functional Tests
- **Workflow Transitions:** Verify that an application correctly transitions from one custom `AdmissionWorkflowStage` to the next based on tenant configuration.
- **Form Builder Verification:** Ensure dynamic `AdmissionField` answers are correctly validated against `isRequired` and `type` constraints.
- **Document Rules Enforcement:** Assert that an application cannot be submitted until all mandatory `RequiredDocument`s for that tenant are uploaded.
- **Admission Number Generation:** Assert that the `AdmissionNumberService` correctly generates identifiers following the school's configured pattern (e.g., `PRI-00054`) without collisions.

## 2. Permission Tests
- Verify that users without `VIEW_ADMISSIONS` cannot read campaign data.
- Verify that only users with `REVIEW_APPLICATIONS` can transition an application stage or submit a review.
- Assert that `SUPER_ADMIN` overrides function exactly as modeled in the Authorization Engine.

## 3. Policy Tests
- **Campaign Rules:** Verify that applications cannot be created if the `AdmissionCampaign` is `CLOSED` or if the `endDate` has passed.
- **Capacity Rules:** Assert that a campaign correctly halts new applications if the `maxApplicants` threshold is breached.

## 4. Analytics Tests
- Assert that the `ApplicationSubmitted`, `ApplicationReviewed`, and `ApplicationEnrolled` domain events successfully reach the Event Bus.
- Verify that querying the `GET /api/admissions/analytics/dashboard` calculates Acceptance Rate and Rejection Rate correctly based on test data.

## 5. Audit Tests
- Assert that changing an application's stage successfully inserts an `AuditLog` entry.
- Assert that uploading a document triggers an `AuditLog` mapping the actor (`userId`) and the entity (`applicationId`).

## 6. Migration Tests (Post-Freeze)
- **Mapper:** Verify the legacy data mapper correctly transforms old application rows into the new `AdmissionApplication` and `AdmissionDocument` models.
- **Dry-Run Validation:** Run the migration script in dry-run mode and assert zero data loss or constraint violations.

## 7. Report Tests
- Verify the standard **Admission Statistics** report generates accurately aggregated counts of applications grouped by status and campaign.

## 8. Widget Tests
- Assert the **Acceptance Funnel** widget correctly calculates the drop-off from Draft -> Submitted -> Accepted -> Enrolled for a tenant.

## 9. Performance Tests
- Verify that large payload submissions (with extensive custom fields) are validated in `< 200ms`.
- Ensure querying applications with multiple joins (campaign, workflow stage, applicant) returns in `< 100ms` via proper DB indices.

## 10. Security Tests
- Verify tenant isolation: A user in Tenant A must never be able to read or transition an application belonging to Tenant B.
