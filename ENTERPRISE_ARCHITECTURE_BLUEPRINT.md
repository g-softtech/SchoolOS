# SchoolOS Enterprise Architecture Blueprint

This blueprint serves as the definitive table of contents and central navigation for the entire SchoolOS platform. All architecture decisions, standards, and rules originate from these documents.

## 1. Platform Governance & Standards

These documents define the strict architectural boundaries that govern the platform. No business module may violate these constraints without a formal Architectural Decision Record (ADR).

- [PLATFORM_CERTIFICATION.md](file:///c:/my_school_app/saas-platform/docs/architecture/PLATFORM_CERTIFICATION.md): The engineering constitution and overarching rulebook.
- [PLATFORM_HEALTH.md](file:///c:/my_school_app/saas-platform/docs/architecture/PLATFORM_HEALTH.md): The executive dashboard tracking the completion status of all modules.
- [EVENT_REGISTRY.md](file:///c:/my_school_app/saas-platform/docs/architecture/EVENT_REGISTRY.md): The canonical dictionary of all domain events and their payloads.
- [DEPENDENCY_MATRIX.md](file:///c:/my_school_app/saas-platform/docs/architecture/DEPENDENCY_MATRIX.md): The golden rules preventing accidental coupling between system layers.
- [PERFORMANCE_BASELINES.md](file:///c:/my_school_app/saas-platform/docs/architecture/PERFORMANCE_BASELINES.md): Mandatory SLAs and latency limits for module operations.
- [SECURITY_REQUIREMENTS.md](file:///c:/my_school_app/saas-platform/docs/architecture/SECURITY_REQUIREMENTS.md): Core platform security protocols (Auth, MFA, Tenancy, Limits).

## 2. Module Development Lifecycle

Every business module strictly follows this lifecycle template.

- [MODULE_TEMPLATE.md](file:///c:/my_school_app/saas-platform/MODULE_TEMPLATE.md): The 12-Step Lifecycle, 16-point Quality Checklist, and canonical folder structure for the Shared Starter Kit.

## 3. Business Modules

The core functional domains of SchoolOS. Each module contains its own local documentation and design artifacts.

### Admissions (Reference Module)
- [ADMISSIONS_REQUIREMENTS.md](file:///c:/my_school_app/saas-platform/docs/modules/admissions/ADMISSIONS_REQUIREMENTS.md)
- [ADMISSIONS_DATABASE_DESIGN.md](file:///c:/my_school_app/saas-platform/docs/modules/admissions/ADMISSIONS_DATABASE_DESIGN.md)
- [ADMISSIONS_API_SPEC.md](file:///c:/my_school_app/saas-platform/docs/modules/admissions/ADMISSIONS_API_SPEC.md)
- [ADMISSIONS_TEST_PLAN.md](file:///c:/my_school_app/saas-platform/docs/modules/admissions/ADMISSIONS_TEST_PLAN.md)

### Students (Planned)
### Finance (Planned)
### HR (Planned)
### Library (Planned)

## 4. Architectural Decision Records (ADRs)
*(Directory for tracking deviations or structural migrations)*
- `docs/architecture/adrs/`

## 5. Execution Plans
- [MASTER_EXECUTION_PLAN.md](file:///c:/my_school_app/saas-platform/MASTER_EXECUTION_PLAN.md): Historic log of sprints and architectural execution checkpoints (e.g. from CortexFit lessons).
