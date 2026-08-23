# Parity Checklist

This document ensures that every legacy module is completely rebuilt, tested, and improved in the new SaaS platform before we consider it "done".

**Nothing is deleted from the legacy system until it is checked off here.**

## Parity Requirements for EVERY Module
For a module to be marked as complete, it must pass the following checks:
- [ ] **Relational DB**: Uses new PostgreSQL relational schema.
- [ ] **Tenant Isolation**: Queries enforce `tenantId` (Zero Trust).
- [ ] **API Rebuilt**: Migrated to NestJS with validation (DTOs).
- [ ] **Frontend Connected**: Rebuilt in React/NextJS using the unified design system.
- [ ] **Permissions**: Secured by the new RBAC Permission Engine.
- [ ] **Audit Logged**: All destructive actions (Create/Update/Delete) produce an Audit Log.
- [ ] **Entitlements**: Gated behind the correct subscription tier (if applicable).

---

## Module Tracking

### Identity & Access
- [ ] Students
- [ ] Parents
- [ ] Teachers
- [ ] Staff

### Academics
- [ ] Classes & Subjects
- [ ] Timetable
- [ ] Attendance
- [ ] Results & Grades
- [ ] CBT (Exams)
- [ ] Assignments & Homework

### Financials & HR
- [x] Fees & Invoicing
- [x] Accounting
- [ ] Payroll
- [ ] HR

### Operations
- [ ] Messaging & Notifications
- [x] Events & Documents (Phase 16 - ID Cards & Documents)
- [ ] Library
- [ ] Transport
- [ ] Hostel
- [ ] Inventory
- [ ] Multi-campus Manager

### Portals & Builders
- [ ] Website Builder
- [ ] Landing Pages
- [ ] Parent Portal
- [ ] Student Portal

### Platform & AI
- [ ] SaaS Billing (Stripe/Paystack)
- [ ] Entitlements Engine
- [ ] Analytics Dashboard
- [ ] AI Teacher
- [ ] AI Assistant
- [ ] AI Report Comments
