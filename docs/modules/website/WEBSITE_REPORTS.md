# Website Builder Reports

The Website module exposes the following structured reports to the Platform Reporting Engine.

## 1. Content Audit Report
* **Description:** A flat table of all pages, their current status (Draft/Published/Archived), last modified date, and last modified user.
* **Audience:** Content Managers & School Admins.
* **Export:** CSV / PDF.

## 2. Broken Link Report
* **Description:** Scheduled worker execution that crawls `NavigationItem` and `contentBlocks` to flag 404ing internal or external URLs.
* **Audience:** Webmasters.
* **Export:** CSV.

## 3. Storage Quota Report
* **Description:** Breakdown of asset consumption (Images, Documents, Videos) versus the Tenant's subscription limits.
* **Audience:** School Admins & Finance.
* **Export:** Dashboard UI / CSV.
