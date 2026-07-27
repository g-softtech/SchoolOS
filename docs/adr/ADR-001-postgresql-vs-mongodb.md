# ADR-001: Why PostgreSQL instead of MongoDB

## Status
Accepted

## Context
The legacy School Management System was built on MongoDB. MongoDB provided flexibility during the early days of development when the schema was constantly changing. However, as the application grew into a multi-tenant SaaS, the lack of rigid relational integrity led to data inconsistencies, orphaned records, and complex aggregation pipelines that were difficult to maintain.

## Decision
We will migrate the entire platform to PostgreSQL using Prisma ORM.

## Consequences
- **Positive:** Strict referential integrity, cascading deletes for tenant isolation, simplified reporting, and robust transactions.
- **Negative:** Requires a strict schema upfront, making rapid unstructured data ingestion harder. Requires a dedicated Phase (5.8) to map legacy Mongo documents to relational tables.
