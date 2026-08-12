# Migration Roadmap

This document outlines the sequential order in which legacy modules will be migrated and rebuilt in the new SaaS platform. 

**Rule of Thumb**: We do not move to the next phase until the `PARITY_CHECKLIST.md` is complete for the current phase.

## Phase 5.2: Database Foundation
- Rebuild PostgreSQL schema (`schema.prisma`).
- Establish strict relational foreign keys (Student → Fee, Attendance, Result, etc.).
- Ensure all models are Tenant-aware (`tenantId`).

## Phase 5.3: Authentication & Permissions Engine
- Replace custom JWT with NextAuth.
- Implement Global Roles (`SUPER_ADMIN`).
- Implement Tenant Roles (`SCHOOL_ADMIN`, `TEACHER`, `PARENT`, `STUDENT`, etc.).
- Build zero-trust Permission Engine.

## Phase 5.4: Core Platform Migration
### 5.4.1 Identity & Access
- Migrate Students, Parents, Teachers, and Staff.
- Setup Role-based dashboards.

### 5.4.2 Academics
- Classes, Subjects, Timetable.
- Attendance & Results/Grading.
- CBT, Assignments & Homework.

### 5.4.3 Financials
- Fees, Accounting, Payroll.
- Financial Dashboard (Income, Expenses, Outstanding).

### 5.4.4 Communications & Operations
- Messaging (SMS/Email/WhatsApp).
- Notifications & Events.
- Document storage & ID Cards.

### 5.4.5 Advanced Modules
- Library, Hostel, Transport.
- HR & Inventory.
- Multi-campus structure.

## Phase 5.5: Portals
- Build dedicated **Parent Portal**.
- Build dedicated **Student Portal**.

## Phase 5.6: Builders & Identity
- **Website Builder** (Hero, Gallery, News, etc.).
- **Landing Page Builder** (Custom domains: `school.com`).

## Phase 5.7: SaaS Billing & Entitlements
- **Subscription Billing**: Free, Starter, Pro, Enterprise (Paystack).
- **Entitlements Engine**: Gatekeeping features (AI, SMS, Storage) based on tier.

## Phase 5.8: Analytics & Dashboards
- Comprehensive Analytics Dashboard.
- Admin, Teacher, and System-wide metrics.

## Phase 5.9: AI Integration
- AI Teacher (Lesson planning, test generation).
- AI Assistant (Parent insights, Student tutoring).
- AI Report Comment Generator.

## Phase 5.10: Marketplace (Future)
- Framework for CBT packs, curriculum downloads, etc.
