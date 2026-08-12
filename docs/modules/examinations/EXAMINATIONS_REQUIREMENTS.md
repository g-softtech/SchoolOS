# Examinations Module Requirements

## 1. Domain Definition
The Examinations module manages the entire lifecycle of student assessment, from candidacy registration through result publication. It supports complex, multi-component assessments across varying academic series while maintaining a strict, immutable audit ledger of all results.

## 2. Bounded Context Boundaries

### Owns (Authoritative Source)
- **Assessment Series**: Overarching assessment periods (e.g., "2026/2027 Academic Year").
- **Assessment Types**: Configurable entities (e.g. Exam, Quiz, Practical) replacing fixed enums.
- **Assessments**: Specific assessment instances within a series (e.g., "Term 1 Mock Exams").
- **Assessment Papers & Components**: Multi-component structures for subjects.
- **Candidate Registration & Accommodations**: Policy-driven registration with explicit `CandidateAccommodation` records (e.g. extra time, reader).
- **Eligibility Policies**: Rules engine (`EligibilityPolicy` -> `EligibilityRule`) governing who can sit an assessment.
- **Results & Marks**: Storage of raw marks, computed grades, and remarks.
- **Result Lifecycle & Versioning**: `ExamResultVersion` maintains an immutable audit chain. `ResultReview` models multi-stage moderation.
- **Anonymous Marking**: Candidate numbers decouple identity. Only a secure publication service can resolve identities post-marking.
- **Publication Workflow**: Batched publication auditing (`publishedBy`, `publishedAt`, `publicationBatchId`).

### Does NOT Own
- **Exam Scheduling**: **Timetables** strictly owns dates, time slots, rooms, invigilators, and conflict detection. Examinations only declares that an assessment *exists* and references the timetable slot.
- **Grading Scales**: **Academics** owns grading scales.
- **Student Profiles**: **Students** module owns profiles.
- **Staff Profiles**: **Staff** module owns staff records.
- **Attendance**: **Attendance** verifies candidate presence.
- **Reporting & Transcripts**: **Reporting** handles analytics, rankings, and averages. Examinations is strictly a factual ledger.
- **Finance**: **Finance** handles exam fees and broadcasts eligibility events; Examinations never queries Finance directly.

## 3. Core Capabilities
- **Flexible Assessment Types**: Schools can define custom assessments (Quiz, Oral, Midterm) without schema migrations.
- **Rules-Engine Eligibility**: Policies contain multiple independent rules (e.g., Attendance >= 75%, Fee = CLEARED).
- **Candidate Accommodations**: Relational tracking of special needs (extra time, scribes) that are searchable and auditable.
- **Multi-Stage Moderation**: A relational `ResultReview` model allowing unlimited sequential reviews (First Marker, Second Marker, Chief Examiner).
- **Immutable Result Versioning**: Raw scores are never overwritten. Every change yields a new `ExamResultVersion` referencing `supersedesVersionId`.
- **Configurable Candidate Numbering**: Supports per-tenant, per-campus, per-session, and per-assessment numbering formats.

## 4. Key Rules and Workflows
1. **Delegated Scheduling**: Assessments are passed to the Timetables module for physical scheduling and invigilator assignment.
2. **Delegated Grading**: Examinations queries Academics to compute grades.
3. **Event-Driven Eligibility**: Finance and other modules publish events that update a student's eligibility status. Examinations never directly queries Finance.
4. **Secure Anonymous Marking**: Examiners see only Candidate Numbers. Only the secure publication service is permitted to resolve Candidate Numbers back to Student IDs.
5. **Strict Result Immutability**: All modifications generate a new `ExamResultVersion`.
6. **Controlled Publication**: Results are not immediately visible upon approval. A controlled Publish Job dictates publication auditing (`publishedBy`, `publicationBatchId`).

## 5. Domain Events
### Published
- `Examinations.Series.Created`
- `Examinations.Cycle.Created`
- `Examinations.Candidate.Registered`
- `Examinations.Result.StatusChanged` (e.g. `VERIFIED`, `PUBLISHED`)
- `Examinations.Result.Amended` (Audit event)

### Consumed
- `Attendance.Register.Submitted` (To unlock score entry for present candidates)
- `Academics.GradingScale.Updated` (To optionally trigger recalculations)
