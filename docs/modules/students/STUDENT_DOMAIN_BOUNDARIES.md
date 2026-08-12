# Student Domain Boundaries

## Ownership Map
| Entity | Owning Module | Description |
| :--- | :--- | :--- |
| **Student** | `Students` | Canonical identity and tenant linking |
| **Student Profile** | `Students` | Demographics, addresses, extended metadata |
| **Student Status** | `Students` | Current lifecycle position (Active, Alumni, etc.) |
| **Student Number** | `Students` | Generated authoritative sequence |
| **Guardian** | `Students` | Reusable parent/guardian identity |
| **Guardian Relationship** | `Students` | M:N linking defining custody/emergency roles |
| *Applicant* | `Admissions` | Pre-enrollment identity |
| *Application* | `Admissions` | Pre-enrollment workflow |
| *ID Card* | `Future Identity Credential` | Physical/Digital credential derived from Student |

## Bounded Context Integrity
- **Admissions** -> **Students**: Asynchronous integration via `EnrollmentSubscriber`.
- **Students** -> **ID Card**: Asynchronous integration via `Student.Activated`.
- Downstream domains (Academics, Finance) query Students via API or synchronize via domain events. No direct database foreign keys across module schemas.
