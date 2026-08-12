# Reference Module Standard

This document defines the mandatory constitutional lifecycle for every future module built on the SchoolOS SaaS platform (e.g., Finance, HR, Payroll, Library, Transport). 

It ensures all modules inherit a proven architectural pattern, bypassing the need to reinvent the governance process. No module may be frozen until all steps are completed and verified with empirical evidence.

## The 13-Step Constitutional Lifecycle

1. **Requirements:** Functional boundaries, module scope, limits, and answers to domain-specific architectural questions. (`MODULE_REQUIREMENTS.md`)
2. **Architecture:** High-level abstractions and pattern definitions.
3. **Database:** Prisma model mappings, tenant isolation strategy, and optimistic locking plans. (`MODULE_DATABASE_DESIGN.md`)
4. **API:** Endpoint definitions, payloads, and permission boundaries. (`MODULE_API_SPEC.md`)
5. **Implementation:** Executed strictly layer-by-layer (Prisma -> Repositories -> Services -> Controllers).
6. **Unit Tests:** Validating business rules, state transitions, and mocked behaviors.
7. **Integration Tests:** Validating database transactions, locking, and real-world queries.
8. **E2E Tests:** Validating HTTP boundaries, Auth, RBAC, and payload delivery.
9. **Performance Tests:** SLA benchmarking using exact load generation (not estimates).
10. **Static Analysis:** ESLint, TypeScript compilation, Prisma validation, and CI checks.
11. **Independent Verification:** An adversarial, static architectural audit validating that no constitutional boundaries (e.g., God modules, controller-to-db logic, cross-tenant leakage) were breached, prior to Certification execution.
12. **Evidence Index:** The single source of truth mapping all implementation claims directly to the physical artifacts (CI logs, coverage reports, test files) proving the claims. (`MODULE_EVIDENCE_INDEX.md`)
13. **Certification:** Documenting the implementation evidence with explicit reference to the Evidence Index. (`MODULE_CERTIFICATION.md`)
14. **Freeze:** The module is frozen ONLY when all empirical evidence is verified and no technical debt remains. Status updated in `PLATFORM_HEALTH.md`.
