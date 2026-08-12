# Enterprise Data Dictionary

This document dictates every model, field, enum, relationship, index, and constraint for the School SaaS Platform before any `schema.prisma` code is generated.

## Global Rules & Constraints
- **Primary Keys**: UUID `id` string for all models.
- **Timestamps**: Every model includes `createdAt` (default now) and `updatedAt` (auto-update).
- **Multi-Tenancy**: Every model (except Platform & Global Identity) MUST have a `tenantId` field and a Foreign Key to `Tenant`.
- **Indexing**: Every tenant-isolated model MUST have an index on `[tenantId]` to optimize middleware lookups.
- **Soft Deletes**: Key models (User, Tenant, Invoice, Result) will use a `deletedAt` field or `status` Enum to prevent accidental data loss.

---

## 1. Platform Domain
**`PlatformPlan`**
- Fields: `id`, `name` (String), `price` (Decimal), `entitlements` (JSON)
- Relations: One-to-Many with `Tenant`

**`Tenant` (The School)**
- Fields: `id`, `name` (String), `slug` (String, UNIQUE), `status` (Enum: ACTIVE, SUSPENDED, TRIAL, INACTIVE), `planId` (FK)
- Relations: One-to-Many with `Subscription`, `CustomDomain`, `TenantMembership`

**`Subscription`**
- Fields: `id`, `tenantId` (FK), `planId` (FK), `status` (Enum: ACTIVE, PAST_DUE, CANCELED), `currentPeriodEnd` (DateTime)
- Indexes: `[tenantId, status]`

**`CustomDomain`**
- Fields: `id`, `tenantId` (FK), `domain` (String, UNIQUE), `verified` (Boolean)

**`MarketplaceApp` (App Marketplace)**
- Fields: `id`, `tenantId` (FK), `appId` (String, e.g., 'library', 'hostel'), `enabled` (Boolean)
- Constraint: Unique on `[tenantId, appId]`

---

## 2. Identity Domain
**`User` (Global)**
- Fields: `id`, `email` (String, UNIQUE), `passwordHash` (String), `globalRole` (Enum: SUPER_ADMIN, USER)

**`TenantMembership`**
- Fields: `id`, `userId` (FK), `tenantId` (FK), `role` (Enum: SCHOOL_ADMIN, TEACHER, PARENT, STUDENT, ACCOUNTANT, etc.)
- Constraint: Unique on `[userId, tenantId]`

**`Profile`**
- Fields: `id`, `tenantMembershipId` (FK, UNIQUE), `firstName`, `lastName`, `phone`, `avatarUrl`

**`AuditLog`**
- Fields: `id`, `tenantId` (FK), `userId` (FK), `action` (String), `entity` (String), `entityId` (String), `metadata` (JSON), `ipAddress`, `userAgent`
- Indexes: `[tenantId, entity, entityId]`

---

## 3. Academic Domain
**`AcademicYear`**
- Fields: `id`, `tenantId` (FK), `name` (e.g., "2026/2027"), `startDate`, `endDate`, `status` (Enum: ACTIVE, UPCOMING, PAST)

**`Term` / `Session`**
- Fields: `id`, `tenantId` (FK), `academicYearId` (FK), `name` (e.g., "Fall Term"), `startDate`, `endDate`

**`Class` (e.g., Grade 10)**
- Fields: `id`, `tenantId` (FK), `name`, `level` (Int)

**`Arm` (e.g., 10A, 10B)**
- Fields: `id`, `tenantId` (FK), `classId` (FK), `name`
- Constraint: Unique `[classId, name]`

**`Subject`**
- Fields: `id`, `tenantId` (FK), `name`, `code` (String, UNIQUE per tenant)
- Relations: Many-to-Many with `Class` or `Arm`

---

## 4. Student Domain
**`Student`**
- Fields: `id`, `tenantId` (FK), `tenantMembershipId` (FK, linking to auth), `admissionNumber` (String, UNIQUE per tenant), `currentArmId` (FK), `enrollmentDate`

**`Guardian`**
- Fields: `id`, `tenantId` (FK), `tenantMembershipId` (FK)

**`StudentGuardian` (M2M)**
- Fields: `studentId` (FK), `guardianId` (FK), `relationship` (Enum: FATHER, MOTHER, OTHER)
- Constraint: PK is `[studentId, guardianId]`

**`MedicalRecord` & `Discipline`**
- Fields: `id`, `tenantId` (FK), `studentId` (FK), `details` (Text), `date` (DateTime)

