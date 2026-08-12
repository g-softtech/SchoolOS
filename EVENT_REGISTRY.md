# Platform Event Registry

This registry documents the canonical schemas and versioning for all domain events across the platform.

## Principles
1. **Append-Only Evolution**: Event schemas cannot be modified, only versioned.
2. **Backwards Compatibility**: Subscribers must be able to handle previous versions.
3. **Explicit Payloads**: Do not serialize entire aggregates; include only the ID and the fields that caused or resulted from the state change.

---

## Admissions Module

### Admissions.Application.Submitted
**Version:** 1
**Description:** Emitted when an applicant or admin successfully submits a draft application.

**Payload:**
```json
{
  "eventId": "uuid",
  "occurredAt": "iso-date",
  "version": 1,
  "tenantId": "string",
  "applicationId": "string",
  "campaignId": "string",
  "submittedBy": "string (actorId)",
  "aggregateVersion": "number"
}
```

### Admissions.Application.Reviewed
**Version:** 1
**Description:** Emitted when a reviewer completes evaluating an application.

**Payload:**
```json
{
  "eventId": "uuid",
  "occurredAt": "iso-date",
  "version": 1,
  "tenantId": "string",
  "applicationId": "string",
  "reviewerId": "string",
  "score": "number",
  "recommendation": "string",
  "aggregateVersion": "number"
}
```

### Admissions.Application.Accepted
**Version:** 1
**Description:** Emitted when a workflow transitions the application to ACCEPTED status.

**Payload:**
```json
{
  "eventId": "uuid",
  "occurredAt": "iso-date",
  "version": 1,
  "tenantId": "string",
  "applicationId": "string",
  "admissionNumber": "string",
  "approvedBy": "string (actorId)",
  "aggregateVersion": "number"
}
```

### Admissions.Campaign.CapacityChanged
**Version:** 1
**Description:** Emitted when a campaign's total capacity is updated.

**Payload:**
```json
{
  "eventId": "uuid",
  "occurredAt": "iso-date",
  "version": 1,
  "tenantId": "string",
  "campaignId": "string",
  "oldCapacity": "number",
  "newCapacity": "number",
  "aggregateVersion": "number"
}
```

## Identity Module

### Identity.User.Registered
**Version:** 1
**Description:** Emitted when a new global user account is created.

**Payload:**
\\\json
{
  "eventId": "uuid",
  "occurredAt": "iso-date",
  "version": 1,
  "userId": "string",
  "email": "string"
}
\\\

### Identity.User.LoggedIn
**Version:** 1
**Description:** Emitted when a user successfully authenticates.

**Payload:**
\\\json
{
  "eventId": "uuid",
  "occurredAt": "iso-date",
  "version": 1,
  "userId": "string",
  "ipAddress": "string"
}
\\\

### Identity.Tenant.Provisioned
**Version:** 1
**Description:** Emitted when a new school (Tenant) is successfully provisioned by a global user.

**Payload:**
\\\json
{
  "eventId": "uuid",
  "occurredAt": "iso-date",
  "version": 1,
  "tenantId": "string",
  "provisionedByUserId": "string"
}
\\\

