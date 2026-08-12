# Admissions: Reference Implementation Guide

This document is the definitive engineering guide for building modules on SchoolOS. The **Admissions** module serves as the Certified Reference Implementation. All future modules (Finance, Students, HR, etc.) must conform to these identical architectural lifecycles.

## 1. Request Lifecycle
- All HTTP requests enter via `@nestjs/common` Controllers.
- Controllers are strictly mapped to `v1`, `v2`, etc.
- **Rule:** Controllers never contain business logic. They solely map HTTP DTOs into CQRS Commands or Queries and return HATEOAS or standard JSON responses.

## 2. CQRS Lifecycle
- **Commands** (`application/commands/`) describe intent.
- **Command Handlers** (`application/command-handlers/`) orchestrate the transaction:
  1. Fetch the Aggregate from the Repository.
  2. Verify expected `version` for Optimistic Concurrency.
  3. Execute domain methods via the Workflow SDK.
  4. Save the Aggregate.
  5. The Repository dispatches Domain Events.
- **Queries** (`application/queries/`) request data.
- **Query Handlers** (`application/query-handlers/`) read *exclusively* from Projections (Prisma `prj_*` tables).

## 3. Event Lifecycle
- All Domain Events are strictly versioned and documented in `EVENT_REGISTRY.md`.
- Subscribers (`application/subscribers/`) listen to events asynchronously.
- Payloads only contain IDs and delta states, never full entities.

## 4. Projection Lifecycle
- Projections are specialized, flat, read-optimized tables.
- **Health Metadata:** Every projection must track `projectionVersion`, `healthStatus`, `lag`, `lastRebuild`, and `replayDurationMs`.
- **Replayability:** A projection can be dropped and rebuilt from the Event Store at any time without data loss.

## 5. Worker Lifecycle
- Background processing is strictly typed (`ProjectionWorker`, `NotificationWorker`, etc.).
- **Matrix:** All workers must handle crashes (via DLQ), automatic restarts (exactly-once via Idempotency keys), and permanent failures (alerting).

## 6. Frontend Architecture
- **Hybrid Approach:**
  - **React Server Components (RSC):** Layouts, Auth Bootstrap, Tenant Context, Navigation.
  - **React Query:** Interactive data tables, infinite scrolling, client-side polling, Kanbans.

## 7. Recovery Procedures
- Covered in `simulate-operational-recovery.ts`. Ensure Idempotency repositories and event replaying scripts are maintained.

## 8. Extension Guide for Future Modules
To build the next module (e.g., `Finance`):
1. Duplicate the `admissions/` folder structure.
2. Define the isolated Domain Aggregates and Events.
3. Hook into the existing `core-platform` DDD primitives.
4. **DO NOT** modify `core-platform` without a global ADR approval.
