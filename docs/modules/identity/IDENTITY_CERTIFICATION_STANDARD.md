# Identity Certification Standard

## Overview
Identity is a Tier 1 foundational module. It requires strict adherence to this standard before reaching `⚪ Certified Frozen`.

## Certification Requirements

1. **Tenant Isolation Guarantees**
   - Zero-trust access by default.
   - Cross-tenant requests must fail deterministically.
   - Admin access bounded by context.

2. **Immutability and Auditing**
   - All role, permission, and access changes must be audited.
   - No hard deletes for principal records.

3. **Performance Baseline**
   - Authentication latency < 50ms.
   - Middleware evaluation < 10ms.

4. **Security Hardening**
   - Complete protection against token replay, JWT tampering, and IDOR.

5. **Explainability**
   - Every 403 Forbidden must clearly outline `Required` vs `Granted` capabilities.

Only when all levels of `identity-certification` pass without warnings or flaky behavior will this module be certified.
