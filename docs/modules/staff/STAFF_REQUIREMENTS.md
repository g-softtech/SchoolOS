# Staff Module Requirements

## 1. Executive Summary
The Staff module is the canonical source of truth for all employee records, structural department taxonomy, position hierarchies, and abstract identity credentials. It isolates the definition of *who works here* from *what they do* (Timetables) and *when they did it* (Attendance).

---

## 2. Bounded Context & Ownership

### Owns (Authoritative Source)
- **Employee Profiles**: Core demographic and employment details (Employee Number, Date of Hire, Employment Status).
- **Identity Credentials**: Abstract tokens (e.g., QR, NFC, RFID) that identify an employee to external systems. The Staff module manages the *issuance and lifecycle* of these credentials. The credential history is preserved permanently for investigation purposes — revocation never deletes data.
- **Departments**: The organizational hierarchy of the school, supporting parent-child nesting.
- **Positions**: The roles employees hold (e.g., "Senior Teacher", "Librarian") with capability categories for module filtering.
- **Employment Lifecycle**: Transitions between Draft, Active, On Leave, Suspended, Terminated, and Archived.
- **Position History**: Complete `EmployeePositionHistory` from day one.

### Does NOT Own
- **Global User Accounts / Login State**: Identity/Auth owns passwords, email verification, and session tokens. The Employee record references a `userId` only. Employment status and account status are **independent** — an employee may be Active in payroll while their login is disabled by IT, or Suspended in employment while HR keeps their login active for appeals.
- **QR Image Generation**: The ID Card module consumes the abstract `IdentityCredential.token` to render printable QR matrices, barcodes, or NFC payloads.
- **Attendance Records**: The Attendance module calls `CredentialService.validateToken()` and owns the resulting `ScanEvent` and `AttendanceRecord`. It never reads the `IdentityCredential` table directly.
- **Teacher Class Allocations**: Timetables and Academics own the mapping of a Staff member to a subject or timeslot. The Staff module makes employees *available*; Timetables decides *where* they teach.

---

## 3. Employment Lifecycle

```text
DRAFT
  ↓ (Activate)
ACTIVE
  ↓ ─────────── (Leave)      (Suspend)
ON_LEAVE        SUSPENDED
  ↓                  ↓
  └──────────────────┘
           ↓
       TERMINATED
           ↓
       ARCHIVED
```

| Transition | Allowed From | Permission Required | Event Emitted | Audit Required |
|---|---|---|---|---|
| Activate | DRAFT | `staff.employee.manage_lifecycle` | `Staff.Employee.Activated` | Yes |
| Place on Leave | ACTIVE | `staff.employee.manage_lifecycle` | — | Yes |
| Suspend | ACTIVE | `staff.employee.manage_lifecycle` | `Staff.Employee.Suspended` | Yes |
| Reinstate | ON_LEAVE, SUSPENDED | `staff.employee.manage_lifecycle` | `Staff.Employee.Activated` | Yes |
| Terminate | ACTIVE, ON_LEAVE, SUSPENDED | `staff.employee.manage_lifecycle` | `Staff.Employee.Terminated` | Yes |
| Archive | TERMINATED | `staff.employee.delete` | — | Yes |

**Employment Status vs. Account Status**: These are independent. A suspended employee may retain their login account for HR appeals. An active employee's login may be disabled by IT for unrelated security reasons. Never derive one from the other.

---

## 4. IdentityCredential Lifecycle

```text
ISSUED
  ↓ (Activate)
ACTIVE
  ↓ ───────────── (Suspend)
SUSPENDED
  ↓
REVOKED
  ↓ (Time-based)
EXPIRED
```

### Credential Rotation Policy
The following rules are **inviolable** and enforced at the service layer:

1. **One ACTIVE credential per type per employee** at any given time.
2. **Issuing a new credential automatically revokes** any existing ACTIVE or ISSUED credential of the same type before creation.
3. **Revocation never deletes data.** All credentials remain in the table with their final status for investigation 
and audit.
4. **Multiple credential types** may be active simultaneously (e.g., an employee may hold an active `QR` and an active 
`NFC` credential at the same time).
5. **Token generation** uses `crypto.randomBytes(32)` — cryptographically random, not sequential. Credentials must never expose sequential or predictable identifiers. For example, `EMP000123` must never be encoded directly into a QR code.

