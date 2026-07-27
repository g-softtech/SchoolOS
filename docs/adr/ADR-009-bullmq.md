# ADR-009: Why BullMQ

## Status
Accepted

## Context
Schools frequently require bulk operations: generating 3,000 report cards, importing 5,000 students, or sending fee reminders via email/SMS. Running these synchronously on the main Node.js thread will cause HTTP timeouts and crash the API gateway.

## Decision
We will use BullMQ (backed by Redis) as our background job queue.

## Consequences
- **Positive:** Robust retry mechanisms, delayed jobs, failure tracking, and offloading heavy tasks from the main thread.
- **Negative:** Requires Redis. Job processors must be carefully designed to be idempotent in case of retries.
