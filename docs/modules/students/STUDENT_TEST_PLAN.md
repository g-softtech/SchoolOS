# Student Test Plan

To satisfy empirical certification, the following tests MUST be implemented:

## Unit Tests
- `StudentLifecycleService.spec.ts`: Verify that immutable `StudentStatusLog` entries are generated for every state transition and that invalid transitions throw exceptions.
- `StudentNumberStrategy.spec.ts`: Verify prefix appending and sequence padding.

## Integration Tests
- `EnrollmentSubscriber.spec.ts`: Emit a mock `Admissions.Application.Enrolled` event and verify a `Student` record is physically inserted into the test database.
- `StudentSearchService.spec.ts`: Insert 50 mock students and verify cursor pagination returns correct chunks.

## E2E Tests
- `student-api.e2e-spec.ts`: Test the `/api/v1/students` endpoints using Supertest, ensuring `@RequirePermission` successfully blocks unauthorized tenants.

## Performance Target
- **Student Lookup (`GET /:id`)**: < 100ms
- **Student Search**: < 200ms
