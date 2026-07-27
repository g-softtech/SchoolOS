# MASTER EXECUTION PLAN (SchoolOS SaaS)

This document is the "Constitution" of the SchoolOS project. It is the single source of truth for the entire project lifecycle, architectural guidelines, and AI development rules. **Every developer or AI agent must read this document before touching the codebase.**

## References
- `ENTERPRISE_ARCHITECTURE_BLUEPRINT.md`
- `ENTERPRISE_DATA_DICTIONARY.md`
- `DATABASE_STANDARDS.md`
- `LEGACY_FEATURE_MATRIX.md`
- `MIGRATION_ROADMAP.md`
- `PARITY_CHECKLIST.md`

## Project Health Dashboard
| Phase              | Status     |
| ------------------ | ---------- |
| Planning           | ✅ Complete |
| Foundation         | ✅ Complete |
| Database           | ✅ Complete |
| Platform Services  | ✅ Complete |
| Infrastructure     | ✅ Complete |
| Platform Kernel    | ✅ Complete |
| Migration Engine   | ✅ Complete |
| Platform Lock      | 🔄 Current |
| Authentication     | ⏳ Pending  |
| Admissions         | ⏳ Pending  |
| Student Management | ⏳ Pending  |
| Academics          | ⏳ Pending  |
| Finance            | ⏳ Pending  |
| HR                 | ⏳ Pending  |
| Website Builder    | ⏳ Pending  |
| AI                 | ⏳ Pending  |
| Marketplace        | ⏳ Pending  |
| Legacy Migration   | ⏳ Pending  |

---

## 1. Vision
Transform a legacy monolithic School Management System into an enterprise-grade SchoolOS SaaS platform. Enable multi-tenant scalability, white-label website building, advanced AI integration, and modular app-store mechanics without compromising data isolation.

## 2. Engineering Constitution
- **Zero Architectural Debt:** Do not skip foundation steps for feature velocity.
- **Tenant Isolation:** Every table, query, and API must enforce `tenantId`.
- **Event-Driven:** Business logic must be decoupled using Domain Events via the Platform Kernel.

## 3. Architectural Principles
- **Global User Identity:** One user account can access multiple schools (Tenant Memberships).
- **Kernel Facade:** Modules do not speak directly to infrastructure (Redis, S3, Email). They speak to the Platform Kernel.
- **SaaS Marketplace:** Modules are treated as apps that can be enabled/disabled via Feature Flags and Entitlements.

## 4. Technology Stack
- **Frontend:** Next.js (React), Tailwind CSS, Vanilla CSS for micro-animations
- **Backend:** NestJS, BullMQ, Redis, Node.js
- **Database:** PostgreSQL via Prisma ORM
- **Infrastructure:** Docker, PNPM Monorepo

## 5. Platform Foundation
The foundation is **FROZEN**. Nobody touches the Database structure, Platform Services, Infrastructure, Kernel, or Event Bus unless addressing a critical bug.

## 6. Execution Phases
1. **Phases 1-5.9:** Platform Foundation & Lock (Current)
2. **Phase 6:** Identity, Authentication, Tenant Memberships, RBAC, School Creation Wizard
3. **Phase 7:** Website Builder and CMS
4. **Phase 8-18:** Vertical Business Modules (Admissions, Students, Finance, etc.)
5. **Phase 19+:** Post-Launch Enhancements (AI, Analytics, Mobile)

## 7. Module Lifecycle
Every module MUST pass through these 8 steps before being marked complete:
1. **Design:** Schema and API contracts.
2. **Database:** Prisma schema addition (`prisma format` + `prisma validate`).
3. **API:** Controller and Service implementation via the Platform Kernel.
4. **Permissions:** Apply `@RequirePermission` and `@RequireFeature` guards.
5. **Analytics:** Ensure Domain Events are emitted for Analytics Subscribers.
6. **Migration:** Plug module into the Legacy Migration Engine.
7. **Tests:** Unit and E2E validation.
8. **Documentation:** OpenAPI (Swagger) and module README updates.

## 8. Quality Gates
No module merges to `master` without passing CI checks, Dependency Cruiser rules, and tenant-isolation validations.

## 9. Testing Strategy
- Unit tests for all pure business logic.
- E2E tests for API routes to guarantee Tenant Isolation and RBAC.

## 10. Migration Strategy
Legacy data is NOT copied. The Migration Engine (Phase 5.8) maps old MongoDB documents to new PostgreSQL records, validates them via Dry-Runs, and orchestrates rollback-able imports using the new APIs.

## 11. Deployment Strategy
- **CI/CD:** Automated builds via GitHub Actions.
- **Environments:** Staging (for legacy migration dry-runs) and Production.
- **Database:** Prisma Migrations applied automatically on deploy.

## 12. Documentation Standards
- Keep `README.md` updated per module.
- Maintain Architecture Decision Records (ADRs) in `docs/adr/`.
- Cross-reference master documents rather than duplicating text.

## 13. Coding Standards
- Strict TypeScript (`noImplicitAny`, etc.).
- Prettier and ESLint enforcement.
- Avoid nested IF statements (early returns).

## 14. AI Development Rules
When an AI agent (Claude, Gemini, ChatGPT) contributes to this repository, it MUST adhere to the following rules:
- **Never bypass tenant isolation:** Always use `TenantMiddleware` and `request.tenant?.id`.
- **Never create duplicate business logic:** Delegate to the Platform Kernel.
- **Never access Prisma directly from UI components:** Frontend must call the API Gateway.
- **Every new module must emit domain events:** Do not hardcode side-effects.
- **Every write operation must be auditable:** Use the `@AuditAction()` decorator.
- **Every API must enforce permissions:** Use `@RequirePermission()` or `@RequireFeature()`.
- **Every module must expose analytics hooks:** Via Domain Events.
- **Every module must support import/export:** Via the Migration Engine.
- **Every module must support feature flags:** To enable Marketplace toggling.
- **Every module must be marketplace-compatible:** No hardcoded inter-module dependencies.
- **Every module must follow the 8-step lifecycle:** Do not skip to Tests or Docs.

## 15. Future Roadmap
- Parent/Teacher Mobile Apps
- AI Lesson Planning & Analytics Chatbots
- Advanced Real-time Reporting Engine

## 16. Risk Register
- **Data Migration Loss:** Mitigated by Dry-Run Engine and immutable Audit Logs.
- **Tenant Data Bleed:** Mitigated by Zero-Trust Tenant Middleware + Prisma Client injection.

## 17. Decision Log Index
All major technical decisions are documented in `/docs/adr/`.
- ADR-001: Why PostgreSQL instead of MongoDB
- ADR-002: Why Global Users
- ADR-003: Why Event Bus
- ADR-004: Why Platform Kernel
- ADR-005: Why Marketplace Apps
- ADR-006: Why Feature Flags
- ADR-007: Why NextAuth Hybrid
- ADR-008: Why Redis
- ADR-009: Why BullMQ
- ADR-010: Why Migration Engine
