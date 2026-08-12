import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(process.cwd(), 'packages', 'core-platform', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const newDomainStaff = `
// ==================================================
// DOMAIN X: STAFF
// ==================================================

model Department {
  id          String       @id @default(uuid())
  tenantId    String
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  parentId    String?
  parent      Department?  @relation("DepartmentToDepartment", fields: [parentId], references: [id], onDelete: SetNull)
  name        String
  description String?

  children                Department[]              @relation("DepartmentToDepartment")
  positions               Position[]
  employeePositionHistory EmployeePositionHistory[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("stf_departments")
}

model Position {
  id             String     @id @default(uuid())
  tenantId       String
  tenant         Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  departmentId   String
  department     Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  title          String
  description    String?
  isTeachingRole Boolean    @default(false)

  employees               Employee[]
  employeePositionHistory EmployeePositionHistory[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId, departmentId])
  @@map("stf_positions")
}

model Employee {
  id             String    @id @default(uuid())
  tenantId       String
  tenant         Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userId         String?
  employeeNumber String
  firstName      String
  lastName       String
  email          String?
  phone          String?
  dateOfHire     DateTime
  status         String    @default("DRAFT") // DRAFT, ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED, ARCHIVED
  positionId     String?
  position       Position? @relation(fields: [positionId], references: [id], onDelete: SetNull)

  credentials             IdentityCredential[]
  employeePositionHistory EmployeePositionHistory[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@unique([tenantId, employeeNumber])
  @@index([tenantId, userId])
  @@map("stf_employees")
}

model EmployeePositionHistory {
  id           String     @id @default(uuid())
  tenantId     String
  tenant       Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employeeId   String
  employee     Employee   @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  positionId   String
  position     Position   @relation(fields: [positionId], references: [id], onDelete: Cascade)
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  
  effectiveFrom DateTime
  effectiveTo   DateTime?
  reason        String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId, employeeId])
  @@map("stf_employee_position_history")
}

model IdentityCredential {
  id            String    @id @default(uuid())
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employeeId    String
  employee      Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  type          String    // QR, NFC, BARCODE, BIOMETRIC
  token         String
  status        String    @default("ISSUED") // ISSUED, ACTIVE, SUSPENDED, REVOKED, EXPIRED
  
  issuedAt      DateTime  @default(now())
  expiresAt     DateTime?
  lastRotatedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([token])
  @@index([tenantId, employeeId, status])
  @@index([token, status])
  @@map("stf_identity_credentials")
}
`;

schema += newDomainStaff;

// Update Tenant model
schema = schema.replace('TimetableSlot     TimetableSlot[]', 'TimetableSlot     TimetableSlot[]\n  Department        Department[]\n  Position          Position[]\n  Employee          Employee[]\n  EmployeePositionHistory EmployeePositionHistory[]\n  IdentityCredential IdentityCredential[]');

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully for Staff models!');
