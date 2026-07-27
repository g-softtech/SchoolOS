# ADR-010: Why Migration Engine

## Status
Accepted

## Context
Transitioning schools from the legacy MongoDB system to the new PostgreSQL SaaS is extremely risky. Running ad-hoc migration scripts often results in corrupt states or partially migrated data, leaving schools unable to operate.

## Decision
We will build a centralized `MigrationEngine` (Phase 5.8) that serves as the entry point for all legacy data. It will map old MongoDB paradigms to our new PostgreSQL structure.

## Consequences
- **Positive:** Enables Dry-Run capabilities (reporting errors before committing), rigorous validation rules, data transformation (e.g., standardizing phone numbers), and Rollbacks. 
- **Negative:** Requires significant upfront investment to build the mappers and validation pipelines before actually migrating a school.
