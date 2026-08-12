# EVENT REGISTRY

The central registry of all domain events across SchoolOS. This registry prevents duplicate events, documents payloads for consumers, and enforces the standard naming hierarchy.

All events must follow: `Domain.Entity.Action`

---

## 3. Identity Domain Events

### User Lifecycle
* `Identity.User.Registered` - Fired when a new GlobalUser account is created.
* `Identity.User.Activated` - Fired when a user verifies their email/phone.
* `Identity.User.Deactivated` - Fired when an administrator suspends a user.

### Authentication & Sessions
* `Identity.User.LoggedIn` - Fired upon successful credential validation.
* `Identity.User.LoggedOut` - Fired when a session is explicitly revoked.
* `Identity.Token.Refreshed` - Fired when a refresh token is rotated.

### Security
* `Identity.Password.Changed` - Fired when a user successfully updates their password.
* `Identity.Password.ResetRequested` - Fired when a reset token is generated.
* `Identity.Password.ResetCompleted` - Fired when a reset token is successfully consumed.

### Tenant Management
* `Identity.Tenant.Provisioned` - Fired when a new school/workspace is created.
* `Identity.Tenant.Activated` - Fired when a tenant completes onboarding.
* `Identity.Tenant.Suspended` - Fired when a tenant's billing fails.

### Authorization (RBAC)
* `Identity.Role.Created` - Fired when a new custom role is created.
* `Identity.Role.Updated` - Fired when a role's permissions or name changes (Triggers Cache Invalidation).
* `Identity.Role.Deleted` - Fired when a role is soft-deleted.
* `Identity.Permission.Assigned` - Fired when a permission is granted to a role.
* `Identity.Permission.Removed` - Fired when a permission is revoked.

### Marketplace & Entitlements
* `Identity.Feature.Enabled` - Fired when a feature flag is turned on for a tenant.
* `Identity.Feature.Disabled` - Fired when a feature flag is turned off.

---

## Admissions Module
| Event | Producer | Payload Schema | Retry Strategy | Dead-Letter |
| :--- | :--- | :--- | :--- | :--- |
| Admissions.Application.Started | AdmissionApplicationService | { tenantId, applicationId } | 5 times, exp backoff | Yes |
| Admissions.Application.Submitted | AdmissionApplicationService | { tenantId, applicationId } | 5 times, exp backoff | Yes |
| Admissions.Application.Updated | AdmissionApplicationService | { tenantId, applicationId } | 3 times, exp backoff | Yes |
| Admissions.Application.Enrolled | AdmissionApplicationService | { tenantId, applicationId, studentFirstName } | 5 times, exp backoff | Yes |
| Admissions.Document.Uploaded | AdmissionApplicationService | { tenantId, documentId, applicationId } | 3 times, exp backoff | Yes |
| Admissions.Review.Assigned | AdmissionReviewService | { tenantId, applicationId, reviewerId } | 3 times, exp backoff | Yes |
| Admissions.Review.Completed | AdmissionReviewService | { tenantId, applicationId, reviewId } | 5 times, exp backoff | Yes |
| Admissions.Interview.Scheduled | AdmissionWorkflowService | { tenantId, applicationId, date } | 5 times, exp backoff | Yes |
| Admissions.Decision.Released | AdmissionWorkflowService | { tenantId, applicationId, decision } | 5 times, exp backoff | Yes |
| Admissions.Campaign.Opened | AdmissionCampaignService | { tenantId, campaignId } | 3 times, exp backoff | Yes |
| Admissions.Campaign.Closed | AdmissionCampaignService | { tenantId, campaignId } | 3 times, exp backoff | Yes |

## Website Builder Domain
| Event | Producer | Payload Schema | Retry Strategy | Dead-Letter |
| :--- | :--- | :--- | :--- | :--- |
| Website.Created | TenantProvisioningService | { tenantId, name } | 5 times, exp backoff | Yes |
| Website.Updated | WebsiteService | { tenantId, fields } | 3 times, exp backoff | Yes |
| Website.Deleted | TenantTeardownService | { tenantId } | 5 times, exp backoff | Yes |
| Website.ThemeChanged | WebsiteService | { tenantId, themeId } | 3 times, exp backoff | Yes |
| Website.DomainMapped | WebsiteService | { tenantId, domain } | 5 times, exp backoff | Yes |
| Website.PageCreated | PageService | { tenantId, pageId } | 3 times, exp backoff | No |
| Website.PageUpdated | PageService | { tenantId, pageId } | 3 times, exp backoff | No |
| Website.PagePublished | PageService | { tenantId, pageId, slug } | 5 times, exp backoff | Yes |
| Website.PageArchived | PageService | { tenantId, pageId } | 5 times, exp backoff | Yes |
| Website.NavigationUpdated| NavigationService | { tenantId, menuId }| 3 times, exp backoff | Yes |
| Website.AssetUploaded | AssetService | { tenantId, assetId } | 3 times, exp backoff | Yes |

