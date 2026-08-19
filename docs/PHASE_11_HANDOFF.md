# Phase 11: Timetable Generation/Management — Handoff & State

**Date:** 2026-08-19
**Status:** Auditing & Proposal Generation
**Current Focus:** Phase 11 Audit & Planning (No production code modified yet)

## 1. Current Phase 11 Status
* **Audit Completed:** Examined existing `schema.prisma`, `Timetable`, `TimetableSlot`, `BellSchedule` models, and the stubbed `timetables` module in the API gateway.
* **Proposal Pending Approval:** Waiting for user sign-off on the Phase 11 execution plan before commencing implementation.

## 2. Files Inspected
* `packages/core-platform/prisma/schema.prisma` (for Timetable, TimetableSlot, BellSchedule structures)
* `apps/api-gateway/src/modules/timetables/*` (discovered basic, mostly stubbed backend module)
* `docs/PHASE_10_HANDOFF.md` and `MASTER_EXECUTION_PLAN.md` (for dependency & scope constraints)

## 3. Discoveries
1. **Schema Models Exist:** `BellSchedule` (JSON for periods), `Timetable` (arm/term relations + JSON config), `TimetableSlot` (maps slots to subjects and teachers).
2. **Phase 12 Overlap:** `TimetableSlot` requires a `teacherId` (scalar `String`, not a foreign key). Since Phase 12 (Staff Assignment) is strictly deferred, we must use a sentinel value like `"UNASSIGNED"` during Phase 11.
3. **Module State:** The existing `timetables.controller.ts` and `timetables.service.ts` are partially implemented with invalid Prisma field names (e.g., `academicTermId` instead of `termId`, `teachingDayId` which does not exist in schema). They will need a clean rewrite.

## 4. Decisions
* **Strict Scope:** Phase 11 will ONLY handle Bell Schedules, Timetables, and allocating Subjects to Time Slots for specific Classes/Arms.
* **Staff Assignments (Phase 12):** Will be bypassed with `"UNASSIGNED"` string in slots to strictly adhere to the project roadmap without requiring a schema change.
* **Schema Fixes:** We will NOT modify the schema. `Timetable.config` can be used if we need to link a `BellSchedule` to a `Timetable`, or we can do it purely at the UI level for generation.

## 5. Proposed Milestones
* **M11.1 Foundation & Bell Schedules:** API design, BellSchedule CRUD, tenant isolation.
* **M11.2 Timetable Grid Backend:** Timetable instantiation, batch TimetableSlot assignment, conflict validation.
* **M11.3 Frontend Bell Schedules:** UI for administrators to define periods and bell times.
* **M11.4 Frontend Timetable Builder:** Interactive grid UI to assign subjects to slots.
* **M11.5 Testing & Certification:** E2E Direct-Prisma validation and integration tests.

## 6. Unresolved Questions
* Should `Timetable` explicitly link to a `BellSchedule` ID inside its `config` JSON column, since there's no native relation in the schema? (Recommended: Yes, store `bellScheduleId` in `config`).

## 7. Exact Next Action for Next Agent
* Wait for the user to approve the `implementation_plan.md`.
* Once approved, execute **M11.1** (Bell Schedules backend implementation).
* DO NOT modify any code until the plan is approved.

## 8. Confirmation
* **NO PRODUCTION CODE HAS BEEN CHANGED.** This is purely an audit and documentation phase.
