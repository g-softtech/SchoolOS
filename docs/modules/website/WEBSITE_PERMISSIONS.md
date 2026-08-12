# Website Builder Permissions

This document defines the RBAC tokens utilized by the `PoliciesGuard` to authorize actions on the Website module endpoints.

## Granular Permissions
* `website:read` - View website configurations and active custom domains.
* `website:update` - Modify branding, theme, and SEO globals.
* `page:read` - View draft and published page data in the CMS.
* `page:create` - Create new draft pages.
* `page:update` - Modify content blocks and SEO metadata on existing pages.
* `page:publish` - Transition a page from Draft to Published, emitting live events.
* `page:archive` - Transition a page from Published to Archived, tearing down routing.
* `navigation:update` - Modify the global Header and Footer navigation structures.
* `asset:read` - View the tenant's media library.
* `asset:create` - Upload new files to the media library.
* `asset:delete` - Hard-delete files from the media library and storage bucket.

## Role Defaults
* **Super Admin**: Bypasses all, implicit full access.
* **School Admin**: Full access to all website permissions.
* **Content Editor**: Has `page:*`, `asset:*`, and `navigation:update`. Does NOT have `website:update`.
* **Teacher/Staff**: No website permissions by default.
