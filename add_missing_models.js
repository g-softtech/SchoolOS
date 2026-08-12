const fs = require('fs');
let schema = fs.readFileSync('packages/core-platform/prisma/schema.prisma', 'utf8');

const missingModels = `
model Asset {
  id        String   @id @default(uuid())
  tenantId  String
  websiteId String
  mimeType  String
  url       String
  size      Int
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([tenantId])
  @@map("cms_assets")
}

model WebsiteDomain {
  id         String   @id @default(uuid())
  websiteId  String
  website    Website  @relation(fields: [websiteId], references: [id])
  domainName String   @unique
  deletedAt  DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([websiteId])
  @@map("cms_website_domains")
}

model BellSchedule {
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  periods   Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("tt_bell_schedules")
}

model TimetableSlot {
  id          String   @id @default(uuid())
  timetableId String
  timetable   Timetable @relation(fields: [timetableId], references: [id])
  dayOfWeek   Int
  periodId    String
  subjectId   String
  teacherId   String
  classId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([timetableId])
  @@map("tt_timetable_slots")
}
`;

schema += missingModels;
schema = schema.replace(
  /model Website \{[\s\S]+?@@map\("cms_websites"\)\s*\}/,
  `model Website {
  id       String @id @default(uuid())
  tenantId String @unique
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  domain      String @unique
  themeColors Json?
  heroConfig  Json?
  seoMeta     Json?
  
  deletedAt   DateTime?
  version     Int      @default(1)

  pages      Page[]
  navigation NavigationMenu?
  domains    WebsiteDomain[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("cms_websites")
}`
);

schema = schema.replace(
  /model Page \{[\s\S]+?@@map\("cms_pages"\)\s*\}/,
  `model Page {
  id       String @id @default(uuid())
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  websiteId String
  website   Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  title         String
  slug          String
  contentBlocks Json // JSON representation of the visual page builder
  isPublished   Boolean @default(false)
  version       Int     @default(1)
  deletedAt     DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([websiteId, slug])
  @@index([tenantId])
  @@map("cms_pages")
}`
);

fs.writeFileSync('packages/core-platform/prisma/schema.prisma', schema);
console.log('Appended missing models and updated Website and Page.');
