# Attendance Database Design

## Design Principles
- **Multi-tenancy**: Every core entity MUST include `tenantId`.
- **Target Segregation**: Student and Staff attendance records are split into separate tables (`StudentAttendanceRecord`, `StaffAttendanceRecord`) to avoid nullable dual foreign keys, simplify constraints, and optimize indexes.
- **Auditability**: Every record must track the input method and the user who recorded it.

## Entity Relational Schema

### 1. AttendancePolicy
Configurable timing rules and grace periods.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `name` | String | e.g. "Standard Class Policy", "Staff Morning Shift" |
| `lateAfterMinutes` | Int | Lateness threshold |
| `autoCloseAfterMinutes` | Int? | Optional auto-close threshold |
| `deduplicationWindowSeconds` | Int | e.g. 60. Ignore repeated scans within this window |

*Index: `(tenantId)`*

### 2. ScannerDevice
Trusted hardware registry. Only registered devices can submit scans.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `name` | String | e.g. "Main Gate Turnstile 1" |
| `location` | String? | |
| `status` | Enum | PENDING, ACTIVE, SUSPENDED, RETIRED, COMPROMISED |
| `sharedSecret` | String | Hashed secret for authentication |
| `lastHeartbeatAt` | DateTime? | |

*Index: `(tenantId, status)`*

### 3. AttendanceSessionTemplate
The recurring blueprint for a session.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `name` | String | e.g. "Morning Assembly" |
| `templateType` | String | e.g. ASSEMBLY, TIMETABLE_PERIOD |
| `policyId` | UUID | FK → AttendancePolicy (Optional override) |
| `recurrenceRule` | String | e.g. "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" |

*Index: `(tenantId)`*

### 4. AttendanceSession
Represents a specific daily instance of a time block.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `templateId` | UUID? | FK → AttendanceSessionTemplate |
| `date` | Date | |
| `name` | String | e.g. "2026-09-01 Morning Assembly" |
| `sessionType` | String | e.g. ASSEMBLY, TIMETABLE_PERIOD, EXAM_SESSION |
| `policyId` | UUID? | FK → AttendancePolicy (Overrides template) |

*Index: `(tenantId, date)`*
*Index: `(tenantId, templateId)`*

### 5. AttendanceRegister
Represents a collection of attendance records for a specific context and date. Generic by design.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `sessionId` | UUID | FK → AttendanceSession |
| `contextType` | Enum | CLASS_SECTION, STAFF_SHIFT, EXAM, EVENT, CLUB, HOSTEL, TRANSPORT |
| `contextId` | UUID | FK to the specific owner (e.g. the specific ClassSection ID) |
| `status` | Enum | DRAFT, OPEN, SUBMITTED, LOCKED, ARCHIVED, REOPENED |
| `openedAt` | DateTime? | |
| `submittedAt` | DateTime? | |
| `lockedAt` | DateTime? | |
| `lockedBy` | UUID? | FK → GlobalUser (Admin who locked it) |

*Index: `(tenantId, sessionId)`*
*Index: `(tenantId, contextType, contextId)`*

### 6. StudentAttendanceRecord
The presence/absence entry for a student.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `registerId` | UUID | FK → AttendanceRegister |
| `studentId` | UUID | FK → Student |
| `date` | Date | Denormalized for fast querying |
| `status` | Enum | PRESENT, ABSENT, LATE, EXCUSED |
| `remarks` | String? | Reason for absence/lateness |
| `method` | String | e.g. MANUAL, IMPORT, SYSTEM. Stored as string/lookup for extensibility. |
| `recordedBy` | UUID? | FK → GlobalUser (If MANUAL) |
| `recordedAt` | DateTime | |

*Index: `(tenantId, studentId, date)`*
*Index: `(tenantId, registerId, studentId)`*

### 7. StaffAttendanceRecord
The presence/absence entry for an employee.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `registerId` | UUID? | FK → AttendanceRegister (Optional for ad-hoc staff scans) |
| `employeeId` | UUID | FK → Employee |
| `date` | Date | Denormalized for fast querying |
| `status` | Enum | PRESENT, ABSENT, LATE, EXCUSED |
| `remarks` | String? | |
| `method` | String | e.g. QR, NFC, RFID, BIOMETRIC, MANUAL, IMPORT. Stored as string/lookup. |
| `recordedBy` | UUID? | FK → GlobalUser (If MANUAL) |
| `recordedAt` | DateTime | |

*Index: `(tenantId, employeeId, date)`*

### 8. AttendanceRecordHistory
Immutable history of all status corrections and changes for auditability.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `studentRecordId` | UUID? | FK → StudentAttendanceRecord |
| `staffRecordId` | UUID? | FK → StaffAttendanceRecord |
| `previousStatus` | Enum | |
| `newStatus` | Enum | |
| `reason` | String? | |
| `changedBy` | UUID | FK → GlobalUser (Nullable if SYSTEM/SCANNER) |
| `actorType` | Enum | USER, SYSTEM, SCANNER, IMPORT, API |
| `changedAt` | DateTime | |

*Index: `(tenantId, studentRecordId)`*
*Index: `(tenantId, staffRecordId)`*

### 9. ScanEvent
Raw telemetry from hardware scanners (or software equivalents) with extensive diagnostics.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `scannerId` | String | Identifier of the scanning device |
| `scannerLocation` | String? | Physical location (e.g. "Main Gate") |
| `deviceClock` | DateTime | Timestamp from the device |
| `serverReceivedAt` | DateTime | Timestamp when server received the payload |
| `scanDirection` | Enum | IN, OUT |
| `validationResult` | Enum | ACCEPTED, REJECTED, ERROR |
| `reasonRejected` | String? | E.g. "Token Expired", "Invalid Signature" |
| `credentialId` | UUID? | FK → IdentityCredential (If valid) |
| `employeeId` | UUID? | Resolved via CredentialService |
| `processed` | Boolean | Whether this scan has been reduced to an AttendanceRecord |

*Index: `(tenantId, employeeId, serverReceivedAt)`*
*Index: `(tenantId, validationResult)`*

### 10. LeaveRequest
Formal request for absence.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `employeeId` | UUID | FK → Employee |
| `type` | Enum | SICK, ANNUAL, MATERNITY, PATERNITY, UNPAID, OTHER |
| `startDate` | Date | |
| `endDate` | Date | |
| `status` | Enum | PENDING, APPROVED, REJECTED, CANCELLED |
| `reason` | String? | |
| `reviewerId` | UUID? | FK → GlobalUser (Who approved/rejected) |
| `reviewedAt` | DateTime? | |

> **Event-Driven Architecture**: Approved leave does not write directly to `StaffAttendanceRecord`. The `LeaveService` emits `Attendance.Leave.Approved`. An asynchronous subscriber creates the `EXCUSED` attendance records.
