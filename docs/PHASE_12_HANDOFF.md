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
* **M12.3 — Staff Eligibility & Assignment API:** Implement API endpoints to determine and fetch which staff can be assigned as timetable teachers.
* **M12.4 — Timetable Staff Integration:** Update the Timetable Builder UI and backend validation to replace `"UNASSIGNED"` with real staff IDs.
* **M12.5 — Testing & Certification:** E2E validation, conflict checks, tenant isolation checks.

## 4. Exact Next Action for Next Agent
* **Implement M12.2 Staff Directory & Profiles:** Build the frontend components to list, filter, and view individual staff profiles from the `Staff` and `Employment` tables.
