# Phase 13 Final Refinements: Attendance Database Update

This plan incorporates the final 8 architectural refinements into the Attendance schema and constitutional documents.

## Proposed Changes

### Constitutional Documents

#### [MODIFY] [ATTENDANCE_REQUIREMENTS.md](file:///c:/my_school_app/saas-platform/docs/modules/attendance/ATTENDANCE_REQUIREMENTS.md)
- Update session definitions to include `AttendanceSessionTemplate` vs `AttendanceSession`.
- Define hierarchical policies (Global -> School -> Session -> Register).
- Document strict QR validation rules (token only).
- Enforce the `Attendance.Leave.Approved` event-driven leave flow.
- Add future integration examples (Examinations, Finance, Transport, Hostel).

#### [MODIFY] [ATTENDANCE_DATABASE_DESIGN.md](file:///c:/my_school_app/saas-platform/docs/modules/attendance/ATTENDANCE_DATABASE_DESIGN.md)
- Add `AttendanceSessionTemplate` entity.
- Update `ScannerDevice` status enum to include `PENDING, ACTIVE, SUSPENDED, RETIRED, COMPROMISED`.
- Add `actorType` (USER, SYSTEM, SCANNER, IMPORT, API) to `AttendanceRecordHistory`.
- Update Register lifecycle to include `ARCHIVED`.

### Database Schema (Prisma)

#### [MODIFY] [schema.prisma](file:///c:/my_school_app/saas-platform/packages/core-platform/prisma/schema.prisma)
- Add `AttendanceSessionTemplate` model mapping `tenantId`, `name`, `templateType`, `policyId`, `recurrenceRule`.
- Update `AttendanceSession` to include an optional `templateId` foreign key.
- Update `AttendanceRecordHistory` to include `actorType` (String).
- Add `ARCHIVED` to the register status documentation.

## Verification Plan

### Automated Tests
- Run `npx prisma format` and `npx prisma generate` to validate the new schema.

> [!IMPORTANT]
> **User Review Required**
> Please review this final implementation plan for the 8 Attendance refinements. If approved, I will update the constitutional documents and apply the changes to the Prisma schema.
