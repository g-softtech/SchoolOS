# Module Development Template

Every module in SchoolOS (e.g., Admissions, Students, Finance, Library) MUST be constructed using this exact template. Consistency across modules is mandatory.

## Canonical Folder Structure (Module Starter Kit)
When creating a new module, scaffold it with this exact directory structure:

```text
module_name/
├── controllers/       # HTTP boundaries only
├── dto/               
│   ├── create/        # Creation payloads
│   ├── update/        # Modification payloads
│   ├── response/      # Standardized return wrappers
│   └── query/         # Specifications and filters
├── services/          # Pure business logic and domain boundaries
├── repositories/      # Prisma abstractions and transactions
├── specifications/    # Query patterns (Specification Pattern)
├── events/            # Domain event constants and wrappers
├── subscribers/       # Asynchronous event handlers
├── policies/          # Authorization Policy classes
├── widgets/           # Dashboard component definitions
├── analytics/         # Data aggregation logic
├── reports/           # PDF/CSV exporters
├── migrations/        # Data import tools for legacy system bridging
├── tests/             
│   ├── unit/          
│   ├── integration/   
│   └── e2e/           
├── docs/              # Module-specific ADRs and architecture
└── module.ts          # NestJS registration
```

## Module Certification Checklist

No module can be frozen and marked complete without passing every item on this list:

- [ ] **Database**: Models mapped, indexed, soft-deletes included, optimistic concurrency included.
- [ ] **Repository**: `BaseRepository` used, no business logic, transactions abstracted.
- [ ] **Services**: God classes avoided, zero Prisma queries, single responsibility.
- [ ] **Controllers**: Thin wrappers, strictly routing and DTO validation.
- [ ] **DTOs**: `class-validator` decorators applied universally.
- [ ] **Authorization**: `@RequirePermission` applied to all non-public endpoints.
- [ ] **Policy**: Policy Engine restrictions validated (e.g., limits, quotas).
- [ ] **Analytics**: Proper events emitted for dashboard metrics.
- [ ] **Audit**: Traceability for all sensitive mutations.
- [ ] **Widgets**: Configured for the global dashboard registry.
- [ ] **Reports**: Print layouts defined if necessary.
- [ ] **Migration**: Legacy data import strategies mapped out.
- [ ] **Tests**: Unit and E2E coverage baseline hit.
- [ ] **Documentation**: Swagger configured, local architecture documented.
- [ ] **Performance**: Endpoints pass SLA bounds (e.g., < 150ms).
- [ ] **Verification**: Independent evidence verification pipeline passes (`certify-module`).
- [ ] **Freeze**: Module architecturally locked and empirical evidence verified.

### Standardized Evidence Summary
Every certification report MUST contain the following Evidence Summary table to distinguish between expected artifacts and actual empirical evidence:

| Category               | Status |
| ---------------------- | ------ |
| Database Migration     |        |
| Schema Validation      |        |
| Static Analysis        |        |
| Architecture Audit     |        |
| Unit Tests             |        |
| Integration Tests      |        |
| E2E Tests              |        |
| Security Tests         |        |
| Performance Benchmarks |        |
| Coverage               |        |
| Documentation Sync     |        |
| Certification Pipeline |        |
| Freeze Status          |        |

### Strict Certification Rule
> **The certification pipeline should fail if any required evidence category is missing, unless that category is explicitly marked as "Not Applicable" by configuration.**

This ensures the pipeline remains the single source of truth rather than relying on manual interpretation.

## The 13-Step Module Lifecycle

Every module is built sequentially according to this 13-step lifecycle. **Do not skip steps.**

1. **Functional Design:** Document the exact requirements (`<MODULE>_REQUIREMENTS.md`).
2. **Database:** Design the Prisma schema (`<MODULE>_DATABASE_DESIGN.md`) and run `db push`.
3. **API:** Define the API specification (`<MODULE>_API_SPEC.md`).
4. **UI:** Design the UI components (reveals missing endpoints before permissions are finalized).
5. **Permissions:** Apply `@RequirePermission`, `@RequireFeature`, `@RequireMarketplaceApp` decorators.
6. **Analytics:** Hook into `EventEmitter2` for all metrics (e.g., `AdmissionSubmitted`).
7. **Audit:** Ensure sensitive actions (e.g., `AdmissionRejected`) trigger Audit Logs.
8. **Migration:** Write the migration engine scripts to pull from legacy DB into the new schema.
9. **Reports:** Build standard reports for the module.
10. **Widgets:** Create dashboard widgets.
11. **Testing**: Write Unit, Integration, and E2E tests.
12. **Verification Gate**: Independent automated static analysis, architecture audit, and coverage validation.
13. **Freeze**: Code review, architecture validation, tag release, and FREEZE.

## Legacy Migration Rule
Do **not** migrate legacy data during initial development.
- Build the module completely.
- Freeze it.
- Connect to the Migration Engine.
- Import data.
- Validate parity.
- Freeze again.
