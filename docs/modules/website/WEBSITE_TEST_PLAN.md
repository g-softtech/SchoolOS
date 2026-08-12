# Website Builder Test Plan

This document governs the mandatory testing bounds for the Website Module prior to freeze certification.

## 1. Unit Tests
* **Target:** Pure business logic inside `PageService` and `NavigationService`.
* **Assertions:** 
  * Validate that blocks cannot be saved to an `ARCHIVED` page.
  * Validate that a `NavigationItem` cannot have itself as a `parentId` (circular dependency).

## 2. Integration Tests
* **Target:** `WebsiteRepository` and `PageRepository` via Prisma transaction logic.
* **Assertions:** 
  * Assert optimistic locking (`version`) correctly rejects concurrent edits on `Website.branding`.
  * Assert cascade soft-deletes (deleting a Website softly deletes all associated Pages).

## 3. Security & Tenant Isolation Tests (E2E)
* **Target:** The `/api/v1/website` HTTP boundary.
* **Assertions:**
  * HTTP 403 on `PATCH /api/v1/website/settings` without `website:update`.
  * HTTP 404 (or isolated boundary rejection) when Tenant A attempts to read Tenant B's Page via ID.

## 4. Edge Delivery Performance & Cache (E2E)
* **Target:** `/api/v1/public/website/resolve`.
* **Assertions:**
  * Validate payload strictly excludes internal metadata (`deletedBy`, `version`).
  * SLA Assertion: Route resolves in `<50ms` under load simulation (e.g. k6).
  * Invalidation Assertion: Ensure the `Website.PagePublished` event correctly clears the Redis edge-cache key for that specific slug.