### Supported Credential Types
| Type | Description | Status |
|---|---|---|
| `QR` | QR code rendered on ID card | ✅ Implemented |
| `NFC` | Near-field chip on physical card | 🔮 Future |
| `RFID` | Radio-frequency identification tag | 🔮 Future |
| `BARCODE` | Linear barcode on ID card | 🔮 Future |
| `MANUAL` | Manual administrator override (no token scan) | 🔮 Future |
| `API` | Machine-to-machine service token | 🔮 Future |

---

## 5. Staff Role Capabilities

`Position.isTeachingRole` is a baseline flag for Timetables filtering. To support fine-grained filtering across modules without redesigning the schema, positions will carry a `roleCategory` enum:

| Category | Description | Consuming Modules |
|---|---|---|
| `TEACHER` | Classroom instruction | Timetables, Examinations |
| `ADMINISTRATOR` | School administration | All |
| `VICE_PRINCIPAL` | Deputy administration | Attendance, Reporting |
| `PRINCIPAL` | Senior leadership | All |
| `FINANCE` | Bursary/Accounts | Finance |
| `LIBRARIAN` | Library management | Library |
| `SECURITY` | Gate/premises security | Attendance |
| `DRIVER` | Transport operations | Transport |
| `NURSE` | Health/clinic staff | Clinic |
| `WARDEN` | Hostel supervision | Hostel |

---

## 6. StaffAssignment (Future Module Boundary)

To prevent `Employee` from becoming a God Object, **teaching and operational assignments are deferred to a future 
`StaffAssignment` concept**. An employee's job title and department do not change when they are assigned to teach a 
new class section for a new academic session.

**StaffAssignment belongs to Academics**, not Staff.
- **Staff** owns the Employee.
- **Academics** owns the StaffAssignment.
- **Timetables** owns the ScheduledLesson.

```text
Employee
 ├── Position History (permanent employment record)
 └── StaffAssignment (session-scoped, owned by Academics)
       ├── Campus
       ├── AcademicSession
       ├── Role: Class Teacher | Subject Teacher | House Master
       └── Target: ClassSection | Subject | House
```

This will be implemented when Timetables and Academics reach maturity. The Staff module will expose Employee IDs for Timetables to reference; it will not own the assignment itself.

---

## 7. Future Consumer Registry

The following modules subscribe to Staff events. All inter-module communication MUST flow through the EventBus — no module may query the Staff database directly.

| Module | Subscribes To | Purpose |
|---|---|---|
| **Attendance** | `Staff.Credential.Issued`, `Staff.Credential.Revoked` | Invalidate scan cache; update valid token index |
| **ID Card** | `Staff.Employee.Created`, `Staff.Employee.Activated`, `Staff.Credential.Issued` | Trigger card generation/re-issue workflow |
| **Finance/Payroll** | `Staff.Employee.Activated`, `Staff.Employee.Suspended`, `Staff.Employee.Terminated` | Start/pause/stop payroll processing |
| **Library** | `Staff.Employee.Activated`, `Staff.Employee.Terminated` | Grant/revoke borrowing rights |
| **Transport** | `Staff.Employee.Activated`, `Staff.Employee.Terminated` | Update driver assignment eligibility |
| **Hostel** | `Staff.Employee.Activated`, `Staff.Employee.Terminated` | Update warden assignment eligibility |
| **Reporting** | All `Staff.Employee.*` events | Workforce analytics and headcount reports |
| **Notifications** | `Staff.Employee.Activated`, `Staff.Employee.Suspended`, `Staff.Employee.Terminated`, `Staff.Credential.Issued` | Welcome, suspension, and termination notifications |

---

## 8. Core Capabilities Summary
- **Hire**: Register a new employee (starts in `DRAFT`).
- **Lifecycle Management**: Enforce state machine transitions. No direct status patching.
- **Position Tracking**: Record every position change in `EmployeePositionHistory`.
- **Credential Rotation**: Issue, auto-revoke, rotate, or suspend credentials. History is permanent.
- **Department Hierarchy**: Create and query parent-child department trees.
- **Event Broadcast**: Emit rich lifecycle events for all downstream consumers.

---

## 9. Integration with Identity Module

The `Employee.userId` field is nullable. This supports scenarios where:
- An employee is hired but not yet invited to the platform (`userId = null`).
- An employee exists in the school's legacy system and has not yet been migrated.
- An employee's account has been permanently deleted from Identity while their employment record must be retained for historical reporting.

The Staff module MUST NOT create, delete, or modify `GlobalUser` records. It only stores the reference.
