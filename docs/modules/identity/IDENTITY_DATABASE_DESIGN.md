# Identity Module Database Design

This document maps the Identity database schema to constitutional architectural rules.

## Constitutional Guidelines Followed
* **No `tenantId` on Global Entities:** The `User` model represents the physical human and spans multiple tenants. It contains no `tenantId`.
* **Tenant Isolation:** All operational identity models (`TenantMembership`, `Role`, `Permission`, `RolePermission`) require a `tenantId`.
* **Soft Deletes:** Standardized via `deletedAt` and `deletedBy` fields.
* **Optimistic Locking:** Supported via `version` column increments on updates.
* **Auditing:** Sensitive identity mutations log into the `AuditLog` asynchronously.

## Core Models

### 1. `User` (Global)
* `id` (UUID, PK)
* `email` (String, Unique)
* `passwordHash` (String)
* `isActive` (Boolean)
* *Note: Does not contain `tenantId`.*

### 2. `TenantMembership` (Tenant Isolated)
* `id` (UUID, PK)
* `tenantId` (String, FK)
* `userId` (String, FK)
* `roleId` (String, FK)
* `version` (Int)
* `deletedAt`, `deletedBy`

### 3. `Role` (Tenant Isolated)
* `id` (UUID, PK)
* `tenantId` (String, FK)
* `name` (String)
* `version` (Int)
* `deletedAt`, `deletedBy`

### 4. `Permission` & `RolePermission`
* **Permission:** A system-defined capability (e.g., `tenant:update`). Defined globally.
* **RolePermission:** Maps a Tenant's Role to a Permission.

### 5. `Session` (Global/Tenant Hybrid)
* `id` (UUID, PK)
* `sessionToken` (String, Hashed Refresh Token)
* `userId` (String, FK)
* `expires` (DateTime)
* *Usage:* Used exclusively by the `SessionService` to track and rotate refresh tokens securely.
