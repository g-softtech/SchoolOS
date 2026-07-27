# ADR-004: Why Platform Kernel

## Status
Accepted

## Context
If individual business modules (Admissions, Finance, Library) import Infrastructure and Platform Services directly, it creates a spiderweb of dependencies. Refactoring infrastructure later becomes nearly impossible.

## Decision
We will implement a `PlatformKernel` module acting as a Facade. Business modules will strictly depend on the Kernel. The Kernel abstracts away Redis, Email providers, and Event emission.

## Consequences
- **Positive:** True isolation between Business Domains and Platform Infrastructure. Easy testing via Kernel mocks.
- **Negative:** Slight overhead in maintaining the Facade mappings.
