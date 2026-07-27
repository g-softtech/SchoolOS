# ADR-005: Why Marketplace Apps

## Status
Accepted

## Context
Schools have drastically varying needs. A small primary school doesn't need Hostel Management, while a large secondary boarding school does. If we build everything into a monolith where all features are visible by default, the UX becomes overwhelming and monetization is limited.

## Decision
We will treat vertical domains (Library, Hostel, Transport) as "Apps" in a Tenant Marketplace. They will be toggled on/off via the Entitlements Engine.

## Consequences
- **Positive:** Cleaner UX for users, clear upsell paths for monetization, simpler tenant data segregation.
- **Negative:** Requires rigorous use of `@RequireFeature` guards across all APIs.
