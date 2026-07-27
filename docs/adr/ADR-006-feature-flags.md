# ADR-006: Why Feature Flags

## Status
Accepted

## Context
As we build new features or deprecate old ones, deploying code to production should not automatically expose it to all tenants. Additionally, Marketplace Apps require a mechanism to enable/disable specific code paths based on billing.

## Decision
We will use a dedicated `FeatureFlagsService` backed by Redis. Controllers will be decorated with `@RequireFeature()` to enforce access at the routing level.

## Consequences
- **Positive:** Safely deploy unfinished features, enable beta testing for specific schools, and enforce billing restrictions seamlessly.
- **Negative:** Feature flags can accumulate over time if not cleaned up (flag rot).
