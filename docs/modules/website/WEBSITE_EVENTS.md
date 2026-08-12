# Website Builder Domain Events

The following events map the asynchronous boundaries of the Website module.

## Website Core
* `Website.Created`: Fired during tenant provisioning.
* `Website.Updated`: Fired on branding/SEO changes.
* `Website.Deleted`: Fired on tenant teardown.
* `Website.ThemeChanged`: Triggers background compilation of CSS variables.
* `Website.DomainMapped`: Triggers background SSL certificate provisioning.

## Content Lifecycle
* `Website.PageCreated`: Fired when a draft is created.
* `Website.PageUpdated`: Fired when blocks are saved (Debounced).
* `Website.PagePublished`: **CRITICAL**. Triggers Edge Cache invalidation, Sitemap regeneration, and search index updates.
* `Website.PageArchived`: Triggers Edge Cache invalidation and Redirect evaluations.
* `Website.PageScheduled`: Fired when a BullMQ job is queued for future publication.

## Media
* `Website.AssetUploaded`: Triggers background worker for Image Optimization, WebP generation, and Blurhash calculation.
* `Website.AssetDeleted`: Triggers Storage Provider cleanup.

## Layout
* `Website.NavigationUpdated`: Triggers Edge Cache invalidation for global layout wrappers.
