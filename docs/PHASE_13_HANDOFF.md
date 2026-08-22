# Phase 13 Handoff: Attendance & Leave Management

## 1. Goal Description
The objective of Phase 13 was to build a robust, scalable, hybrid Attendance system mapping legacy attendance flows (Teacher Roll Call) and modern hardware integration flows (USB/Bluetooth ID Scanners) strictly utilizing the immutable Phase 5 `schema.prisma`. 

Additionally, Phase 13 handled the backend domain operations for **Staff Leave Management**.

## 2. Architecture & Components

### A. Staff Leave Management (M13.1)
- **Status:** Backend Complete, Frontend Missing
- **Components:** `LeaveService`, `LeaveController`, `LeaveRequest` schema bindings.
- **Workflow:** Submits requests into `PENDING` states, transitioning safely to `APPROVED` or `REJECTED` per role checks, with robust E2E verification of state logic. 
- **Limitation:** The Web UI for Leave was not scoped or implemented in this sprint.

### B. Hardware Scanner Integration (M13.2)
- **Status:** Complete (Backend + Frontend)
- **Components:** `ScannerService`, `ScannerController`, `ScannerComponent.tsx`.
- **Workflow:** 
  1. Captures decoded barcode/QR strings directly into a globally-listening headless input.
  2. Resolves Admission Numbers securely bound to the authenticated `tenantId`.
  3. Upserts an `Attendance` record with `PRESENT` and `remarks: "Arrival Scanned"`.
  4. Triggers `STUDENT_ARRIVED` or `STUDENT_PICKED_UP` domain events securely.
  5. Enqueues a notification via `NotificationQueue` for parents.
  
### C. Teacher Manual Roll Call (M13.3)
- **Status:** Complete (Backend + Frontend)
- **Components:** `StudentSearchService` (patched), `RollCallComponent.tsx`.
- **Workflow:**
  1. Authorized teachers select an Arm and Date.
  2. The backend efficiently returns the Arm's students and any existing Attendance records.
  3. UI safely merges lists. Unmarked students default to `NOT MARKED` to prevent silent accidental data pollution.
  4. Explicitly differentiates scanner-submitted attendance (`PRESENT - SCANNED AT GATE`) from manual input, triggering confirmation dialogues for tampering.
  5. Fully respects multi-tenant boundaries implicitly through `TenantMiddleware`.

## 3. Infrastructure & Constraints
- **Schema Frozen**: The `schema.prisma` was entirely untouched. No migrations were generated.
- **Notification Queue**: The domain events successfully enqueue payloads into `NotificationQueue` (e.g. `subject: 'Student Arrival'`). However, *active worker processing and physical SMS/WhatsApp dispatch remain unimplemented*.

## 4. Next Phase Recommendations
With Phase 13 complete, the platform is ready for **Phase 14: Examinations** or **Phase 15: Finance**, whichever is the priority. 
Additionally, dedicated sprints for the Staff Leave UI and the Notification Worker implementation can be scheduled in parallel.
