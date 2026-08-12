# Student Traceability Matrix

| Requirement | Implementation Artifact | Test Artifact |
| :--- | :--- | :--- |
| **STU-001**: Enrollment Event Boundary | `EnrollmentSubscriber` | `EnrollmentSubscriber.spec.ts` |
| **STU-002**: Reusable Guardians | `GuardianService`, `StudentGuardian` model | `GuardianService.spec.ts` |
| **STU-003**: Immutable Status Ledger | `StudentLifecycleService`, `StudentStatusLog` model | `StudentLifecycleService.spec.ts` |
| **STU-004**: ID Card Event Trigger | `StudentLifecycleService` (`Student.Activated`) | `StudentLifecycleService.spec.ts` |
| **STU-005**: Tenant Isolation | `StudentRepository` (`tenantId` bounds) | `student-api.e2e-spec.ts` |
