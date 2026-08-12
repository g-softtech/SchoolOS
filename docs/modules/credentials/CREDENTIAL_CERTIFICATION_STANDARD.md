# Credential Management System Certification Standard

Every deployment of the Credential Management System must pass this 13-level certification standard before deployment to production.

## 1. Identity Integrity
- [ ] Credentials never create identities; they strictly link to existing `User` records.
- [ ] Visitors are modeled as lightweight `User` records with the `VISITOR` role.

## 2. Lifecycle Integrity
- [ ] Credentials transition strictly through defined state rules (`REQUESTED` -> `GENERATED` -> `ISSUED` -> `ACTIVATED` -> `SUSPENDED` -> `EXPIRED` -> `REVOKED` -> `REPLACED`).
- [ ] Issued credentials are never deleted from the database.

## 3. Verification Accuracy
- [ ] The `VerificationService` accurately evaluates Context Rules (Capability Profiles). A credential allowed in `ATTENDANCE` may be correctly denied in `LIBRARY`.
- [ ] Expired or revoked credentials are synchronously denied.

## 4. Audit Completeness
- [ ] Every single scan attempt generates an immutable `VerificationLog` with context, result, and correlation ID.
- [ ] Every credential lifecycle change generates an immutable `CredentialTimeline` event.

## 5. Performance
- [ ] The centralized `VerificationService` responds in <200ms at p95 to ensure smooth turnstile/scanner operations.

## 6. Security
- [ ] QR payloads contain absolutely zero Personally Identifiable Information (PII).
- [ ] Payloads consist strictly of non-identifying IDs and cryptographic signatures.

## 7. Explainability
- [ ] Every verification rejection returns a clear, plain-language reason (`Expired on 2026-08-01`, `Revoked due to loss`).

## 8. Device Trust
- [ ] Scanners and endpoints must be registered in `CredentialDevice` with `ACTIVATED` status.
- [ ] Unregistered or suspended devices receive instant verification denial.

## 9. Cryptographic Key Rotation
- [ ] The `QRService` generates signatures using versioned keys.
- [ ] The system seamlessly verifies historical credentials using their corresponding active key version.

## 10. Governance
- [ ] Clear policies dictate expiration limits, renewal fees, and maximum active versions per tenant.

## 11. Event Consistency
- [ ] The `CredentialEventStream` reliably emits events (`CredentialVerified`, `CredentialActivated`) to decouple integrations like Attendance and Library.

## 12. Expiration Correctness
- [ ] The background `CredentialExpirationService` sweeps and expires credentials organically without waiting for an active scan.

## 13. Batch Issuance Resilience
- [ ] The `CredentialBatchService` implements resumable jobs. Failures of a single card do not crash the entire batch.

## 14. Anti-Cloning Detection
- [ ] Scanning a credential on disparate devices simultaneously drops the Trust Score and logs a Security Alert.

## 15. Offline Verification Correctness
- [ ] Offline verification functions securely within the `offlineValidityWindowHours` defined in the policy, without breaking cryptographic integrity.
