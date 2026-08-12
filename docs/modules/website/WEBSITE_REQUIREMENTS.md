# Website Builder & CMS Requirements

## 1. Domain Overview
The Website Builder allows multi-tenant schools to design and serve their public-facing websites directly from SchoolOS. It acts as a Headless CMS coupled with a static-rendering engine.

## 2. Constitutional Architecture Limits
- **God Module Prevention:** Decomposed into bounded services: `WebsiteService`, `PageService`, `NavigationService`, `AssetService`.
- **Tenant Leakage:** Absolutely zero cross-tenant data bleed. Pages, assets, and themes strictly bounded by `tenantId`.
- **Asset Direct Access:** Direct file access bypassing Storage abstraction is prohibited.
- **Synchronous Rendering:** Prohibited. Publishing emits domain events for background workers.

## 3. Architecture Answers
* **Multiple Websites:** No. A single tenant owns exactly one primary `Website` record. Multi-campus branding is handled within that site.
* **Domains:** A website can serve multiple custom domains mapped via DNS CNAME records.
* **SSL Certificates:** Automatically provisioned via the edge proxy (e.g. Caddy/Nginx) dynamically, managed by a background worker.
* **Multi-Language:** Supported via `locale` tags on `Page` and `NavigationMenu` entities.
* **Version History:** Yes, pages retain snapshot history via `PageVersion`.
* **Page Preview:** Yes, draft states can be rendered at a unique preview slug.
* **Scheduled Publishing:** Yes, managed via BullMQ delayed jobs emitting `Website.Page.Published`.
* **States:** Explicit enum states: `DRAFT`, `PUBLISHED`, `ARCHIVED`, `DELETED` (soft-delete).
* **Redirects:** Managed via a `RedirectRule` table evaluated at the edge router.

## 4. CMS Capabilities
* **Editor:** Block-based JSON editor (Headless). Rich-text is stored as portable text/JSON blocks, not raw HTML.
* **Reusable Assets:** Yes, `PageSection` components can be reused across layouts.
* **Reusable Layouts:** `PageTemplate` entities govern layout structures.
* **Dynamic Content:** Forms, Blogs, News, Events, and Galleries are supported via specific `ContentType` enums linked to Block definitions.

## 5. Assets & Media
* **Storage Abstraction:** Uploads interact exclusively with `PlatformStorageService` (AWS S3/GCP).
* **Optimization:** Background workers process uploads for WebP conversion and thumbnail generation.
* **CDN Compatibility:** All asset URLs are generated pointing to the platform's global CDN edge.
* **Versioning & Quotas:** Files are immutable (versions upload as new keys). Tenant quotas enforced in `AssetService` before upload.

## 6. Navigation
* **Nested Menus:** Supported via `parentId` self-relation in `NavigationItem`.
* **Header/Footer:** Categorized via `MenuLocation` enum.
* **Permission-aware:** Public by default, but links can require specific portal roles (e.g., "Parent Portal").
* **Ordering:** Defined via `sortOrder` integer.

## 7. Themes
* **Inheritance:** `Theme` entities support inheritance.
* **Branding:** CSS Variables (Primary, Secondary, Typography) stored as JSON in `Website.branding`.
* **Dark Mode:** Supported natively via CSS variable mapping.
* **Marketplace:** Themes are installable via the `MarketplaceApp` kernel.

## 8. SEO
* **Metadata:** `metaTitle`, `metaDescription`, `openGraph` tags are native to every `Page`.
* **Generation:** `sitemap.xml` and `robots.txt` are dynamically built by background workers on `Website.PagePublished`.
* **Canonical URLs & Structured Data:** Generated programmatically based on the active `customDomain`.

## 9. Performance
* **Static Caching:** Edge CDN caches published JSON blobs and HTML.
* **Invalidation:** Publishing a page emits a cache invalidation event to clear edge nodes.
* **SLA:** Public page rendering target is `<50ms` (Cached at Edge).
