# CMS Reference Implementation

This document establishes the canonical architectural pattern for all future content-oriented modules in the SchoolOS SaaS platform (e.g., News, Blog, Announcements, Events, Landing Pages, Parent Portal content, Student Portal content, Help Center, Knowledge Base).

By adhering to this reference implementation, all future content modules will inherit a proven, constitutionally sound architecture without reinventing the wheel.

## 1. Content Modeling & Tenant Isolation
* **Strict Tenant Isolation:** Every content entity (Article, Event, Post, etc.) MUST have a `tenantId` mapping directly to the `Tenant` model.
* **Global Entities:** Any content entity without a `tenantId` is strictly a platform-level entity (e.g., global help center articles) and must be explicitly justified in the module's traceability matrix.
* **Optimistic Locking:** All mutable content entities MUST implement a `version` field for optimistic locking to prevent concurrent overwrite scenarios.
* **Soft Deletes:** Content entities MUST use `deletedAt` and `deletedBy` instead of hard deletes to preserve referential integrity and audit trails.

## 2. Headless Content Structure
* **Portable Text / Blocks:** Rich text MUST be stored as structured JSON (e.g., `contentBlocks`) rather than raw HTML strings. This enables headless consumption across web, mobile, and API clients without parsing HTML.
* **Separation of Presentation:** Content models must not store styling or presentation details. Presentation logic belongs to Themes and front-end rendering engines.

## 3. Asynchronous Publishing Lifecycle
* **Synchronous Publishing is Prohibited:** The act of "publishing" content MUST NOT synchronously regenerate cache, send emails, or build sitemaps.
* **Domain Events:** Publishing transitions MUST emit a Domain Event (e.g., `News.ArticlePublished`) from the Service layer.
* **Background Workers:** Subscribers to these events (via the Platform Event Bus / BullMQ) handle the heavy lifting (edge cache invalidation, search indexing, notification dispatch).

## 4. Edge Delivery & Caching
* **Public Endpoints:** Public-facing delivery APIs (e.g., `/api/v1/public/news/resolve`) MUST NOT enforce AuthGuard/PoliciesGuard if the content is truly public.
* **Latency SLA:** Public delivery endpoints MUST target `<50ms` response times by relying heavily on Edge CDN caching and Redis, falling back to database queries only on cache misses.
* **Cache Invalidation:** Edge caches are invalidated strictly via the background workers responding to published/archived domain events.

## 5. Storage Abstraction
* **No Direct Blob Access:** Content modules MUST NOT directly integrate with S3, GCP, or local filesystems.
* **Platform Storage Service:** All media (images, documents, attachments) MUST be processed through the `PlatformStorageService` and tracked via the `Asset` model mapping.

## 6. Strict Layering
* **Repositories:** Manage Prisma delegates and transactions ONLY. No business logic. No events.
* **Services:** Manage business workflow, validate logic, and are the EXCLUSIVE publishers of Domain Events.
* **Controllers:** Manage HTTP mapping, DTO validation, and RBAC (`@RequirePermission`). No Prisma access.

*Any deviation from this Reference Implementation requires a formal Architectural Decision Record (ADR).*
