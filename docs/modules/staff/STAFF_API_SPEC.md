# Staff API Specification

All endpoints are prefixed with `/api/v1/staff`. Every endpoint requires the `TenantMiddleware`. All responses use `ApiResponseDto`.

## 1. Departments & Positions

### `GET /departments`
- **Description**: List all departments for the tenant.
- **Permissions**: `staff.department.read`
- **Response**: Array of `DepartmentDto`.

### `POST /departments`
- **Description**: Create a new department.
- **Permissions**: `staff.department.write`
- **Body**: `{ name: string, description?: string }`
- **Response**: `DepartmentDto`

### `GET /departments/:departmentId/positions`
- **Description**: List all positions within a specific department.
- **Permissions**: `staff.position.read`
- **Response**: Array of `PositionDto`.

### `POST /departments/:departmentId/positions`
- **Description**: Create a new position within a department.
- **Permissions**: `staff.position.write`
- **Body**: `{ title: string, description?: string, isTeachingRole: boolean }`
- **Response**: `PositionDto`

## 2. Employees

### `GET /employees`
- **Description**: Search and list employees.
- **Permissions**: `staff.employee.read`
- **Query**: `?status=ACTIVE&departmentId=xxx`
- **Response**: Cursor-paginated `EmployeeDto`.

### `POST /employees`
- **Description**: Register a new employee (hire).
- **Permissions**: `staff.employee.write`
- **Body**: `{ firstName, lastName, email, phone, dateOfHire, positionId, employeeNumber }`
- **Events Emitted**: `Staff.Employee.Created`
- **Response**: `EmployeeDto`

### `PATCH /employees/:employeeId/status`
- **Description**: Transition employee lifecycle (e.g., ACTIVE -> SUSPENDED).
- **Permissions**: `staff.employee.manage_lifecycle`
- **Body**: `{ status: 'SUSPENDED', reason: 'Disciplinary' }`
- **Events Emitted**: `Staff.Employee.Suspended` or `Staff.Employee.Activated`
- **Response**: `EmployeeDto`

## 3. Credentials

### `POST /employees/:employeeId/credentials`
- **Description**: Issue a new identity credential (e.g., QR Token) for the employee. Will automatically revoke any existing active credential of the same type.
- **Permissions**: `staff.credential.issue`
- **Body**: `{ type: 'QR', expiresAt?: string }`
- **Events Emitted**: `Staff.Credential.Issued`, `Staff.Credential.Revoked` (if replacing)
- **Response**: `IdentityCredentialDto` (including the secure token string).

### `POST /employees/:employeeId/credentials/:credentialId/revoke`
- **Description**: Instantly invalidate a credential.
- **Permissions**: `staff.credential.revoke`
- **Body**: `{ reason: string }`
- **Events Emitted**: `Staff.Credential.Revoked`
- **Response**: `{ success: true }`