## Phase 9: Canonical Student Domain Events

| Event Name | Producer | Payload Schema | Consumers |
| --- | --- | --- | --- |
| Student.Created | StudentService | { tenantId, studentId, studentNumber } | Analytics, Search |
| Student.Activated | StudentLifecycleService | { tenantId, studentId, studentNumber } | ID Card Module |
| Student.Updated | StudentService | { tenantId, studentId, fieldsChanged } | |
| Student.StatusChanged | StudentLifecycleService | { tenantId, studentId, previousStatus, newStatus } | |
| Student.GuardianLinked | GuardianService | { tenantId, studentId, guardianId } | |
| Student.GuardianRemoved | GuardianService | { tenantId, studentId, guardianId } | |
| Student.PhotoUpdated | StudentService | { tenantId, studentId, photoKey } | ID Card Module |
| Student.Archived | StudentLifecycleService | { tenantId, studentId } | |
| Student.Restored | StudentLifecycleService | { tenantId, studentId } | |
| Student.Deleted | StudentService | { tenantId, studentId } | |

## Phase 10: Academics Domain Events

| Event Name | Producer | Payload Schema | Consumers |
| --- | --- | --- | --- |
| Academic.Session.Created | AcademicSessionService | { tenantId, sessionId, name } | Timetable, Finance |
| Academic.Session.Activated | AcademicSessionService | { tenantId, sessionId } | Timetable, Finance |
| Academic.Term.Opened | AcademicTermService | { tenantId, termId } | Attendance, Exams |
| Academic.Term.Closed | AcademicTermService | { tenantId, termId } | Exams, Reports |
| Academic.Subject.Created | SubjectService | { tenantId, subjectId, code } | Timetable |
| Academic.Subject.Updated | SubjectService | { tenantId, subjectId, fields } | Timetable |
| Academic.Curriculum.Published | CurriculumService | { tenantId, curriculumId } | Exams |
| Academic.Class.Created | ClassLevelService | { tenantId, classId, name } | Timetable |
| Academic.GradingScale.Updated | GradingService | { tenantId, gradingScaleId } | Exams |

## Phase 11: Timetables Domain Events

| Event Name | Producer | Payload Schema | Consumers |
| --- | --- | --- | --- |
| Timetable.Config.Created | TimetableConfigService | { tenantId, bellScheduleId } | Attendance |
| Timetable.Config.Published | TimetableConfigService | { tenantId, bellScheduleId, academicTermId } | Attendance |
| Timetable.Slot.Created | TimetableSlotService | { tenantId, slotId } | Attendance |
| Timetable.Slot.Updated | TimetableSlotService | { tenantId, slotId } | Attendance |
| Timetable.Slot.Deleted | TimetableSlotService | { tenantId, slotId } | Attendance |
| Timetable.Teacher.Assigned | TimetableSlotService | { tenantId, slotId, teacherId } | Attendance |
| Timetable.Room.Changed | TimetableSlotService | { tenantId, slotId, roomId } | Attendance |


## Phase 12: Staff Domain Events

| Event Name | Producer | Payload Schema | Consumers |
| --- | --- | --- | --- |
| Staff.Employee.Created | StaffEmployeeService | { tenantId, employeeId, employeeNumber } | ID Card, Timetable |
| Staff.Employee.Updated | StaffEmployeeService | { tenantId, employeeId, fields } | ID Card |
| Staff.Employee.Activated | StaffEmploymentService | { tenantId, employeeId } | ID Card, Attendance |
| Staff.Employee.Suspended | StaffEmploymentService | { tenantId, employeeId, reason } | ID Card, Attendance |
| Staff.Employee.Terminated | StaffEmploymentService | { tenantId, employeeId, date } | ID Card, Attendance |
| Staff.Credential.Issued | IdentityCredentialService | { tenantId, credentialId, employeeId, type } | ID Card |
| Staff.Credential.Rotated | IdentityCredentialService | { tenantId, credentialId, employeeId } | ID Card |
| Staff.Credential.Revoked | IdentityCredentialService | { tenantId, credentialId, employeeId } | ID Card, Attendance |

