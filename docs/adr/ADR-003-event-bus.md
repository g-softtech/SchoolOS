# ADR-003: Why Event Bus

## Status
Accepted

## Context
As the platform scales to 18+ modules, tightly coupling them leads to fragile code. For example, if the Admissions module directly calls the Email, Audit, and Analytics services upon admitting a student, any failure in those secondary services could break the primary admission flow.

## Decision
We will implement an Event-Driven Architecture (EDA) using an Event Bus. Business modules will emit Domain Events (e.g., `StudentAdmittedEvent`), and side-effect modules (Notifications, Analytics) will subscribe to these events asynchronously.

## Consequences
- **Positive:** Maximum decoupling, high resilience, and the ability to add new listeners (e.g., AI hooks) without touching core business logic.
- **Negative:** Harder to trace end-to-end execution flow during debugging.
