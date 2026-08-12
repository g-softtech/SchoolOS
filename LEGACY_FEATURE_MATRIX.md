# Legacy Feature Matrix (SaaS Target State)

This document maps every feature from the legacy system (and new platform additions) to its target state in the multi-tenant SaaS architecture.

## 1. Core Identity & Roles
- **Global Roles**: `SUPER_ADMIN` (Platform Owner)
- **Tenant Roles**: `SCHOOL_ADMIN`, `VICE_ADMIN`, `ACCOUNTANT`, `TEACHER`, `CLASS_TEACHER`, `LIBRARIAN`, `NURSE`, `HOSTEL_MASTER`, `TRANSPORT_MANAGER`, `PARENT`, `STUDENT`

## 2. Core Academic Modules
| Module | Target State in SaaS |
| :--- | :--- |
| **Admissions** | Online Admissions portal, Admin review, Approval workflow, Auto-generate Student ID. |
| **Students** | Relational Student model (FKs to Guardian, Class, Fee, Attendance). |
| **Parents** | Parent Portal (Pay fees, download results, messaging, attendance). |
| **Teachers & Staff** | Role-based dashboards, isolated views per teacher. |
| **Classes & Subjects** | Normalized relational tables (`Class`, `Subject`). |
| **Timetable** | Tenant-aware scheduling, teacher availability checks. |
| **Attendance** | Relational Attendance records per student/class/date. |
| **Results & Grades** | Relational results. Configurable grading scales. |
| **CBT (Exams)** | Multi-campus support, AI generated question banks. |
| **Assignments & Homework** | Student portal integration, AI grading support. |
| **Events & Documents** | Tenant isolated document storage and event calendar. |

## 3. Financial & HR Modules
| Module | Target State in SaaS |
| :--- | :--- |
| **Fees & Invoicing** | Relational models (`Fee`, `Invoice`, `Payment`). Paystack integration. |
| **Accounting** | Ledger and transaction tracking for the school. |
| **Payroll** | Staff salary processing, payslips. |
| **HR** | Leave management, recruitment, staff performance tracking. |
| **Finance Dashboard** | Income, Expenses, Outstanding Fees, Collection Rate, Revenue Trend. |

## 4. Advanced School Operations
| Module | Target State in SaaS |
| :--- | :--- |
| **Messaging & Notifications** | WhatsApp, Email, Push Notifications. Entitlement restricted. |
| **Library** | Book inventory, issuance tracking, fines. |
| **Transport** | GPS, Routes, Drivers, Vehicle Maintenance. |
| **Hostel** | Room allocation, capacity management, warden roles. |
| **Inventory** | School assets and consumables tracking. |
| **Multi-campus** | Single school entity managing Campus A, Campus B, Campus C. |

## 5. Portals & Builders (SaaS Exclusives)
| Module | Target State in SaaS |
| :--- | :--- |
| **Website Builder** | Admin editable: Hero, Principal msg, Admissions, Gallery, News, Contact, Forms. |
| **Landing Pages** | Custom domains (`schoolname.yourdomain.com` or `www.school.com`). |
| **Parent Portal** | Dedicated UI for parents to track child progress and pay fees. |
| **Student Portal** | Dedicated UI for students (CBT, results, timetable, assignments). |

## 6. AI & Platform Features
| Module | Target State in SaaS |
| :--- | :--- |
| **School AI** | Generate lesson notes (Teacher), Draft announcements (Principal), Explain performance (Parent), Tutoring (Student). |
| **AI Report Comments** | 1-click contextual comment generation for report cards. |
| **Analytics Dashboard** | Global school metrics (Admissions, Attendance, Performance, Revenue). |
| **Subscription Billing** | Platform plans (Free, Starter, Professional, Enterprise). Paystack billing. |
| **Feature Entitlements** | Engine to unlock Students, Teachers, AI, SMS, Storage, Branches, Custom Domain based on active tier. |
| **Marketplace** | (Future) App store for CBT packs, Curriculum, Report templates. |
