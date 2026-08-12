# PERFORMANCE BASELINES

These are the strict Service Level Agreements (SLAs) for the SchoolOS platform. Any module feature that exceeds these bounds must be optimized or offloaded to a background queue before merging.

## Core SLAs

| Operation | Acceptable Latency | Implementation Mandate |
| :--- | :--- | :--- |
| **Authentication (Token Gen)** | `< 100 ms` | O(1) crypto ops |
| **Workspace Resolution** | `< 20 ms` | MUST hit Redis cache |
| **Permission/Policy Check** | `< 5 ms` | Evaluated purely in-memory via Redis |
| **Standard CRUD Endpoint** | `< 150 ms` | Proper indexing required |
| **Admission Submission (Write)** | `< 300 ms` | Event emission must be asynchronous |
| **Dashboard Load** | `< 500 ms` | Pre-calculated analytics only |
| **Report Generation** | Asynchronous | MUST use background queue |
| **CSV Bulk Imports** | Streaming | MUST stream via streams/workers |
| **File Upload (Docs/Images)** | `< 2 seconds` | Multi-part direct to cloud storage |

## General Performance Rules
- **No N+1 Queries**: Prisma includes/joins must be used. No looping over queries in Services.
- **Offload Heavy Writes**: Any operation calculating massive rollups (e.g., end-of-term finance reconciliation) must be dispatched to the background EventBus or a worker pool.
- **Pagination**: All list endpoints MUST implement cursor-based pagination as fallback for offset pagination for datasets exceeding 1,000 rows.
