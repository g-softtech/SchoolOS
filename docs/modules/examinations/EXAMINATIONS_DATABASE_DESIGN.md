# Examinations Database Design

## Design Principles
- **Separation of Scheduling**: Timetables strictly owns the "when" and "where".
- **Separation of Grading**: Academics owns the grade logic.
- **Configurability**: Assessments, Candidate Numbering, and Eligibility Rules are configurable engines.
- **Immutability**: Results use strict versioning (`ExamResultVersion`).
- **Hierarchical Assessments**: Series → Assessment → Paper → Component.

## Schema Models

### 1. AssessmentSeries
Overarching academic period for grouping assessments (e.g., "2026/2027 Academic Year").

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `name` | String | e.g. "2026/2027 Academic Year" |
| `startDate` | Date | |
| `endDate` | Date | |
| `status` | Enum | ACTIVE, COMPLETED, ARCHIVED |

### 2. AssessmentType
Configurable assessment formats.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `code` | String | e.g. "EXAM", "MOCK", "PROJECT" |
| `name` | String | e.g. "Final Examination" |
| `contributesToFinalGrade` | Boolean | |
| `defaultWeight` | Decimal? | |

### 3. Assessment
A specific assessment event within a series, previously known as ExamCycle.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `seriesId` | UUID | FK → AssessmentSeries |
| `assessmentTypeId`| UUID | FK → AssessmentType |
| `termId` | UUID | FK → AcademicTerm (from Academics) |
| `name` | String | e.g. "Term 1 Mock Exams" |
| `eligibilityPolicyId`| UUID?| FK → EligibilityPolicy |
| `status` | Enum | UPCOMING, ONGOING, MARKING, PUBLISHED, ARCHIVED |

### 4. EligibilityPolicy & EligibilityRule
Rules engine governing candidacy.

**EligibilityPolicy**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `name` | String | e.g. "Standard Exam Eligibility" |

**EligibilityRule**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `policyId` | UUID | FK → EligibilityPolicy |
| `ruleType` | Enum | ATTENDANCE_MIN, FEE_CLEARED, SUBJECT_REGISTERED, STUDENT_STATUS |
| `operator` | Enum | GTE, LTE, EQUALS |
| `value` | String | e.g. "75", "CLEARED", "ACTIVE" |

### 5. ExamPaper & ExamComponent
The specific subject paper and its multi-component breakdown.

**ExamPaper**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `assessmentId` | UUID | FK → Assessment |
| `subjectId` | UUID | FK → Subject |
| `name` | String | e.g. "Mathematics Paper 1" |
| `totalMarks` | Decimal | |
| `passMarks` | Decimal | |
| `timetableSlotId`| UUID? | FK → TimetableSlot (from Timetables) |
| `isAnonymous` | Boolean | Whether marking uses candidate numbers exclusively |

**ExamComponent** (Sub-divisions like Theory/Practical)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `paperId` | UUID | FK → ExamPaper |
| `name` | String | e.g. "Theory", "Practical" |
| `maxMarks` | Decimal | |
| `weighting` | Decimal | e.g., 0.70 (70%) |

### 6. CandidateNumberStrategy
Configurable numbering format for anonymous marking.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `scope` | Enum | TENANT, CAMPUS, SESSION, ASSESSMENT |
| `prefix` | String?| e.g. "2026-" |
| `sequenceLength` | Int | e.g. 4 for "0012" |

### 7. ExamCandidate & CandidateAccommodation
A student registered for an ExamPaper and their specific needs.

**ExamCandidate**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `paperId` | UUID | FK → ExamPaper |
| `studentId` | UUID | FK → Student |
| `candidateNumber`| String? | Generated via Strategy |
| `status` | Enum | ELIGIBLE, REGISTERED, WITHDRAWN, DISQUALIFIED |

**CandidateAccommodation**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `candidateId` | UUID | FK → ExamCandidate |
| `accommodationType`| String | e.g. "EXTRA_TIME", "READER", "SEPARATE_ROOM" |
| `extraTimeMinutes`| Int? | |
| `approvedBy` | UUID | FK → GlobalUser |
| `approvedAt` | DateTime | |
| `notes` | String? | |

### 8. ExamResult & ExamResultVersion
The result entity pointing to an immutable version chain.

**ExamResult** (The anchor pointing to the active version)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `candidateId`| UUID | FK → ExamCandidate |
| `activeVersionId`| UUID? | FK → ExamResultVersion |
| `status` | Enum | DRAFT, MARKED, MODERATED, VERIFIED, APPROVED, PUBLISHED, ARCHIVED |
| `publishedBy`| UUID? | FK → GlobalUser (Set during Publish Job) |
| `publishedAt`| DateTime?| |
| `publicationBatchId`| String?| |

**ExamResultVersion** (The immutable ledger entry)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `resultId` | UUID | FK → ExamResult |
| `versionNumber`| Int | Monotonically increasing |
| `supersedesVersionId`| UUID? | Previous version |
| `rawScore` | Decimal? | Computed from component scores |
| `computedGrade`| String? | Queried from Academics |
| `percentage` | Decimal? | |
| `remarks` | String? | |
| `changeReason`| String? | e.g. "Moderation correction" |
| `changedBy` | UUID | FK → GlobalUser |
| `changedAt` | DateTime | |

### 9. ResultReview
Relational support for multi-stage moderation (First Marker, Second Marker).

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK → Tenant |
| `resultVersionId`| UUID | FK → ExamResultVersion |
| `reviewerId` | UUID | FK → GlobalUser |
| `reviewType` | String | e.g. "FIRST_MARKER", "MODERATOR", "CHIEF_EXAMINER" |
| `decision` | String | e.g. "APPROVED", "AMENDED" |
| `remarks` | String? | |
| `createdAt` | DateTime | |
