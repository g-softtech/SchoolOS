# Academics Database Design

## Design Principles
- **Multi-tenancy**: Every core entity MUST include `tenantId`.
- **Soft Deletes**: Use `deletedAt` for soft-deletion to preserve academic history.
- **Audit Trails**: Standard `createdAt`, `updatedAt`, `createdBy`, `updatedBy` fields.
- **Optimistic Locking**: Use `@updatedAt` alongside `version` fields for concurrency if necessary.

## Entity Relational Schema

### 1. AcademicSession
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `name`: String (e.g. "2026/2027")
- `startDate`: DateTime
- `endDate`: DateTime
- `isActive`: Boolean

### 2. AcademicTerm
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `sessionId`: String (FK to AcademicSession)
- `name`: String (e.g. "First Term", "Fall Semester")
- `startDate`: DateTime
- `endDate`: DateTime
- `isActive`: Boolean

### 3. Curriculum
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `name`: String (e.g. "National Core Curriculum")
- `description`: String?

### 4. Subject
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `code`: String (e.g. "MTH101")
- `name`: String (e.g. "Mathematics")
- `description`: String?
- `credits`: Int?

### 5. CurriculumSubject (M:N mapping)
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `curriculumId`: String (FK to Curriculum)
- `subjectId`: String (FK to Subject)
- `isCore`: Boolean

### 6. ClassLevel
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `name`: String (e.g. "JSS 1")
- `orderIndex`: Int (Used for promotions, e.g. 1)

### 7. ClassSection
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `classLevelId`: String (FK to ClassLevel)
- `name`: String (e.g. "A", "Science")

### 8. SubjectAssignment
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `academicTermId`: String (FK to AcademicTerm)
- `classLevelId`: String (FK to ClassLevel)
- `classSectionId`: String? (FK to ClassSection, nullable)
- `subjectId`: String (FK to Subject)
- `curriculumId`: String (FK to Curriculum)

### 9. GradingScale
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `name`: String (e.g. "Standard A-F")
- `intervals`: JSON (Array of `{grade: "A", minScore: 70, maxScore: 100, gpaValue: 4.0}`)

### 10. PromotionRule
- `id`: String (UUID)
- `tenantId`: String (UUID)
- `fromClassId`: String (FK to ClassLevel)
- `toClassId`: String (FK to ClassLevel)
- `conditions`: JSON (e.g., minimum average, core subject pass required)
