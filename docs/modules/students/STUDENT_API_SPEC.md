# Student API Specification

All endpoints reside under `/api/v1/students` and require `WorkspaceContext`.

## Endpoints

### 1. `GET /api/v1/students/search`
- **Description**: Configurable cursor-paginated search.
- **Permissions**: `students.read`
- **Query Params**: `cursor`, `limit`, `q` (name/number), `status`, `guardianId`
- **Returns**: `ApiResponseDto<PaginatedResult<StudentDto>>`

### 2. `GET /api/v1/students/:id`
- **Description**: Fetch aggregate root (Student + Profile + Guardians).
- **Permissions**: `students.read`

### 3. `PATCH /api/v1/students/:id/profile`
- **Description**: Update demographics/metadata.
- **Permissions**: `students.profile.update`
- **Body**: `UpdateStudentProfileDto`

### 4. `POST /api/v1/students/:id/status`
- **Description**: Transition lifecycle status.
- **Permissions**: `students.status.update`
- **Body**: `{ targetStatus: StudentStatus, reason: string }`

### 5. `POST /api/v1/students/:id/guardians`
- **Description**: Link an existing or new guardian to a student.
- **Permissions**: `students.guardians.manage`
- **Body**: `{ guardianId?: string, newGuardian?: CreateGuardianDto, relationshipType: string, isPrimary: boolean }`

### 6. `PUT /api/v1/students/number-strategy`
- **Description**: Configure tenant numbering strategy.
- **Permissions**: `students.strategy.manage`
- **Body**: `{ prefix: string, yearReset: boolean }`
