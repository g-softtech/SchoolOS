# Student Module Requirements

## 1. Domain Purpose
The Students module is the Canonical Student Domain for SchoolOS. It acts as the ultimate source of truth for student identity, lifecycle, guardian relationships, and status history. 

## 2. Core Entities
- **Student**: The authoritative identity record.
- **StudentProfile**: Extended biographical and demographic data.
- **Guardian**: Reusable parent/guardian/sponsor records.
- **StudentGuardian**: Relational linking between students and guardians.
- **StudentStatusLog**: Immutable append-only ledger for all status changes.

## 3. Strict Boundary Rules
- Admissions, Academics, Attendance, Finance, Transport, Library, Hostel, Clinic, and ID Card modules **must** reference `Student` by ID.
- Admissions **must never** create a Student directly. It must emit an `ApplicationEnrolled` event.
- Students module **must never** generate an ID card. It must emit a `Student.Activated` event for the ID Card module to consume.
- Files (e.g. Birth Certificates, Medical Records) must be handled by `PlatformStorageService`, with only metadata stored in the Profile.

## 4. Student Number Strategy
Student numbers must be strictly configuration-driven at the Tenant level. Hardcoded logic (e.g. `if (year === 2026)`) is forbidden.

## 5. Lifecycle Management
- Minimum lifecycle states: `Pending`, `Active`, `Suspended`, `Withdrawn`, `Graduated`, `Alumni`, `Archived`.
- Status transitions are validated by domain rules and tracked via `StudentStatusLog`. History cannot be overwritten.
