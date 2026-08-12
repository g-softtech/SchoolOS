# Credential Management System - Operational Runbook

This runbook defines the standard operating procedures (SOPs) for resolving real-world security and physical credential incidents within SchoolOS. Operations teams should strictly adhere to these workflows.

## 1. Lost Credential
**Trigger**: User reports a lost card or mobile device.
**Procedure**:
1. Invoke `CredentialService.reportLostAndReissue(credentialId)`.
2. This immediately transitions the active version to `REVOKED`.
3. A `CredentialRevoked` event is emitted.
4. Physical scanners will begin denying the token on their next sync or immediately if online.
5. A new version is issued in `ACTIVE` state.

## 2. Stolen Credential
**Trigger**: User reports a stolen card with potential malicious intent.
**Procedure**:
1. Execute the Lost Credential procedure above.
2. In the Parent Portal, review the `VerificationLog` for the past 24 hours to identify any unauthorized access (e.g., Library borrowing or Campus entry).
3. Notify security if unauthorized access was logged after the reported time of theft.

## 3. Mass Reissue
**Trigger**: An entire cohort needs new credentials (e.g., new academic session).
**Procedure**:
1. Invoke `CredentialBatchService.initializeBatchJob()` with `jobType = REISSUE`.
2. Monitor the `CredentialPrintJob` progress.
3. If the batch job fails midway, resume the job using the job ID. The system tracks `processedIds` to prevent duplicate issuance.

## 4. Signing Key Compromise
**Trigger**: A malicious actor obtains the active cryptographic private key.
**Procedure**:
1. Invoke `QRService.rotateSigningKey(tenantId)`.
2. This immediately sets `activeUntil = NOW()` on the compromised key.
3. The system generates a new key version.
4. **CRITICAL**: Depending on severity, you may need to manually revoke all `CredentialVersion`s signed with the compromised key.

## 5. Device Replacement
**Trigger**: A physical scanner is broken and replaced.
**Procedure**:
1. Mark the old device's status as `RETIRED` in `CredentialDevice`.
2. Register the new device, capture its `certificateThumbprint`, and set status to `REGISTERED`.
3. An administrator must manually authorize the device to `ACTIVE` before it can verify credentials.

## 6. Device Quarantine
**Trigger**: The Integrity Auditor detects severe clock drift or outdated firmware on a scanner.
**Procedure**:
1. The Auditor transitions the device to `QUARANTINED`.
2. IT Staff must update the firmware or sync the clock via NTP.
3. Once telemetry normalizes, the device can be manually restored to `ACTIVE`.

## 7. Offline Scanner Recovery
**Trigger**: Network outage isolates a campus scanner.
**Procedure**:
1. Scanners use cryptographic validation during the `offlineValidityWindowHours` (defined in `CredentialPolicy`).
2. When the network restores, the scanner MUST batch-upload all queued `VerificationLog`s to the central API.
3. The server will retrospectively evaluate anti-cloning rules on the uploaded logs and raise `CredentialSecurityAlert`s if anomalies are found.

## 8. Batch Print Recovery
**Trigger**: The server crashes while processing a 3,000-card print job.
**Procedure**:
1. No manual intervention is needed.
2. The `CredentialBatchService` worker loop will automatically pick up the `PROCESSING` job on boot.
3. It will skip all IDs listed in the `processedIds` JSON array and resume seamlessly.

## 9. Emergency Campus Lockdown
**Trigger**: Security incident requires immediately halting all access.
**Procedure**:
1. Push an emergency override to the `VerificationService`.
2. The service will bypass Trust Scores and immediately return `DENY` for all context rules (e.g., `ATTENDANCE = DENIED`) until the lockdown is lifted.

## 10. Disaster Recovery
**Trigger**: Total database loss requiring restoration from backup.
**Procedure**:
1. Restore the `schema.prisma` tables.
2. Since timelines are immutable, the exact state of all credentials is automatically reconstructed.
3. Ensure the KMS (Key Management Service) containing the `privateKey`s is restored simultaneously, otherwise all existing QR tokens will fail cryptographic verification.
