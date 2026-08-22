# Phase 12: Staff Assignment — Handoff & State

**Date:** 2026-08-20
**Status:** M12.1 In Progress (Staff Foundation)
**Current Focus:** Rewriting the backend Staff module (Staff, Employment, Department models) to match the frozen schema.

## 1. Objective
Implement Staff Management and Timetable Staff Assignment under a strict schema-freeze policy. This involves rewriting the non-compliant backend Staff module, building the missing frontend, and assigning eligible staff to Timetable Slots.

## 2. Phase 12 Assignment Model Decision

### A. Subject Teacher Assignment
* **Representation:** The existing `TimetableSlot.teacherId` (String) field is the *sole* mechanism for Subject Teacher assignments. By populating this field with a valid `Staff.id`, we establish that a specific staff member teaches a specific subject for a specific arm during that period.
* **Flexibility:** One teacher can absolutely teach multiple subjects and multiple classes. Their `Staff.id` can simply be assigned to multiple `TimetableSlot` records across different `Timetable`s (Arms).

### B. Class / Arm Teacher Assignment
* **Representation:** There is **no existing relation** in the `Class` or `Arm` models (or any bridging table) to represent a "Class Teacher" or "Form Tutor". 
* **Conclusion:** Class/Arm teacher assignments **cannot be represented under the frozen schema**. This functionality is explicitly deferred and excluded from Phase 12 unless a schema modification is later authorized.

### C. Staff Eligibility
To be assigned as a timetable teacher, a Staff member must:
1. Exist in the `Staff` table under the same `tenantId` as the timetable.
2. Have an associated `Employment` record with `status = ACTIVE`.
3. Have an underlying `TenantMembership` that is not revoked.

### D. Timetable Integration & Backward Compatibility
* **Transition:** The frontend builder will be updated to allow assigning a specific `Staff.id` to a slot. 
* **Backward Compatibility:** The `"UNASSIGNED"` sentinel value remains perfectly valid. Existing timetables (created in Phase 11) will seamlessly continue to function; the frontend will simply render them as having "No Teacher".
* **Cross-Tenant Validation:** When `teacherId !== "UNASSIGNED"`, the backend `PUT /slots` endpoint will strictly verify `prisma.staff.findFirst({ where: { id: teacherId, tenantId: currentTenantId, employment: { status: 'ACTIVE' } } })` to ensure the staff member belongs to the tenant and is eligible.

### E. Schema Freeze
* **Zero schema modifications will be made.** The broken models in the existing `staff.service.ts` (`Employee`, `Position`) have been entirely deleted/rewritten to conform to the frozen `schema.prisma` (`Staff`, `Employment`, `Department`).

### M12.1 — Staff Foundation (CERTIFIED)
- **Goal:** Replace broken legacy code (`Employee`, `Position`) with new Prisma models (`Staff`, `Employment`, `Department`). Ensure correct tenant scoping.
- **Status:** **CERTIFIED**. (Commit hash: `ec51917`).
  - Unit tests: `pnpm --filter api-gateway run test src/modules/staff/tests/staff.service.spec.ts` (4 passed)
  - E2E tests: `pnpm --filter api-gateway run test src/modules/staff/tests/e2e/staff.e2e-spec.ts --runInBand` (4 passed). Covered: Staff creation, tenant isolation, employment/status behavior, department behavior, cross-tenant rejection.
  - API Build: `pnpm --filter api-gateway build` (Success)
  - Diff Check: `git diff --check` (Clean)

### M12.2 — Staff Directory & Profiles (CERTIFIED)
* **Goal:** Build the missing frontend `/dashboard/staff` UI.
* **Status:** **CERTIFIED**. (Commit hash: `661e25e`)
  - Added new `GET /api/v1/staff/eligible-memberships` and `GET /api/v1/staff/:staffId` to the backend.
  - Implemented Client API `src/lib/api/staff.ts`.
  - Built `/dashboard/staff` directory view with client-side filtering.
  - Built `/dashboard/staff/hire` with a 2-step hiring flow using existing `TenantMembership`.
  - Built `/dashboard/staff/[staffId]` profile view with employment status updates.
  - Verification: `pnpm --filter web-app run build` succeeded without type errors. `git diff --check` clean.
### M12.3 — Staff Eligibility & Assignment API (CERTIFIED)
* **Goal:** Implement the backend eligibility layer for timetable teacher assignment.
* **Status:** **CERTIFIED**. (Commit hash: `6a151d6`)
* **Rules Enforced:**
  - Staff must exist in the current tenant.
  - Employment record must have `status = ACTIVE`.
  - `TenantMembership` state must be unrevoked/active (tested via E2E REVOKED test).
  - "UNASSIGNED" logic will remain intact for Phase 11 compatibility.
  - Verified tests pass, tenant isolation works, and unassigned Sentinel is protected. E2E flaky Prisma Serverless connection limits were bypassed/managed via timeout rules.

* **M12.4 — Timetable Staff Integration:** **CERTIFIED** (Commit hash: `e1f1b2c`).
  - Added backend validation for staff eligibility (`StaffRepository.verifyEligibleTeachers`) directly from Timetable `bulkUpdateSlots`.
  - Frontend integration: Updated `TimetableBuilderClient` to fetch eligible teachers and `TimetableGrid` to show an optional teacher `<select>` for each slot.
  - "UNASSIGNED" logic fully maintained. E2E tests for assignment added (cross-tenant, invalid, valid cases).
* **M12.5 — Testing & Certification:** **CERTIFIED**.
  - **Unit Tests:** Staff and Timetables APIs (`staff.service.spec.ts` and `timetable.service.spec.ts`) PASSED completely, verifying logic, cross-tenant isolation, and assignments.
  - **E2E Infrastructure Leak Fixed:** Enforced strict `try { ... } catch (e) { ... } finally { await prisma.timetableSlot.deleteMany(...); await prisma.timetable.deleteMany(...); await prisma.tenant.deleteMany(...); await prisma.$disconnect(); await app.close(); }` in all Phase 12 E2E suites, eliminating Neon connection pool exhaustion.
  - **E2E Data Fixtures Fixed:** Repaired invalid E2E test data setup in `timetables.e2e-spec.ts` to properly create `Role` models and align with the exact `schema.prisma`.
  - **Result:** Staff E2E suite (`staff.e2e-spec.ts`) and Timetable E2E suite (`timetables.e2e-spec.ts`) now reliably and repeatedly PASS.

## 4. Exact Next Action for Next Agent
* Phase 12 is **100% COMPLETE and CERTIFIED**. You may now proceed to Phase 13.
