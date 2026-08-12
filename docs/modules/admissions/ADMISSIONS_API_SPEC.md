# Admissions Module: API Specification

This document details the REST API endpoints required for the Admissions Module. All endpoints enforce the Authorization Engine guards (`@RequirePermission`, etc.) and expect the `WorkspaceContext` to provide the active `tenantId`.

## 1. Admission Campaigns & Configuration
Endpoints for School Admins to manage admission cycles and configurations.

- `POST /api/admissions/campaigns`
  - **Permission:** `MANAGE_ADMISSION_CAMPAIGNS`
  - **Body:** `{ name, academicYearId, startDate, endDate, applicationFee, maxApplicants, allowedClasses }`

- `POST /api/admissions/workflows`
  - **Permission:** `MANAGE_ADMISSION_WORKFLOWS`
  - **Body:** Configures custom stages (e.g., Application -> Exam -> Interview)

- `POST /api/admissions/forms`
  - **Permission:** `MANAGE_ADMISSION_FORMS`
  - **Body:** Defines custom `AdmissionField`s and `AdmissionFieldOption`s for the application.

- `POST /api/admissions/documents/rules`
  - **Permission:** `MANAGE_ADMISSION_DOCUMENTS`
  - **Body:** Defines `RequiredDocument` rules.

## 2. Applications (Public/Guardian Facing)
Endpoints used by prospective students or guardians to apply.

- `GET /api/admissions/campaigns/:id/form`
  - **Permission:** Public
  - **Returns:** The dynamic `AdmissionForm` fields for the specific campaign.

- `POST /api/admissions/applications`
  - **Permission:** `CREATE_OWN_APPLICATION`
  - **Body:** `{ campaignId, studentFirstName, studentLastName, studentDateOfBirth, customFields }`
  
- `POST /api/admissions/applications/:id/submit`
  - **Permission:** `EDIT_OWN_APPLICATION`
  - Finalizes the draft, validates against `RequiredDocument` rules, and triggers invoice generation.

## 3. Application Processing (Staff Facing)
Endpoints used by Admissions Officers to process applications.

- `GET /api/admissions/applications`
  - **Permission:** `MANAGE_APPLICATIONS`

- `POST /api/admissions/applications/:id/review`
  - **Permission:** `REVIEW_APPLICATIONS`
  - **Body:** `{ stageId, score, comments, recommendation }`
  
- `POST /api/admissions/applications/:id/transition`
  - **Permission:** `MANAGE_APPLICATIONS`
  - **Body:** Moves the application to the next configured `AdmissionWorkflowStage`.

## 4. Enrollment & Analytics
- `POST /api/admissions/applications/:id/enroll`
  - **Permission:** `ENROLL_STUDENTS`
  - Generates Admission Number via `AdmissionNumberService` and transitions to Student.

- `GET /api/admissions/analytics/dashboard`
  - **Permission:** `VIEW_ADMISSIONS_ANALYTICS`
  - **Returns:** Acceptance Rate, Rejection Rate, Applications Today, Enrollment Conversion.
