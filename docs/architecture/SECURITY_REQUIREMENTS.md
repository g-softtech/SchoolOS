# SECURITY REQUIREMENTS

Every module inside SchoolOS must comply with these strict security policies. Failure to implement these requirements is an automatic rejection of the module.

## 1. Tenant Isolation
- **Rule**: EVERY database read/write operation MUST explicitly filter by `tenantId`.
- **Implementation**: `WorkspaceContext` is the absolute source of truth for the active `tenantId`. Never trust a client-provided tenant identifier in a payload.

## 2. Identifiers
- **Rule**: Business identifiers (e.g., Admission Numbers) are separate from Database identifiers.
- **Implementation**: Expose only UUIDs to the frontend API. Sequential, auto-incrementing integer IDs are strictly forbidden for foreign keys and API routes to prevent enumeration attacks.

## 3. JWT & Session Rules
- **Rule**: JWTs must contain minimum necessary payload (sub, email, roles).
- **Implementation**: Session expiry is strictly 15 minutes for access tokens, relying on secure HTTP-only refresh tokens.

## 4. Policy & Entitlements
- **Rule**: API endpoints must be decorated with `@RequirePermission()`.
- **Implementation**: Authorization is resolved against the global Permission Graph in Redis before Controller execution.

## 5. Audit Logging
- **Rule**: All sensitive mutations (e.g., admitting a student, changing fees, modifying workflows) MUST generate an Audit Log.
- **Implementation**: Do not write audit logs synchronously to Prisma. Emit an event (e.g., `Admissions.Workflow.Transitioned`), and the dedicated Audit Subscriber will asynchronously log the actor, IP, timestamp, and delta.

## 6. Password & MFA Policy
- **Rule**: Passwords must be hashed via Argon2.
- **Implementation**: School admins, teachers, and parents have distinct MFA enablement policies dictated by the Tenant configuration.

## 7. Rate Limiting
- **Rule**: All public endpoints (e.g., admission forms, parent portal) must be aggressively rate-limited.
- **Implementation**: IP-based rate limiting via Redis token bucket.

## 8. Data Sanitization & Secrets
- **Rule**: Never trust client inputs.
- **Implementation**: Use `class-validator` strictly. Secrets (API keys, OAuth strings) are loaded via `.env` only. Hardcoded secrets will trigger CI failures.
