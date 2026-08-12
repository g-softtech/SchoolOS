# Attendance Module Permissions

The following RBAC permissions dictate access to the Attendance module boundaries. They must be registered in the `Identity` permission seed and enforced on all Attendance controllers using `@RequirePermission('permission.node')`.

## 1. Machine / Device Scans
- `attendance.scan.submit`: Submit raw scan events (Usually granted to an API Key / Machine identity representing a physical scanner or kiosk app).

## 2. Manual Registers
- `attendance.register.read`: View attendance registers and historical records (Granted to Teachers for their own classes, Admins for all).
- `attendance.register.write`: Initialize an attendance register for a specific date/context.
- `attendance.record.write`: Manually mark students/staff as present/absent/late (Teachers, Admins).
- `attendance.register.close`: Lock a register, preventing further manual edits (Teachers, Admins).

## 3. Override & Administration
- `attendance.record.override`: Edit attendance records in a CLOSED register. Requires an audit trail reason (Super Admins, Principals).

## 4. Leave Management
- `attendance.leave.request`: Submit a leave request for oneself.
- `attendance.leave.manage`: Review, approve, or reject leave requests submitted by others (HR, Principals).
