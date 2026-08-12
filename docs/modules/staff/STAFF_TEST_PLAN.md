# Staff Module Test Plan

This document outlines the testing strategy required to certify the Staff module for `PLATFORM_CERTIFICATION`.

## 1. Unit Testing Strategy (70% Coverage Target)

Unit tests must use `jest-mock-extended` to isolate the `StaffService` and `CredentialService` from Prisma and the EventBus.

### Employee Lifecycle
- **Hire**: Verify that `createEmployee` correctly assigns an employee number and emits `Staff.Employee.Created`.
- **Suspend**: Verify that suspending an employee sets status to `SUSPENDED` and explicitly emits `Staff.Employee.Suspended`.
- **Terminate**: Verify termination logic.

### Credential Rotation
- **Issuance**: Verify that issuing a new `IdentityCredential` auto-revokes any previously ACTIVE credential of the same type for that employee.
- **Revocation**: Verify that manually revoking a credential emits `Staff.Credential.Revoked`.

## 2. Integration Testing Strategy (20% Coverage Target)

Integration tests must run against the PostgreSQL test container to validate DB constraints.

- **Unique Constraints**: Ensure `employeeNumber` cannot be duplicated within the same tenant.
- **Tenant Isolation**: Verify that a query for `departmentId` X returns 404 if it belongs to tenant B but requested by tenant A.
- **Cascading Deletes**: Verify that deleting a `Department` throws a restriction error if `Position`s exist, or verify soft-delete behavior.
- **Token Indexing**: Verify that looking up an employee by their credential token is performant and accurate.

## 3. End-to-End Testing Strategy (10% Coverage Target)

E2E tests will hit the API Gateway using Supertest to validate Controllers, DTOs, and Guards.

- **RBAC Enforcement**: Verify that a user without `staff.credential.issue` receives a 403 Forbidden when attempting to issue a QR token.
- **Input Validation**: Verify that missing required fields in `POST /employees` returns a 400 Bad Request formatted as `ApiResponseDto`.

## 4. Evidence Requirements for Certification
The CI workflow must output the following artifacts before this module is frozen:
1. `coverage-summary.json` (Proving coverage thresholds).
2. `benchmark.json` (Proving token lookup speeds < 50ms).
3. `mutation-report.json` (Proving test suite resilience).
