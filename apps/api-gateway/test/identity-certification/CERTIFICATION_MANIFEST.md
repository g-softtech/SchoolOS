# Identity Certification Manifest

**Certification Version:** v1.0
**Status:** Under Certification

## Contract

To achieve **⚪ Certified Frozen** status, Identity must satisfy:

### 1. Required Levels
All 11 certification levels in `identity-certification` must pass.

### 2. Required Pass Rate
**100%**. Flaky tests invalidate the certification run.

### 3. Exit Criteria / Severities
- **0** Critical failures (Tenant isolation, bypass, privilege escalation).
- **0** High failures (Audit failure, identity integrity).
- **0** Medium failures (Performance degradation).
- Low severity issues (e.g., documentation wording) may exist but must be tracked.
- Test coverage must remain above the agreed threshold (85%).
- CI must generate the machine-readable JUnit report successfully.

### 4. Performance Thresholds
- Authentication Latency: `< 50ms` (P95)
- Authorization/Middleware Overhead: `< 10ms` (P95)

### 5. Prerequisites & Supported Environments
- Docker and PostgreSQL Testcontainers must be available for isolated testing.
- The Golden Dataset (`fixtures/golden/`) must be seeded prior to execution.
- Node.js 20+

*This manifest is validated automatically during the CI certification run.*
