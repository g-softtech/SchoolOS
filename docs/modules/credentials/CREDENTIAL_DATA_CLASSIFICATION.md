# Credential Management System - Data Privacy Classification

Consistent with the platform's standard data-classification approach, the Credential Management System defines the privacy level of every model and DTO to ensure PII boundaries are maintained.

| Object / Domain Model | Classification | Description |
| --------------------- | -------------- | ----------- |
| `Credential` | **CONFIDENTIAL** | Links a system `userId` to active credential lifecycles. Contains expiration dates and replacement counts. |
| `VerificationDecision` | **CONFIDENTIAL** | Contains the evaluation logic, exact reason for denial, and active status of the credential owner. |
| `VerificationLog` | **RESTRICTED** | Immutable chronological tracker of all identity movements (Attendance gates, Library checkouts). Highly sensitive movement PII. |
| `CredentialVersion` | **INTERNAL** | System-level cryptographic tokens mapped to versions. |
| `SigningKey` | **INTERNAL** | The cryptographic private/public key pairs for signing payloads. |
| `CredentialDevice` | **INTERNAL** | Device trust telemetry (firmware, battery, clock drift, location). |
| `CredentialTemplate` | **INTERNAL** | PDF/PVC layout and branding configurations. |
| **Public QR payload** | **PUBLIC** | Zero-PII signed payload string designed to be safely exposed to potentially untrusted scanners. Contains no names or dates of birth. |
