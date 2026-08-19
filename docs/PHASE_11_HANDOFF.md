# Phase 11: Timetable Generation/Management — Handoff & State

**Date:** 2026-08-19
**Status:** In Progress (M11.1 - Foundation & Bell Schedules Backend)
**Current Focus:** Implementing BellSchedule CRUD, defining DTOs, adding unit tests.

## 1. Current Phase 11 Status
* **Audit Completed:** Examined existing `schema.prisma`, `Timetable`, `TimetableSlot`, `BellSchedule` models, and the stubbed `timetables` module in the API gateway.
* **Proposal Approved:** The Phase 11 plan is approved. Proceeding with M11.1.

## 2. Files Inspected
* `packages/core-platform/prisma/schema.prisma` (for Timetable, TimetableSlot, BellSchedule structures)
* `apps/api-gateway/src/modules/timetables/*` (discovered basic, mostly stubbed backend module)
* `docs/PHASE_10_HANDOFF.md` and `MASTER_EXECUTION_PLAN.md` (for dependency & scope constraints)

## 3. Discoveries & Decisions
* **Strict Scope:** Phase 11 will ONLY handle Bell Schedules, Timetables, and allocating Subjects to Time Slots for specific Classes/Arms.
* **Staff Assignments (Phase 12):** Bypassed by using a sentinel value `"UNASSIGNED"` for `TimetableSlot.teacherId` (which is a required `String`). This constant will be centralized and flagged for Phase 12 replacement.
* **Class ID Derivation:** `TimetableSlot.classId` will be retrieved explicitly via the `Arm` → `Class` relationship during timetable generation, not trusted from client input.
* **Permissions & Events:** Existing project permission definitions and domain event conventions must be inspected and adopted. Do not invent unauthorized new permissions/event names.

## 4. Proposed Milestones
* **M11.1 Foundation & Bell Schedules:** API design, BellSchedule CRUD, tenant isolation, tests. (CURRENT)
* **M11.2 Timetable Grid Backend:** Timetable instantiation, batch TimetableSlot assignment, conflict validation.
* **M11.3 Frontend Bell Schedules:** UI for administrators to define periods and bell times.
* **M11.4 Frontend Timetable Builder:** Interactive grid UI to assign subjects to slots.
* **M11.5 Testing & Certification:** E2E Direct-Prisma validation and integration tests.

## 5. Unresolved Questions
* None currently.

## 6. Exact Next Action for Next Agent
* Audit existing permissions and domain events.
* Implement M11.1 (BellSchedule CRUD, DTOs, controllers, services).

## 8. Confirmation
* **NO PRODUCTION CODE HAS BEEN CHANGED.** This is purely an audit and documentation phase.
