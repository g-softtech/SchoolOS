# PLATFORM CERTIFICATION

This is the constitutional document of SchoolOS. Every developer, system, and module must adhere to these rules without exception. 
Changes to this architecture require a formal Architectural Decision Record (ADR).

## 1. Engineering Constitution
No sprint or module is considered complete until it is production-ready.
A module is production-ready ONLY if it satisfies security, analytics, audit, testing, and documentation requirements.

## 2. Certification Modes (CRITICAL)
Certification governance is governed by two strict execution modes:

- **Pipeline Development Mode**: Synthetic artifacts (e.g. fake coverage JSON files or dummy test logs) are permitted **ONLY** when developing or testing the certification infrastructure itself (e.g. `certify-module.ts`).
- **Module Certification Mode**: When evaluating an actual module (e.g. Students, Academics), all artifacts MUST originate from the real toolchain. The module must be run through the CI workflow with a real PostgreSQL database. Synthetic artifacts are strictly forbidden and will invalidate the certification, reverting the module to `🟡 Freeze Pending Independent Evidence Review` or `🔴 Uncertified`.

## 3. Architectural Layers
The platform follows a strict N-tier event-driven architecture decoupled from UI and infrastructure concerns.
The central layers are API Gateway (NestJS) -> Services -> Repositories -> Data Layer (Prisma).

## 4. Dependency Rules
See [DEPENDENCY_MATRIX.md](file:///c:/my_school_app/saas-platform/docs/architecture/DEPENDENCY_MATRIX.md) for strict coupling enforcement.

## 5. Module Lifecycle
Modules MUST follow the 12-Step Lifecycle defined in [MODULE_TEMPLATE.md](file:///c:/my_school_app/saas-platform/MODULE_TEMPLATE.md).

## 6. API Standards
- **Wrapper**: All responses must use the standardized `ApiResponseDto` format: `{ success, data, meta, errors }`.
- **Pagination**: Use cursor-based pagination for highly scalable endpoints; support offset pagination for smaller datasets.
- **Versioning**: All API controllers must explicitly version paths (e.g., `/api/v1/admissions`).
- **Validation**: Strict `class-validator` DTOs must encapsulate all inputs.

## 7. Security Standards
See [SECURITY_REQUIREMENTS.md](file:///c:/my_school_app/saas-platform/docs/architecture/SECURITY_REQUIREMENTS.md).

## 8. Performance Budgets
See [PERFORMANCE_BASELINES.md](file:///c:/my_school_app/saas-platform/docs/architecture/PERFORMANCE_BASELINES.md).

## 9. Event Rules
- **Naming**: Strict hierarchical format: `Domain.Entity.Action` (e.g., `Admissions.Application.Submitted`).
- **Emission**: Repositories NEVER emit events. Events are emitted by Business Services AFTER successful mutation.
- **Tracking**: All events must be registered in [EVENT_REGISTRY.md](file:///c:/my_school_app/saas-platform/docs/architecture/EVENT_REGISTRY.md).

## 10. Database Rules
- **No Direct Access**: Controllers and Services must NEVER access Prisma directly.
- **Soft Delete**: Use `deletedAt` and `deletedBy` for all primary domain entities.
- **Concurrency**: Use Optimistic Locking (`version` field) on mutable records.
- **Keys**: UUID only for foreign keys. Sequential/Readable IDs are presentation concerns.

## 11. Repository Rules
- Abstract standard CRUD operations into a `BaseRepository`.
- Use the **Specification Pattern** (`search(spec)`) instead of `findByX()` explosion.
- Expose an abstract `transaction(async tx => {})` wrapper to keep Prisma out of services.

## 12. Service Rules
- Pure business logic. Focus on validation, workflow transitions, policies, and event emission.
- Avoid God-Classes. Decompose services (e.g., `AdmissionApplicationService`, `AdmissionWorkflowService`).
- Services must NOT handle HTTP responses, generate PDFs, or send emails (delegate to subscribers).

## 13. Controller Rules
- Controllers perform Routing, DTO validation, Authorization, and calling Services.
- Absolutely ZERO business logic.

## 14. Testing Requirements
- Unit tests for all business services.
- Integration tests for Repository/Prisma compliance.
- E2E tests covering complete API lifecycles.

## 15. Freeze Requirements
- A module must satisfy every layer in the Quality Checklist before freezing. Once frozen, refactors are blocked pending ADRs.

## 16. ADR Process
- New architectural patterns or rule exceptions must be proposed via an Architectural Decision Record and approved by the core engineering team.
