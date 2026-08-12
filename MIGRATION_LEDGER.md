# EduCore SaaS Migration Ledger & System Journal

## 1. System Version Lock Status
- **Node:** 20/22 LTS
- **Package Manager:** pnpm (Workspaces enabled)
- **Monorepo Engine:** Turborepo
- **Frontend Framework:** Next.js 15.x (React 19)
- **Backend Framework:** NestJS
- **Database Engine:** PostgreSQL 16 / Redis 7 / Mailpit
- **ORM:** Prisma 6.x

## 2. Completed Milestones Journal
### Phase 1: Legacy Code Freeze
- Single-tenant React + MongoDB repo frozen and isolated as read-only reference.
### Phase 2 & 3: Audit & Version Locking
- Forensics completed; structural parameters locked.
### Phase 4A: Repository Scaffolding
- Initialized workspace (`apps/`, `packages/`). Registered root script contracts. Fixed version drifts. Wired `dependency-cruiser`.

### Phase 4B: Platform Core Construction
- Instantiated Prisma Client with Zero-Trust extensions.
- Established `AsyncLocalStorage` multi-tenant context extraction.
- Un-mocked `isolation.e2e-spec.ts` using the real `AppModule`.

## 3. Active Phase Context: Phase 5 - Multi-Tenant Core (Auth & Subscriptions)
- **Current Objective:** Awaiting scoping requirements for authentication and subscription multi-tenancy.
- **Status:** Ready for architecture design phase.

## 4. Legacy Feature Parity Checklist (0% Migrated)
- [ ] Authentication & Role Scoping
- [ ] Admissions Module
- [ ] Student Management
- [ ] Fees & Invoice Configuration
- [ ] Grading & Result Engines
- [ ] Term Promotion Algorithms
- [ ] Timetable Generator
- [ ] Computer-Based Testing (CBT)
- [ ] Teacher & Parent Portals
