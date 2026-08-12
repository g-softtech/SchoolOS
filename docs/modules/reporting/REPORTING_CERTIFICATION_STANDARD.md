# Reporting Certification Standard

Every metric and analytical projection must pass this 10-level certification standard before deployment to production.

## Level 1: Accuracy
* [ ] Aggregates match the canonical source data exactly.
* [ ] Filtering dimensions (Campus, Term) apply uniformly without dropping records.

## Level 2: Consistency & Cross-Metric Validation
* [ ] The same report returns identical results for the same historical snapshot.
* [ ] Real-time operational metrics behave idempotently for the same underlying dataset.
* [ ] `CrossMetricValidationService` runs nightly and asserts mathematical invariants (e.g., `Total Students === Boys + Girls`).

## Level 3: Performance
* [ ] `MetricRegistry` memory footprint remains minimal.
* [ ] Analytical dashboards query Layer 2 projections (Snapshots) and return within 500ms.
* [ ] Heavy Executive Dashboards leverage Layer 3 PostgreSQL Materialized Views.

## Level 4: Isolation
* [ ] Nightly rebuilding of Layer 2 Snapshots does NOT acquire table locks on operational data (e.g., `FinancialTransaction`).
* [ ] Operational Reporting (Layer 1) uses read-replicas (if available) to avoid degrading primary DB throughput.

## Level 5: Explainability
* [ ] Every metric exposed to a portal (especially Parent Portal) can trace its value back to the raw source records via the `MetricExplainabilityService`.
* [ ] Every metric contains a human-readable plain language string.

## Level 6: Rebuildability (The Constitutional Mandate)
* [ ] `AnalyticalProjectionService` can completely drop the `MetricSnapshot` table and successfully regenerate all historical data from canonical domains without any loss of business truth.

## Level 7: Security
* [ ] Reports enforce tenant isolation natively within the schema `tenantId` index.
* [ ] Endpoints exposing Layer 4 API models enforce strictly classified access (`PUBLIC`, `FAMILY`, `CONFIDENTIAL`, `RESTRICTED`).

## Level 8: Freshness
* [ ] API responses accurately declare metric freshness state (`FRESH`, `STALE`, `REBUILDING`, `FAILED`, `UNKNOWN`).
* [ ] If a nightly job fails, consumers are explicitly warned that data is STALE.

## Level 9: Lineage
* [ ] Every snapshot is immutable (`isLatest: false`, `supersededAt`).
* [ ] Every calculated value tracks the exact calculation version (`metricVersion`), source job (`lineageId`), generated time, and source owner.

## Level 10: Governance & Golden Data Invariants
* [ ] Every exposed metric exists in the `REPORTING_METRICS_CATALOG.md`.
* [ ] Every metric has exactly one authoritative owner.
* [ ] No "mystery KPIs" are calculated inline within dashboards or controllers.
* [ ] A **Golden Certification Dataset** is seeded in the CI pipeline. Aggregations, rankings, and distribution outputs must strictly match expected golden assertions on every build to prevent unexpected formula breakages.
