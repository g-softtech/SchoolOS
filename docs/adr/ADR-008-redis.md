# ADR-008: Why Redis

## Status
Accepted

## Context
A multi-tenant SaaS requires heavy reads for configuration, feature flags, entitlements, and sessions. Querying the PostgreSQL database for these values on every HTTP request creates an immense and unnecessary bottleneck.

## Decision
We will use Redis as the primary in-memory store for configuration caching, rate limiting, and session management.

## Consequences
- **Positive:** Massive performance improvements. Reduces database load. Enables distributed scaling (multiple API instances can share the same Redis cache).
- **Negative:** Adds infrastructure complexity and requires cache invalidation strategies (e.g., when a tenant updates their theme, the Redis cache must be explicitly purged).
