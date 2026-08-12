# Timetables Database Design

## Design Principles
- **Multi-tenancy**: Every core entity MUST include `tenantId`.
- **Soft Deletes**: Standard entity retention pattern via `deletedAt`.
- **Optimistic Locking**: Handled at the `TimetableSlot` level with a `version` attribute to manage concurrency for publishing workflows.

## Entity Relational Schema

### 1. BellSchedule
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `name`: String (e.g. "Normal", "Ramadan", "Exam Week")
- `effectiveFrom`: DateTime?
- `effectiveTo`: DateTime?

### 2. TeachingDay
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `bellScheduleId`: String (FK to BellSchedule)
- `dayOfWeek`: Int (1=Monday, 7=Sunday)
- `isSchoolDay`: Boolean

### 3. Period
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `bellScheduleId`: String (FK to BellSchedule)
- `name`: String (e.g. "Period 1", "Break")
- `startTime`: String (e.g. "08:00")
- `endTime`: String (e.g. "08:40")
- `isTeaching`: Boolean

### 4. Room
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `name`: String (e.g. "Science Lab")
- `capacity`: Int?

### 5. TimetableSlot
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `academicTermId`: String (FK to Academics.AcademicTerm)
- `bellScheduleId`: String (FK to BellSchedule)
- `teachingDayId`: String (FK to TeachingDay)
- `periodId`: String (FK to Period)
- `subjectAssignmentId`: String (FK to Academics.SubjectAssignment)
- `teacherId`: String? (FK to Staff, SetNull on delete)
- `roomId`: String? (FK to Room, SetNull on delete)
- `status`: String (DRAFT, PUBLISHED)
- `publishedAt`: DateTime?
- `version`: Int (Optimistic locking)
