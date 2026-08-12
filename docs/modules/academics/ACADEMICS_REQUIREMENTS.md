# Academics Module Requirements

## 1. Module Overview
The **Academics** module is the foundational domain for all educational structures within SchoolOS. It strictly manages the *definition* of academics (calendars, subjects, structures) rather than scheduling or assessment.

## 2. Domain Boundaries

### What Academics Owns:
- **Academic Calendar**: Academic Sessions (e.g. 2026/2027) and Academic Terms (e.g. Fall Term).
- **Curriculum & Subjects**: The master list of subjects, curriculums, and their relationships (prerequisites).
- **Class Structure**: Class Levels (e.g. Grade 1, SS2), Class Sections/Streams (e.g. A, B).
- **Grading & Promotion**: Grading scales (e.g. A=90-100), Subject offerings per term, Promotion rules definition.

### What Academics DOES NOT Own (Boundary Contracts):
- **Students**: Academics references Student records by ID but never creates or updates student profiles.
- **Timetables**: Academics defines *what* is taught, but Timetable defines *when* and *where*.
- **Examinations**: Academics defines the grading *scale*, but Examinations owns marks entry, GPA computation, and result generation.
- **Attendance**: Handled purely by the Attendance module.

## 3. Core Entities
- `AcademicSession`: A full academic year (e.g., 2026/2027).
- `AcademicTerm`: A division of a session (e.g., First Term).
- `ClassLevel`: A cohort identifier (e.g., JSS1).
- `ClassSection`: A distinct group within a Class Level (e.g., JSS1-A).
- `Curriculum`: A standardized educational guideline.
- `Subject`: An academic topic (e.g., Mathematics).
- `SubjectOffering`: A subject made available in a specific term for a specific class.
- `GradingScale`: Score-to-grade mappings (e.g., 70-100 = A).
- `PromotionRule`: Defined criteria for advancing to the next Class Level.

## 4. Key Events Emitted
These events provide stable integration points for downstream modules (Timetables, Exams):
- `Academic.Session.Created`
- `Academic.Session.Activated`
- `Academic.Term.Opened`
- `Academic.Term.Closed`
- `Academic.Subject.Created`
- `Academic.Subject.Updated`
- `Academic.Curriculum.Published`
- `Academic.Class.Created`
- `Academic.GradingScale.Updated`
