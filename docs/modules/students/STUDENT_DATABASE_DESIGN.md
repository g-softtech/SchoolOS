# Student Database Design

## Schema Models

### `Student`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `tenantId` | String | Index |
| `studentNumber` | String | Unique(tenantId, studentNumber) |
| `status` | Enum | `PENDING`, `ACTIVE`, `SUSPENDED`, `WITHDRAWN`, `GRADUATED`, `ALUMNI`, `ARCHIVED` |
| `version` | Int | Optimistic concurrency (default 1) |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |
| `deletedAt` | DateTime? | Soft delete |
| `deletedBy` | String? | |

### `StudentProfile`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `studentId` | String | Unique FK to Student |
| `firstName` | String | |
| `lastName` | String | |
| `dateOfBirth` | DateTime | |
| `nationality` | String? | |
| `religion` | String? | |
| `bloodGroup` | String? | |
| `allergies` | String? | |
| `photoKey` | String? | Reference to PlatformStorage |
| `version` | Int | |

### `Guardian`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `tenantId` | String | Index |
| `firstName` | String | |
| `lastName` | String | |
| `email` | String? | |
| `phone` | String | |
| `version` | Int | |

### `StudentGuardian`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `studentId` | String | FK to Student |
| `guardianId` | String | FK to Guardian |
| `relationshipType`| Enum | `FATHER`, `MOTHER`, `GUARDIAN`, `EMERGENCY_CONTACT`, `SPONSOR` |
| `isPrimary` | Boolean | default false |
| `version` | Int | |
*Compound Unique*: `studentId, guardianId, relationshipType`

### `StudentStatusLog`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `studentId` | String | FK to Student |
| `previousStatus`| Enum | |
| `newStatus` | Enum | |
| `reason` | String? | |
| `actorId` | String | |
| `createdAt` | DateTime | Immutable append-only |

### `StudentNumberStrategy`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `tenantId` | String | Unique Index |
| `prefix` | String | |
| `sequence` | Int | default 0 |
| `year` | Int? | Optional reset boundary |
