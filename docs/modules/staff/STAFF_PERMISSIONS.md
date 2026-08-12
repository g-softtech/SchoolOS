# Staff Module Permissions

The following RBAC permissions dictate access to the Staff module boundaries. They must be registered in the `Identity` permission seed and enforced on all Staff controllers using `@RequirePermission('permission.node')`.

## 1. Core Employee Management
- `staff.employee.read`: View employee profiles and directory. (Usually granted broadly to all staff).
- `staff.employee.write`: Create new employee profiles or update demographic details. (HR / Admins).
- `staff.employee.manage_lifecycle`: Suspend or terminate employees. (HR / Super Admins).
- `staff.employee.delete`: Soft-delete an employee record. (Super Admins only).

## 2. Structural Hierarchy
- `staff.department.read`: View the department structure.
- `staff.department.write`: Create, edit, or remove departments.
- `staff.position.read`: View positions and role descriptions.
- `staff.position.write`: Create, edit, or remove positions.

## 3. Credential Management
*Note: Credential generation is highly sensitive. The physical printing of the QR card requires `idcard.print`, but the logical issuance of the underlying token requires these permissions.*
- `staff.credential.read`: View active credential metadata (e.g., expiry dates) but NOT the secure token itself.
- `staff.credential.issue`: Issue new identity credentials (QR, NFC).
- `staff.credential.revoke`: Revoke or suspend a compromised credential.
