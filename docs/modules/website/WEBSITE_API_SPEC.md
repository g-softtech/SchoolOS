# Website Builder API Specification

All routes strictly run behind `/api/v1/website` and enforce `@RequirePermission`.

## 1. Website Settings (WebsiteService)
* `GET /api/v1/website/settings`
  * **Permissions:** `website:read`
  * **Response:** Website config, custom domains, active theme.
* `PATCH /api/v1/website/settings`
  * **Permissions:** `website:update`
  * **Payload:** Branding JSON, theme selection, SEO globals.
  * **Events:** `Website.Updated`, `Website.ThemeChanged`

## 2. Page Management (PageService)
* `GET /api/v1/website/pages`
  * **Permissions:** `page:read`
  * **Query:** cursor, status, locale
* `POST /api/v1/website/pages`
  * **Permissions:** `page:create`
  * **Payload:** title, slug, locale
  * **Events:** `Website.PageCreated`
* `PATCH /api/v1/website/pages/:id`
  * **Permissions:** `page:update`
  * **Payload:** contentBlocks, seoMetadata
  * **Events:** `Website.PageUpdated`
* `POST /api/v1/website/pages/:id/publish`
  * **Permissions:** `page:publish`
  * **Events:** `Website.PagePublished`
* `POST /api/v1/website/pages/:id/archive`
  * **Permissions:** `page:archive`
  * **Events:** `Website.PageArchived`

## 3. Navigation (NavigationService)
* `GET /api/v1/website/menus`
* `PUT /api/v1/website/menus/:id/items`
  * **Permissions:** `navigation:update`
  * **Payload:** Nested tree of NavigationItem objects.
  * **Events:** `Website.NavigationUpdated`

## 4. Assets (AssetService)
* `POST /api/v1/website/assets/upload`
  * **Permissions:** `asset:create`
  * **Multipart Form Data**
  * **Events:** `Website.AssetUploaded`
* `GET /api/v1/website/assets`
  * **Permissions:** `asset:read`
  * **Query:** cursor, mimeType

## 5. Public Delivery (Edge Delivery API)
* `GET /api/v1/public/website/resolve`
  * **Public Route**
  * **Query:** domain, path
  * **Response:** Pre-assembled JSON block tree + SEO + Navigation for Edge caching.
