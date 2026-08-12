# Student Events Specification

These 10 canonical events are the exclusive integration points for downstream modules (Academics, Attendance, ID Card, Finance).

| Event | Producer | Payload Schema | Retry Strategy | Dead-Letter |
| :--- | :--- | :--- | :--- | :--- |
| `Student.Created` | `StudentService` | `{ tenantId, studentId, studentNumber }` | 5 times, exp backoff | Yes |
| `Student.Activated` | `StudentLifecycleService` | `{ tenantId, studentId, studentNumber }` | 5 times, exp backoff | Yes |
| `Student.Updated` | `StudentService` | `{ tenantId, studentId, fieldsChanged: string[] }` | 3 times, exp backoff | No |
| `Student.StatusChanged` | `StudentLifecycleService` | `{ tenantId, studentId, previousStatus, newStatus }` | 5 times, exp backoff | Yes |
| `Student.GuardianLinked` | `GuardianService` | `{ tenantId, studentId, guardianId, relationshipType }` | 3 times, exp backoff | Yes |
| `Student.GuardianRemoved` | `GuardianService` | `{ tenantId, studentId, guardianId }` | 3 times, exp backoff | Yes |
| `Student.PhotoUpdated` | `StudentService` | `{ tenantId, studentId, photoKey }` | 3 times, exp backoff | No |
| `Student.Archived` | `StudentLifecycleService` | `{ tenantId, studentId }` | 5 times, exp backoff | Yes |
| `Student.Restored` | `StudentLifecycleService` | `{ tenantId, studentId }` | 5 times, exp backoff | Yes |
| `Student.Deleted` | `StudentService` | `{ tenantId, studentId }` | 5 times, exp backoff | Yes |
