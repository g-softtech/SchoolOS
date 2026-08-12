# Identity Module Functional Requirements

This document defines the functional and architectural requirements for the SchoolOS Identity Module.

## 1. Core Domain Boundaries
The Identity module is explicitly prohibited from being a "God Module". It is functionally decomposed into bounded services:

* **AuthenticationService:** Validates credentials and issues 15-minute JWTs.
* **RegistrationService:** Creates global user accounts safely with Argon2 hashing.
* **SessionService:** Handles secure refresh token rotation and revocation via the `Session` table.
* **PasswordService:** Manages password changes, resets, and expiration.
* **TenantProvisioningService:** Handles the bootstrapping of a new School workspace.
* **RoleService:** Manages the lifecycle of tenant-isolated roles.
* **PermissionService:** Assigns and resolves permission capabilities.

## 2. Authentication & Security
* **Protocol:** Stateless Access Tokens (JWT) + Stateful Refresh Tokens (DB-backed).
* **Expiration:** Access tokens strictly expire in 15 minutes.
* **Hashing:** Passwords must be hashed using Argon2.
* **Rate Limiting:** Public endpoints (login, register) must use Redis-backed throttling.

## 3. Context & Tenant Isolation
* **Source of Truth:** A request's `tenantId` must only be trusted after database verification via `TenantMembershipRepository`.
* **Execution Wrap:** Every request, background job, and event listener operating on tenant data must be wrapped in `tenantContextStorage.run()`.

## 4. Authorization (RBAC) & Entitlements
* **Policy Engine:** Authorization utilizes `@RequirePermission` and `@RequireFeature`.
* **Feature Flags:** The module must integrate with Marketplace Entitlements. A tenant's capabilities are restricted by their `PlatformPlan`.
* **Resolution:** Permission graphs must be cached in Redis for <5ms resolution. Stale permissions must be invalidated via Event Subscribers upon role update.

## 5. Auditing & Events
* The Identity module must be strictly event-driven.
* Sensitive mutations (Login, Password Change, Role Modification) must emit events to the Platform Kernel.
* The `AuditSubscriber` must intercept these events and write to the database asynchronously to guarantee the <100ms API SLA.
