# Attendance API Specification

All endpoints are prefixed with `/api/v1/attendance`. Every endpoint requires the `TenantMiddleware`. All responses use `ApiResponseDto`.

## 1. Attendance Scans (M2M / Devices)

### `POST /scans`
- **Description**: Endpoint hit by hardware scanners or kiosk apps when a token is presented.
- **Permissions**: `attendance.scan.submit` (usually an API key/machine role).
- **Body**: `{ token: string, scannerId: string, scannerLocation?: string, deviceClock: string, direction: 'IN' | 'OUT' }`
- **Logic**: Calls `CredentialService.validateToken(token)`. If valid, records a `ScanEvent` with `validationResult: ACCEPTED`. If invalid, records with `validationResult: REJECTED` and `reasonRejected`.
- **Response**: `{ success: true, validationResult: 'ACCEPTED' | 'REJECTED', employeeId?: string, reasonRejected?: string }`

## 2. Registers & Manual Entry (Teachers / Admins)

### `GET /registers/current`
- **Description**: Automatically resolves the current relevant register for the caller. For a teacher, it queries the Timetables module ("Which class should this teacher teach right now?") and opens/returns the register for that specific `CLASS` context.
- **Permissions**: `attendance.register.read`
- **Response**: `AttendanceRegisterDto`.

### `GET /registers`
- **Description**: List attendance registers for a given context and date range.
- **Permissions**: `attendance.register.read`
- **Query**: `?contextType=CLASS&contextId=xxx&date=2026-07-30`
- **Response**: Array of `AttendanceRegisterDto`.

### `POST /registers`
- **Description**: Initialize a new attendance register for a context.
- **Permissions**: `attendance.register.write`
- **Body**: `{ date: '2026-07-30', contextType: 'CLASS' | 'STAFF_SHIFT' | 'EXAM' | 'EVENT', contextId: 'uuid' }`
- **Response**: `AttendanceRegisterDto` (State: `OPEN`).

### `PATCH /registers/:registerId/records`
- **Description**: Bulk submit or update attendance records for an `OPEN` register. Used by teachers saving the class attendance. Records are stored in `StudentAttendanceRecord` or `StaffAttendanceRecord` depending on `targetType`.
- **Permissions**: `attendance.record.write`
- **Body**: `{ records: [{ targetId: string, targetType: 'STUDENT' | 'STAFF', status: 'PRESENT' | 'ABSENT', remarks?: string }] }`
- **Response**: `{ success: true, updatedCount: number }`

### `POST /registers/:registerId/state`
- **Description**: Transition the register through its lifecycle (e.g. `OPEN -> SUBMITTED`, `SUBMITTED -> LOCKED`).
- **Permissions**: `attendance.register.manage` (LOCKED -> REOPENED requires `attendance.register.override`).
- **Body**: `{ state: 'SUBMITTED' | 'LOCKED' | 'REOPENED', reason?: string }`
- **Response**: `AttendanceRegisterDto`.

## 3. Leave Management

### `POST /leave-requests`
- **Description**: Submit a request for planned absence.
- **Permissions**: `attendance.leave.request`
- **Body**: `{ type: 'SICK', startDate: '2026-08-01', endDate: '2026-08-05', reason: string }`
- **Response**: `LeaveRequestDto`.

### `PATCH /leave-requests/:id/status`
- **Description**: Approve or reject a leave request. Emits `Attendance.Leave.Approved` domain event upon approval.
- **Permissions**: `attendance.leave.manage`
- **Body**: `{ status: 'APPROVED' | 'REJECTED' }`
- **Response**: `LeaveRequestDto`.
