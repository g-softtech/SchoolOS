# Attendance Module Requirements

## 1. Executive Summary
The Attendance module is the authoritative system for recording presence, absence, and tardiness across SchoolOS. It provides a unified tracking engine designed to be reusable across contexts (Class, Staff Shift, Events) while cleanly decoupling the act of "recording attendance" from the underlying identity, scheduling, and reporting domains.

## 2. Bounded Context & Ownership

### Owns (Authoritative Source)
- **Attendance Records**: The canonical history of presence (Present, Absent, Late, Excused). Split between Staff and Students to maintain referential integrity.
- **Attendance Record History**: Immutable history of all status corrections and changes for auditability, capturing the `actorType` (USER, SYSTEM, SCANNER, IMPORT, API).
- **Scan Events**: The raw telemetry of physical token scans with diagnostic metadata.
- **Attendance Sessions & Templates**: `AttendanceSessionTemplate` defines the recurring configuration (e.g., Morning Assembly). `AttendanceSession` is the specific daily instance (e.g., 2026-09-01 Morning Assembly).
- **Attendance Registers**: A register is the ledger linking a specific owner/context (e.g., Class 1A, Security Shift) to a session instance.
- **Hierarchical Attendance Policies**: Configurable timing rules that cascade from Global → School → Session → Register to prevent duplication.
- **Scanner Device Registry**: Trusted hardware registry with a strict lifecycle (`PENDING`, `ACTIVE`, `SUSPENDED`, `RETIRED`, `COMPROMISED`).
- **Leave Requests**: Formal applications for planned absence.

### Does NOT Own
- **Identity & Credentials**: Staff owns `IdentityCredential`. The Attendance module calls `CredentialService.validateToken()` to authenticate scans. Attendance never decodes or generates credentials itself.
- **Students & Staff Profiles**: Owned by their respective modules. Attendance only stores reference IDs.
- **Timetables & Academics**: Owned by Timetables/Academics. Attendance asks Timetables "Which class should this teacher teach right now?" to automatically open the correct register.
- **QR Generation & Validation**: ID Card owns generation. The QR code must *never* contain employee details directly; it must only contain a cryptographically random token.
- **Reporting**: The Attendance module only exposes factual records. Dashboards and analytics belong to a future Reporting module. The Parent Portal must also consume events or reporting projections, never reading attendance tables directly.

## 3. Core Capabilities
- **Staff Gate Attendance**: Automated tracking of staff arrival/departure via identity tokens (QR, NFC, etc.).
- **Student Class Attendance**: Manual recording of student attendance by teachers using digital class registers.
- **Generic Registers & Sessions**: `AttendanceSessionTemplate` provides the recurring blueprint. `AttendanceSession` represents the block of time for a specific day.
- **Trusted Device Registry**: Scanners must be registered and authenticated before their telemetry is accepted. If a device is stolen, it is explicitly marked as `COMPROMISED`.
- **Policy-Driven Timing**: Lateness and auto-closure rules are externalized to hierarchical policies rather than hardcoded logic.
- **Leave Management**: LeaveRequest never updates attendance directly. Approved leave produces `Attendance.Leave.Approved` asynchronously, and an Attendance Listener processes it to create `EXCUSED` records.

## 4. Key Rules and Workflows
1. **Student QR Prohibition**: Students do not use QR codes or mobile phones for attendance. Student attendance is strictly manual (teacher-led).
2. **Staff QR Usage**: Staff use physical or digital credentials to log attendance at designated scan points. The QR only holds a random token. The flow is strictly: `QR -> Token -> Staff Module -> IdentityCredential -> Employee -> Attendance`.
3. **Pluggable Input Methods**: Attendance methods are extensible strings/lookups (e.g., `QR`, `MANUAL`, `ADMIN_OVERRIDE`, `IMPORT`, `RFID`, `NFC`, `BIOMETRIC`), not fixed enums. No schema changes are needed for new hardware.
4. **Register Lifecycle**: Registers progress through explicit states: `DRAFT → OPEN → SUBMITTED → LOCKED → ARCHIVED`. `ARCHIVED` registers become read-only historical records. Administrative reopening of a `LOCKED` register generates an audit event.
5. **Immutable Corrections**: Changing an attendance status (e.g. Absent → Excused) writes an immutable record to the history table for audit and dispute resolution, including the `actorType` (e.g. `USER`, `SYSTEM`, `SCANNER`).
6. **Scan Deduplication**: Duplicate scans within a configurable time window (e.g., 60 seconds) for the same employee are recorded in `ScanEvent` but do NOT create duplicate attendance records.
7. **Auditability**: Every attendance record must track the method (`QR`, `MANUAL`) and the user who recorded it. `ScanEvent` records track comprehensive hardware diagnostics (scanner ID, clock drift, rejection reasons).

## 5. Domain Events Published
To support decoupled downstream consumers (Reporting, Notifications, Parent Portal), the Attendance module publishes:
- `Attendance.Register.Opened`
- `Attendance.Register.Closed`
- `Attendance.Record.Created`
- `Attendance.Record.Updated`
- `Attendance.Scan.Accepted`
- `Attendance.Scan.Rejected`

## 6. Future Integrations
The generalized register design explicitly positions future consumers:
- **Examinations**: Verify candidate attendance before allowing entry by querying the exam's AttendanceRegister.
- **Finance**: Calculate payroll inputs from staff attendance records if the school enables the feature, entirely decoupled from Attendance.
- **Transport**: Reuse the attendance engine for bus boarding by defining a transport register type.
- **Hostel**: Reuse the engine for daily roll calls via hostel register types.
