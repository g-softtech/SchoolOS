const fs = require('fs');
let schema = fs.readFileSync('packages/core-platform/prisma/schema.prisma', 'utf8');

const missingModels = `
model Policy {
  id          String          @id @default(uuid())
  tenantId    String
  name        String
  description String?
  isActive    Boolean         @default(true)
  versions    PolicyVersion[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@unique([tenantId, name])
  @@map("idm_policies")
}

model PolicyVersion {
  id            String   @id @default(uuid())
  policyId      String
  policy        Policy   @relation(fields: [policyId], references: [id], onDelete: Cascade)
  versionNumber Int
  rules         Json
  createdAt     DateTime @default(now())

  @@unique([policyId, versionNumber])
  @@map("idm_policy_versions")
}

model SupportAccessGrant {
  id        String   @id @default(uuid())
  userId    String
  tenantId  String
  expiresAt DateTime
  reason    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, tenantId])
  @@map("idm_support_access_grants")
}
`;

if (!schema.includes('model Policy')) {
  schema += missingModels;
  fs.writeFileSync('packages/core-platform/prisma/schema.prisma', schema);
  console.log('Appended Policy and SupportAccessGrant models');
} else {
  console.log('Models already exist');
}
