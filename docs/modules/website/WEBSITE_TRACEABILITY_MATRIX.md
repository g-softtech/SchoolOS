# Website Builder Traceability & Dependency Matrix

This document provides the final, exhaustive verification of all Website module models, events, and dependencies prior to Prisma schema implementation.

## 1. Database Standards Verification
* **Tenant Isolation:** Every single model contains `tenantId` mapped to the frozen `Tenant` core model.
* **UUID Primary Keys:** Enforced `id` mapped to `String @id @default(uuid())`.
* **Cascade vs Restrict:** Models tightly coupled to tenant lifecycle cascade (e.g. `Website` cascades on `Tenant` delete). Weak relationships Restrict (e.g., `PageVersion.createdBy` restricts deletion of `User`).
* **Composite Indexes:** Implemented on `[tenantId, slug]` (Pages) and `[tenantId, customDomain]` (Websites) to ensure lightning-fast tenant-bound queries.
* **Search Indexes:** Gin/B-Tree indexing applied to `slug`, `title`, and `customDomain`.
* **Cursor Pagination Readiness:** `createdAt` and `id` sorting natively supported for edge-optimized queries.
* **File Storage:** `Asset` model strictly stores the cloud `storageKey`, absolutely no binary BLOBs in Postgres.
* **JSON Usage:** Constitutionally justified for `Website.branding` (schema-less CSS variables), `Page.contentBlocks` (portable text blocks), and `Page.seoMetadata` (flexible key-value meta tags).

---

## 2. Comprehensive Model Traceability Matrix

### Model: `Website`
* **Purpose:** Core singleton representing a tenant's public presence.
* **Tenant Ownership:** 1:1 with `tenantId`.
* **Relationships:** 1:M (Domains, Pages, Menus, Assets, Redirects, Themes).
* **Indexes:** `[tenantId]` (Unique).
* **Constraints:** One active website per tenant.
* **Soft Delete:** `deletedAt`, `deletedBy`.
* **Optimistic Locking:** `version` (Int).
* **Audit:** Required for creation and updates.
* **Events:** `Website.Created`, `Website.Updated`, `Website.Deleted`.
* **Repository/Service:** `WebsiteRepository` / `WebsiteService`.
* **Permissions:** `website:read`, `website:update`.
* **Analytics/Reports/Widgets:** CMS Operational Analytics.
* **Migration:** Requires mapping legacy school profiles to the `branding` JSON structure.

### Model: `WebsiteDomain`
* **Purpose:** Maps custom domains to a Website.
* **Tenant Ownership:** Mapped via `websiteId` -> `tenantId`.
* **Relationships:** M:1 (Website).
* **Indexes:** `[domainName]` (Unique system-wide).
* **Soft Delete:** Yes.
* **Events:** `Website.DomainMapped`, `Website.DomainUnmapped`.
* **Repository/Service:** `DomainRepository` / `WebsiteService`.

### Model: `Theme`
* **Purpose:** Design blueprints governing structural layout and styling limits.
* **Tenant Ownership:** Global (Platform-wide) OR Tenant-specific. If Global, `tenantId` is null.
* **Soft Delete:** Yes.
* **Events:** `Website.ThemeChanged`.
* **Repository/Service:** `ThemeRepository` / `ThemeService`.

### Model: `Page`
* **Purpose:** A renderable public or private webpage.
* **Tenant Ownership:** Strictly bounded to `tenantId`.
* **Relationships:** 1:M (PageVersions), M:1 (Website).
* **Indexes:** `[tenantId, slug]` (Unique).
* **Soft Delete:** Yes.
* **Optimistic Locking:** Yes.
* **Events:** `Website.PageCreated`, `Website.PageUpdated`, `Website.PagePublished`, `Website.PageArchived`.
* **Repository/Service:** `PageRepository` / `PageService`.
* **Permissions:** `page:read`, `page:create`, `page:update`, `page:publish`.

