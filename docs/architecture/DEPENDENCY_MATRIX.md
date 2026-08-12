# DEPENDENCY MATRIX

This document enforces strict architectural boundaries across SchoolOS. Violation of these dependency rules will result in a failed PR.

## Permitted Dependencies (The Golden Path)

The request lifecycle must strictly flow top-down:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma (Database)
```

## Explicit Allowed Coupling

| Component | May Depend On (Allowed) |
| :--- | :--- |
| **Controller** | Services, DTOs, Auth Decorators, WorkspaceContext |
| **Service** | Repositories, EventBus, WorkspaceContext, other domain Services (cautiously) |
| **Repository** | Prisma, BaseRepository |
| **Subscriber** | Services, External Integrations (Email/SMS), Analytics, Audit |
| **PolicyEngine**| WorkspaceContext, Cache |

## Explicitly FORBIDDEN Coupling 

To prevent architectural drift, the following relationships are **BANNED**:

```text
Controller
    ✗ Repository (Controllers must not bypass Services)
    ✗ Prisma (No direct database queries from routing)

Repository
    ✗ EventBus (Repositories do not know about domain events)
    ✗ Cache (Caching is a Service or infrastructural concern)
    ✗ Notifications (Data access does not send emails)
    ✗ HTTP (Repositories do not make external API calls)

Service
    ✗ Prisma (Services must use Repositories. No returning Prisma types to controllers)
    ✗ Request/Response objects (Services are protocol-agnostic)
```

## Cross-Module Dependencies

- Modules must NEVER reach directly into the database schema of another module.
- Inter-module communication must happen via the **EventBus** (choreography) or via exposed public **Services** (orchestration).

## Domain Dependency Graph

This enforces the sequence and dependencies between bounded contexts.

- **Staff**: Depends on Identity.
- **Attendance**: Depends on Students, Timetables, and Staff. Consumes identity credentials (e.g. QR) but MUST NOT own or generate them.
- **ID Card**: Depends on Students and Staff. Generates printable layouts and QR/Barcodes. MUST NOT generate attendance events.
- **Examinations**: Depends on Academics, Students, and Timetables.
- **Finance**: Depends on Students, Academics, Staff.


## Future Consumers of Staff Events

The following modules are documented as consumers of Staff events (\Staff.Employee.*\, \Staff.Credential.*\). Future implementations MUST NOT couple to the internal Staff schema, but must instead subscribe to these events:
- **Attendance**
- **Finance / Payroll**
- **ID Card**
- **Library**
- **Transport**
- **Hostel**
- **Reporting**
- **Notifications**


