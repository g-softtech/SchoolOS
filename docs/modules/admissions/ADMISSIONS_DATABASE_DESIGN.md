# Admissions Module: Database Design

This document outlines the Prisma schema additions required for the Admissions module.

## Core Models

### `AdmissionCampaign`
- `id`: String (UUID)
- `tenantId`: String
- `academicYearId`: String
- `name`: String
- `startDate`: DateTime
- `endDate`: DateTime
- `status`: Enum (DRAFT, ACTIVE, CLOSED)
- `applicationFee`: Decimal?
- `maxApplicants`: Int?
- `allowedClasses`: Json // e.g., ["JSS1", "SS1"]
- `portalVisibility`: Boolean @default(true)
- `createdAt`, `updatedAt`

### `AdmissionWorkflow` & `AdmissionWorkflowStage`
Controls dynamic status transitions per school.
- `AdmissionWorkflow`: `id`, `tenantId`, `name`, `isDefault`
- `AdmissionWorkflowStage`: `id`, `workflowId`, `name` (e.g., "Medical"), `orderIndex`, `requiresReview`, `isTerminal`

### `AdmissionForm` & `AdmissionField`
Dynamic form builder for the application.
- `AdmissionForm`: `id`, `tenantId`, `campaignId`
- `AdmissionField`: `id`, `formId`, `label`, `type` (TEXT, DROPDOWN, DATE, FILE), `isRequired`, `orderIndex`
- `AdmissionFieldOption`: `id`, `fieldId`, `value` (for dropdowns)

### `RequiredDocument`
Defines mandatory uploads.
- `id`: String (UUID)
- `tenantId`: String
- `name`: String (e.g., "Birth Certificate")
- `isRequired`: Boolean

### `AdmissionApplication`
The core entity representing a student's application.
- `id`: String (UUID)
- `tenantId`: String
- `campaignId`: String
- `applicantId`: String (Guardian/Student)
- `admissionNumber`: String? @unique // Populated upon acceptance
- `studentFirstName`: String
- `studentLastName`: String
- `studentDateOfBirth`: DateTime
- `customFields`: Json (Answers to `AdmissionField`s)
- `currentStageId`: String (FK to `AdmissionWorkflowStage`)
- `paymentStatus`: Enum (PENDING, PAID, WAIVED)
- `createdAt`, `updatedAt`

### `AdmissionDocument`
- `id`: String (UUID)
- `applicationId`: String
- `requiredDocumentId`: String? (FK to `RequiredDocument`)
- `fileUrl`: String
- `verificationStatus`: Enum (PENDING, VERIFIED, REJECTED)

### `AdmissionReview`
Supports multi-reviewer scoring.
- `id`: String (UUID)
- `applicationId`: String
- `reviewerId`: String
- `stageId`: String (FK to `AdmissionWorkflowStage`)
- `score`: Int?
- `comments`: String
- `recommendation`: Enum (APPROVE, REJECT, HOLD)
- `createdAt`, `updatedAt`

## Prisma Standards
- All models must include `tenantId`.
- Ensure `@@index([tenantId, campaignId])` for read optimization.
- Use explicit enums and JSON fields where dynamic configurations are needed.
