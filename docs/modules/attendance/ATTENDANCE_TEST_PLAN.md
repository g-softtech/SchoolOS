# Attendance Module Test Plan

This document outlines the testing strategy required to certify the Attendance module for `PLATFORM_CERTIFICATION`.

## 1. Unit Testing Strategy (70% Coverage Target)

Unit tests must isolate the `AttendanceService`, `LeaveService`, and `ScanService` using `jest-mock-extended`.

### Scan Processing
- **Token Validation**: Verify that an incoming scan event correctly invokes `CredentialService.validateToken(token)`.
- **Valid Scan**: Verify that if a token is valid, a `ScanEvent` is recorded with `status: ACCEPTED`.
- **Invalid Scan**: Verify that if a token is invalid (or revoked), the scan is rejected and NO `AttendanceRecord` is inferred.

### Manual Registers
- **Bulk Save**: Verify that updating a register efficiently upserts records.
- **Register Lock**: Verify that attempting to add or modify records in a `CLOSED` register throws a `BadRequestException` (unless explicitly using the override method).

### Leave Processing
- **Auto-excuse**: Verify that when a leave request is marked `APPROVED`, the system automatically ensures `AttendanceRecord`s with status `EXCUSED` exist for the dates spanning the request.

## 2. Integration Testing Strategy (20% Coverage Target)

Integration tests must run against the PostgreSQL test container to validate DB constraints.

- **Polymorphic Constraint Check**: Verify that creating an `AttendanceRecord` with both `studentId` and `employeeId` populated throws a database constraint violation.
- **Tenant Isolation**: Verify that a teacher in Tenant A cannot list or update registers belonging to Tenant B.
- **Cascading Rules**: Verify that `ScanEvent` records persist even if the underlying `AttendanceRecord` is somehow modified manually later.

## 3. End-to-End Testing Strategy (10% Coverage Target)

E2E tests will hit the API Gateway using Supertest to validate Controllers, DTOs, and Guards.

- **RBAC Enforcement**: Verify that a user without `attendance.record.override` receives a 403 Forbidden when attempting to edit a closed register.
- **Machine Role Verification**: Verify that the `/api/v1/attendance/scans` endpoint accepts payloads from authorized API keys representing hardware scanners.

## 4. Evidence Requirements for Certification
The CI workflow must output the following artifacts before this module is frozen:
1. `coverage-summary.json` (Proving coverage thresholds).
2. `benchmark.json` (Proving high-volume scan ingestion latency < 50ms).
3. `mutation-report.json` (Proving test suite resilience, especially around the register lock boundaries).
