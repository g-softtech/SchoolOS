# Identity Certification

This directory contains the 10-level certification suite for the Identity module. It is designed to prove that the Identity platform satisfies its constitutional guarantees.

## The 10 Certification Levels

1. **Tenant Isolation**: Data belonging to one tenant must never be observable by another tenant.
2. **Authentication**: Verifies login, logout, refresh tokens, and signature invalidation.
3. **Authorization**: Proves RBAC, capabilities, and hierarchical restrictions.
4. **Identity Integrity**: Checks duplicate users, soft deletes, and lifecycle transitions.
5. **Audit**: Ensures all security-sensitive actions generate immutable audit records.
6. **Performance**: Asserts latency guarantees for authentication and middleware overhead.
7. **Concurrency**: Handles simultaneous logins, role updates, and race conditions safely.
8. **Security**: Verifies protections against JWT tampering, SQL injection, IDOR, etc.
9. **Explainability**: Ensures every denial (403) explains exactly why (Required vs Granted).
10. **Certification**: Final sign-off verifying constitutional promises (Zero Trust, Determinism).
11. **Privacy & Information Disclosure**: Prevents enumeration, timing attacks, and generic error leakage.

## Shared Infrastructure

- `helpers/`: Reusable test utilities for auth, tenants, and assertions.
- `factories/`: Test data generators.
- `fixtures/golden/`: Canonical datasets (Tenant A, Tenant B, Users, etc.) to ensure tests are highly reproducible.
- `setup/`: Global setup and teardown for the certification environment.

## Execution

The suite can be executed sequentially. A full pass generates a Certification Report in CI.

```bash
npm run test:e2e:identity
```

## Meaning of "Certified Frozen"

Once all 10 levels pass, Identity reaches `⚪ CERTIFIED FROZEN` status. At this point, the architecture and foundational rules are locked, and regressions are constitutionally blocked.
