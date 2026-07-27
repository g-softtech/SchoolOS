# ADR-002: Why Global Users

## Status
Accepted

## Context
In the legacy system, a user (e.g., a Teacher) belonged strictly to one school database. If that teacher moved to another school, or if a parent had children in two different schools, they needed multiple accounts and passwords. As we transition to a SaaS model, this approach is unsustainable and causes friction for multi-school entities.

## Decision
We will implement a Global User Identity model. A single `User` record will exist at the platform level. Access to individual schools will be managed through a `TenantMembership` junction table.

## Consequences
- **Positive:** Seamless SSO, single password for parents/staff across multiple schools, and a foundation for a unified SchoolOS ecosystem.
- **Negative:** Requires strict RBAC and TenantMiddleware to ensure a Global User cannot access Tenant A's data while logged into Tenant B's context.
