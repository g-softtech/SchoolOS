# Website Builder Database Design

This document maps the Prisma models for Phase 7, strictly enforcing tenant isolation and optimistic locking.

## Core Models

### 1. `Website`
* `id` (UUID, PK)
* `tenantId` (String, Unique, FK)
* `name` (String)
* `customDomain` (String, Unique)
* `branding` (JSON)
* `themeId` (String)
* `version` (Int)
* `deletedAt`, `deletedBy`

### 2. `Page`
* `id` (UUID, PK)
* `websiteId` (String, FK)
* `tenantId` (String, FK)
* `title` (String)
* `slug` (String)
* `contentBlocks` (JSON)
* `status` (Enum: DRAFT, PUBLISHED, ARCHIVED)
* `seoMetadata` (JSON)
* `locale` (String)
* `version` (Int)
* `deletedAt`, `deletedBy`

### 3. `PageVersion`
* `id` (UUID, PK)
* `pageId` (String, FK)
* `tenantId` (String, FK)
* `snapshot` (JSON)
* `createdAt` (DateTime)
* `createdBy` (String, FK User)

### 4. `NavigationMenu` & `NavigationItem`
* **NavigationMenu:** (e.g. "Main Header", "Footer Legal")
  * `id`, `websiteId`, `tenantId`, `location`, `locale`
* **NavigationItem:**
  * `id`, `menuId`, `parentId` (Self-relation for nesting), `label`, `url`, `sortOrder`, `isExternal`, `requiresAuth`

### 5. `Asset`
* `id` (UUID, PK)
* `tenantId` (String, FK)
* `originalName` (String)
* `mimeType` (String)
* `storageKey` (String) - Points to S3/GCP via PlatformStorageService
* `cdnUrl` (String)
* `sizeBytes` (Int)
* `metadata` (JSON - width, height, blurhash)

### 6. `RedirectRule`
* `id` (UUID, PK)
* `tenantId` (String, FK)
* `sourcePath` (String)
* `destinationPath` (String)
* `statusCode` (Int - 301/302)
