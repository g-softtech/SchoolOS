# Identity Module API Specification

This document strictly defines the boundaries, inputs, and outputs of the decomposed Identity Domain services. All endpoints conform to the PLATFORM CERTIFICATION standard.

## 1. Global Endpoints (No WorkspaceContext Required)

### 1.1 `POST /api/v1/auth/register`
* **Service:** `RegistrationService`
* **Description:** Registers a new Global User.
* **Payload:** `RegisterUserDto` (`email`, `password`, `firstName`, `lastName`)
* **Response:** `ApiResponseDto<{ token: string }>`
* **Events Emitted:** `Identity.User.Registered`

### 1.2 `POST /api/v1/auth/login`
* **Service:** `AuthenticationService`
* **Description:** Validates credentials and returns 15-minute JWT.
* **Payload:** `LoginDto` (`email`, `password`)
* **Response:** `ApiResponseDto<{ token: string }>`
* **Events Emitted:** `Identity.User.LoggedIn`

### 1.3 `POST /api/v1/auth/refresh`
* **Service:** `SessionService`
* **Description:** Rotates the refresh token securely and issues a new access token.
* **Payload:** `{ refreshToken: string }`
* **Response:** `ApiResponseDto<{ token: string }>`
* **Events Emitted:** `Identity.Token.Refreshed`

### 1.4 `POST /api/v1/tenant-wizard/provision`
* **Service:** `TenantProvisioningService`
* **Description:** Provisions a new School/Workspace for an authenticated Global User.
* **Payload:** `CreateTenantDto` (`name`, `slug`, `planId`)
* **Response:** `ApiResponseDto<{ tenantId: string }>`
* **Events Emitted:** `Identity.Tenant.Provisioned`

## 2. Tenant Endpoints (WorkspaceContext Required)

### 2.1 `PATCH /api/v1/auth/password`
* **Service:** `PasswordService`
* **Permissions:** Implicit (Must be self)
* **Payload:** `{ oldPassword, newPassword }`
* **Response:** `ApiResponseDto<{ success: boolean }>`
* **Events Emitted:** `Identity.Password.Changed`

### 2.2 `POST /api/v1/roles`
* **Service:** `RoleService`
* **Permissions:** `@RequirePermission('role:create')`
* **Payload:** `CreateRoleDto`
* **Response:** `ApiResponseDto<{ id: string }>`
* **Events Emitted:** `Identity.Role.Created`

### 2.3 `PATCH /api/v1/roles/:id`
* **Service:** `RoleService`
* **Permissions:** `@RequirePermission('role:update')`
* **Payload:** `UpdateRoleDto`
* **Response:** `ApiResponseDto<{ success: boolean }>`
* **Events Emitted:** `Identity.Role.Updated`

### 2.4 `POST /api/v1/roles/:id/permissions`
* **Service:** `PermissionService`
* **Permissions:** `@RequirePermission('role:update')`
* **Payload:** `AssignPermissionDto`
* **Response:** `ApiResponseDto<{ success: boolean }>`
* **Events Emitted:** `Identity.Permission.Assigned`
