# Database Standards (Constitution)

This document dictates the absolute rules and architectural conventions for the Prisma schema. It prevents architectural drift and ensures the SaaS platform remains enterprise-grade as it scales to 150+ models.

## 1. Multi-Tenancy (Zero Trust Isolation)
- **Every tenant-owned table MUST have a `tenantId` field.** 
- **Exception**: Global tables (e.g., `User`, `PlatformPlan`, `Tenant`, `MarketplaceApp`) that sit above the tenant boundary.
- **Foreign Key**: `tenantId` must reference the `Tenant` model via strict foreign key relation.
- **Indexing**: Every tenant-isolated model MUST have an index on `[tenantId]` to optimize middleware filtering.
- **Composite Unique Constraints**: Unique constraints on tenant-isolated models MUST include `tenantId` (e.g., `@@unique([tenantId, email])`).

## 2. Identifiers & Primary Keys
- **Primary Keys**: Every model uses `id String @id @default(uuid())` or `cuid()`. We will standardize on `uuid()`.
- **References**: Foreign keys must be strongly typed and clearly named (e.g., `studentId`, `academicYearId`).

## 3. Timestamps & Auditing
- **Created / Updated**: Every table MUST include:
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- **Soft Deletes**: Mission-critical entities (e.g., `Tenant`, `User`, `Invoice`, `Result`) must use a `deletedAt DateTime?` field or a Status Enum instead of hard deletion.
- **Audit Logging**: Destructive or critical business actions will spawn an `AuditLog` entry detailing the `action`, `userId`, `tenantId`, and `metadata` (before/after states).

## 4. Naming Conventions
- **Models**: PascalCase (e.g., `AcademicYear`, `StudentGuardian`).
- **Fields**: camelCase (e.g., `firstName`, `academicYearId`).
- **Enums**: PascalCase for name, UPPER_SNAKE_CASE for values (e.g., `enum PaymentStatus { PENDING, PAID, OVERDUE }`).
- **Relations**: 
  - Plural camelCase for one-to-many (e.g., `students Student[]`).
  - Singular camelCase for one-to-one or many-to-one (e.g., `academicYear AcademicYear @relation(...)`).

## 5. Constraints & Indexes
- **Foreign Keys**: Must be indexed explicitly if queried frequently, particularly alongside `tenantId`.
- **Cascades**: Use `onDelete: Cascade` selectively for weak entities (e.g., deleting a `Student` cascades to their `Attendance`), but use `onDelete: Restrict` for critical entities (e.g., cannot delete an `AcademicYear` if `Sessions` exist).

## 6. Logic Separation
- **No Business Logic in Prisma**: Prisma is purely for data access and integrity. Complex validation (e.g., ensuring a student's age matches the class requirement) belongs in the NestJS application layer, not the database.

## 7. Migration & Versioning Strategy
- Migrations are generated via `prisma migrate dev`.
- Never edit a generated migration file unless fixing a specific index concurrent creation.
- Breaking changes must follow a "expand-and-contract" pattern (add new column, migrate data, drop old column in a later release).