### Model: `PageVersion`
* **Purpose:** Immutable snapshot of a Page for rollback capabilities.
* **Tenant Ownership:** Bounded to `tenantId`.
* **Relationships:** M:1 (Page, User).
* **Soft Delete:** No (Immutable).
* **Repository/Service:** `PageVersionRepository` / `PageService`.

### Model: `NavigationMenu` & `NavigationItem`
* **Purpose:** Defines link architecture (Header, Footer).
* **Tenant Ownership:** Bounded to `tenantId`.
* **Relationships:** 1:M (Items), self-referencing `parentId` on Items.
* **Indexes:** `[tenantId, location]`.
* **Events:** `Website.NavigationUpdated`.
* **Repository/Service:** `NavigationRepository` / `NavigationService`.

### Model: `Asset`
* **Purpose:** Tracks media library uploads mapping to cloud storage.
* **Tenant Ownership:** Bounded to `tenantId`.
* **Indexes:** `[tenantId, mimeType]`.
* **Soft Delete:** Yes.
* **Events:** `Website.AssetUploaded`, `Website.AssetDeleted`.
* **Repository/Service:** `AssetRepository` / `AssetService`.
* **Permissions:** `asset:create`, `asset:delete`.

### Model: `Redirect`
* **Purpose:** 301/302 edge-level routing.
* **Tenant Ownership:** Bounded to `tenantId`.
* **Indexes:** `[tenantId, sourcePath]`.
* **Repository/Service:** `RedirectRepository` / `WebsiteService`.

---

## 3. Event Matrix Verification

| Event Name | Producer | Subscriber(s) | Payload | Version | Retry | Dead-Letter |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Website.Created` | `TenantProvisioningService` | `WebsiteService` | `{ tenantId, name }` | 1 | 5 | Yes |
| `Website.Updated` | `WebsiteService` | `AuditSubscriber` | `{ tenantId, fields }` | 1 | 3 | Yes |
| `Website.Deleted` | `TenantTeardownService` | `WebsiteService` | `{ tenantId }` | 1 | 5 | Yes |
| `Website.ThemeChanged` | `WebsiteService` | `CssCompilerWorker`, `CacheInvalidator` | `{ tenantId, themeId }` | 1 | 3 | Yes |
| `Website.DomainMapped` | `WebsiteService` | `SslProvisioningWorker` | `{ tenantId, domain }` | 1 | 5 | Yes |
| `Website.PageCreated` | `PageService` | `AuditSubscriber` | `{ tenantId, pageId }` | 1 | 3 | No |
| `Website.PageUpdated` | `PageService` | `AuditSubscriber` | `{ tenantId, pageId }` | 1 | 3 | No |
| `Website.PagePublished` | `PageService` | `EdgeCacheInvalidator`, `SearchIndexer` | `{ tenantId, pageId, slug }` | 1 | 5 | Yes |
| `Website.PageArchived` | `PageService` | `EdgeCacheInvalidator` | `{ tenantId, pageId }` | 1 | 5 | Yes |
| `Website.AssetUploaded` | `AssetService` | `MediaOptimizerWorker` | `{ tenantId, assetId, storageKey }` | 1 | 3 | Yes |
| `Website.NavigationUpdated`| `NavigationService`| `EdgeCacheInvalidator` | `{ tenantId, menuId }` | 1 | 3 | Yes |

---

## 4. Dependency Verification

I certify that the Website Module strictly depends **only** on approved Platform Kernel elements:
* **Identity / RBAC:** Utilizes `PoliciesGuard` and `WorkspaceContextInterceptor`.
* **Storage:** Interacts strictly via `PlatformStorageService` (no direct AWS/GCP SDK usage).
* **Event Bus:** Uses `@saas/core-platform` Event Bus for all async communication.
* **Audit & Analytics:** Emits explicitly mapped events for centralized telemetry consumption.
* **Feature Flags:** Entitlements and quotas checked via the existing `PlatformSubscription` module.
