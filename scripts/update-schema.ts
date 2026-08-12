import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(process.cwd(), 'packages', 'core-platform', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace Tenant Relations
schema = schema.replace('  AcademicYear      AcademicYear[]\n  Term              Term[]\n  Department        Department[]\n  Class             Class[]\n  Arm               Arm[]\n  SubjectGroup      SubjectGroup[]\n  Subject           Subject[]\n  Timetable         Timetable[]',
`  Campus            Campus[]
  AcademicSession   AcademicSession[]
  AcademicTerm      AcademicTerm[]
  Department        Department[]
  ClassLevel        ClassLevel[]
  ClassSection      ClassSection[]
  Curriculum        Curriculum[]
  CurriculumSubject CurriculumSubject[]
  Subject           Subject[]
  SubjectOffering   SubjectOffering[]
  GradingScale      GradingScale[]
  PromotionRule     PromotionRule[]
  Timetable         Timetable[]`);

// Delete old Campus definition to Timetable (inclusive) and replace with new Academics domain
const domain3Start = schema.indexOf('// DOMAIN 3: ACADEMIC STRUCTURE');
const domain4Start = schema.indexOf('// DOMAIN 4: STUDENT DOMAIN');

const newDomain3 = `// ==================================================
// DOMAIN 3: ACADEMIC STRUCTURE
// ==================================================

model Campus {
  id       String  @id @default(uuid())
  tenantId String
  tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name     String
  address  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("acd_campuses")
}

model Department {
  id       String  @id @default(uuid())
  tenantId String
  tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name     String
  headId   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  Staff     Staff[]

  @@index([tenantId])
  @@map("acd_departments")
}

model AcademicSession {
  id        String     @id @default(uuid())
  tenantId  String
  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name      String
  startDate DateTime
  endDate   DateTime
  isActive  Boolean    @default(false)

  terms AcademicTerm[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("acd_academic_sessions")
}

model AcademicTerm {
  id             String          @id @default(uuid())
  tenantId       String
  tenant         Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sessionId      String
  session        AcademicSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  name           String
  startDate      DateTime
  endDate        DateTime
  isActive       Boolean         @default(false)

  subjectOfferings SubjectOffering[]
  Timetable        Timetable[]
  Invoice          Invoice[]
  Exam             Exam[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId, sessionId])
  @@map("acd_academic_terms")
}

model Curriculum {
  id          String  @id @default(uuid())
  tenantId    String
  tenant      Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name        String
  description String?

  subjects CurriculumSubject[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("acd_curriculums")
}

model Subject {
  id          String  @id @default(uuid())
  tenantId    String
  tenant      Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  code        String
  name        String
  description String?
  credits     Int?

  curriculums      CurriculumSubject[]
  subjectOfferings SubjectOffering[]
  Exam             Exam[]
  Assignment       Assignment[]
  LessonNote       LessonNote[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([tenantId, code])
  @@map("acd_subjects")
}

model CurriculumSubject {
  id           String     @id @default(uuid())
  tenantId     String
  tenant       Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  curriculumId String
  curriculum   Curriculum @relation(fields: [curriculumId], references: [id], onDelete: Cascade)
  subjectId    String
  subject      Subject    @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  isCore       Boolean    @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([curriculumId, subjectId])
  @@map("acd_curriculum_subjects")
}

model ClassLevel {
  id         String @id @default(uuid())
  tenantId   String
  tenant     Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name       String
  orderIndex Int

  sections         ClassSection[]
  subjectOfferings SubjectOffering[]
  promotionsFrom   PromotionRule[]   @relation("PromotionFrom")
  promotionsTo     PromotionRule[]   @relation("PromotionTo")
  Assignment       Assignment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("acd_class_levels")
}

model ClassSection {
  id           String     @id @default(uuid())
  tenantId     String
  tenant       Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  classLevelId String
  classLevel   ClassLevel @relation(fields: [classLevelId], references: [id], onDelete: Cascade)
  name         String
  capacity     Int?

  Student    Student[]
  Timetable  Timetable[]
  Attendance Attendance[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([classLevelId, name])
  @@map("acd_class_sections")
}

model SubjectOffering {
  id           String       @id @default(uuid())
  tenantId     String
  tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  termId       String
  term         AcademicTerm @relation(fields: [termId], references: [id], onDelete: Cascade)
  classLevelId String
  classLevel   ClassLevel   @relation(fields: [classLevelId], references: [id], onDelete: Cascade)
  subjectId    String
  subject      Subject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  isRequired   Boolean      @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([termId, classLevelId, subjectId])
  @@map("acd_subject_offerings")
}

model GradingScale {
  id        String @id @default(uuid())
  tenantId  String
  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name      String
  intervals Json

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("acd_grading_scales")
}

model PromotionRule {
  id          String     @id @default(uuid())
  tenantId    String
  tenant      Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  fromClassId String
  fromClass   ClassLevel @relation("PromotionFrom", fields: [fromClassId], references: [id], onDelete: Cascade)
  toClassId   String
  toClass     ClassLevel @relation("PromotionTo", fields: [toClassId], references: [id], onDelete: Cascade)
  conditions  Json

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([fromClassId, toClassId])
  @@map("acd_promotion_rules")
}

model Timetable {
  id        String       @id @default(uuid())
  tenantId  String
  tenant    Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sectionId String
  section   ClassSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  termId    String
  term      AcademicTerm @relation(fields: [termId], references: [id], onDelete: Cascade)
  config    Json

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId, sectionId, termId])
  @@map("acd_timetables")
}

`;

schema = schema.substring(0, domain3Start) + newDomain3 + schema.substring(domain4Start);

// Update Student currentArmId to currentSectionId
schema = schema.replace('  currentArmId      String?\n  currentArm        Arm?               @relation(fields: [currentArmId], references: [id])',
  '  currentSectionId  String?\n  currentSection    ClassSection?      @relation(fields: [currentSectionId], references: [id])');

// Update Attendance armId to sectionId
schema = schema.replace('  armId String\n  arm   Arm    @relation(fields: [armId], references: [id])',
  '  sectionId String\n  section   ClassSection @relation(fields: [sectionId], references: [id])');

// Update Exam Term to AcademicTerm
schema = schema.replace('  termId   String\n  term     Term', '  termId   String\n  term     AcademicTerm');

// Update Invoice Term to AcademicTerm
schema = schema.replace('  termId   String\n  term     Term', '  termId   String\n  term     AcademicTerm');


fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully!');