---

## 5. Staff Domain
**`Staff`**
- Fields: `id`, `tenantId` (FK), `tenantMembershipId` (FK), `staffIdNumber` (String, UNIQUE per tenant), `departmentId` (FK), `designation` (String)

**`Payroll` / `Employment`**
- Fields: `id`, `tenantId` (FK), `staffId` (FK), `baseSalary` (Decimal), `bankDetails` (JSON), `status` (Enum: ACTIVE, TERMINATED)

**`LeaveRequest`**
- Fields: `id`, `tenantId` (FK), `staffId` (FK), `startDate`, `endDate`, `type` (Enum: SICK, ANNUAL, MATERNITY), `status` (Enum: PENDING, APPROVED, REJECTED)

---

## 6. Finance Domain
**`FeeCategory`**
- Fields: `id`, `tenantId` (FK), `name` (e.g., "Tuition", "Transport"), `amount` (Decimal), `mandatory` (Boolean)

**`Invoice`**
- Fields: `id`, `tenantId` (FK), `studentId` (FK), `termId` (FK), `totalAmount` (Decimal), `status` (Enum: DRAFT, SENT, PARTIAL, PAID, OVERDUE), `dueDate`

**`Payment`**
- Fields: `id`, `tenantId` (FK), `invoiceId` (FK), `amount` (Decimal), `method` (Enum: CARD, BANK_TRANSFER, CASH), `reference` (String, UNIQUE), `paymentDate`

**`Expense`** / **`Income`**
- Fields: `id`, `tenantId` (FK), `amount` (Decimal), `category` (String), `date`, `description`

---

## 7. Learning Domain
**`Attendance`**
- Fields: `id`, `tenantId` (FK), `studentId` (FK), `armId` (FK), `date` (DateTime), `status` (Enum: PRESENT, ABSENT, LATE, EXCUSED)
- Indexes: `[tenantId, studentId, date]`

**`Exam` & `CBT`**
- Fields: `id`, `tenantId` (FK), `subjectId` (FK), `termId` (FK), `title`, `totalMarks` (Decimal), `isCBT` (Boolean)

**`Result`**
- Fields: `id`, `tenantId` (FK), `examId` (FK), `studentId` (FK), `score` (Decimal), `grade` (String), `remarks` (String)
- Constraint: Unique `[examId, studentId]`

---

## 8. Website Builder Domain
**`Website`**
- Fields: `id`, `tenantId` (FK, UNIQUE), `themeColors` (JSON), `heroConfig` (JSON), `seoMeta` (JSON)

**`Page`**
- Fields: `id`, `tenantId` (FK), `websiteId` (FK), `slug` (String), `title` (String), `contentBlocks` (JSON), `isPublished` (Boolean)
- Constraint: Unique `[websiteId, slug]`

**`NavigationMenu`**
- Fields: `id`, `tenantId` (FK), `websiteId` (FK), `links` (JSON)

---

## 9. AI Domain
**`AIProviderConfig`**
- Fields: `id`, `tenantId` (FK), `provider` (Enum: OPENAI, ANTHROPIC), `settings` (JSON)

**`AIUsageLog`**
- Fields: `id`, `tenantId` (FK), `userId` (FK), `feature` (Enum: LESSON_PLANNER, REPORT_COMMENTS, TUTOR), `tokensUsed` (Int), `date`

**`PromptTemplate`**
- Fields: `id`, `tenantId` (FK), `feature` (Enum), `systemPrompt` (Text)

---

## 10. Enterprise Modules Domain (Marketplace Apps)
**`Hostel` / `Room` / `BedAllocation`**
- Fields: `id`, `tenantId`, `name`, `capacity`, `studentId` (FK)

**`Vehicle` / `Route` / `TransportAllocation`**
- Fields: `id`, `tenantId`, `vehiclePlate`, `driverName`, `studentId` (FK), `pickupPoint`

**`LibraryBook` / `Borrowing`**
- Fields: `id`, `tenantId`, `isbn`, `title`, `studentId` (FK), `borrowDate`, `returnDate`, `status` (Enum: ISSUED, RETURNED, OVERDUE)

**`InventoryAsset` / `PurchaseOrder`**
- Fields: `id`, `tenantId`, `itemName`, `quantity`, `unitPrice`

**`NotificationQueue`**
- Fields: `id`, `tenantId`, `userId` (FK), `channel` (Enum: EMAIL, SMS, PUSH), `payload` (JSON), `status` (Enum: PENDING, SENT, FAILED)
