import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(process.cwd(), 'packages', 'core-platform', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace SubjectOffering in Tenant model
schema = schema.replace('SubjectOffering   SubjectOffering[]', 'SubjectAssignment SubjectAssignment[]');

// Replace SubjectOffering in AcademicTerm model
schema = schema.replace('subjectOfferings SubjectOffering[]', 'subjectAssignments SubjectAssignment[]');

// Replace SubjectOffering in Subject model
schema = schema.replace('subjectOfferings SubjectOffering[]', 'subjectAssignments SubjectAssignment[]');

// Replace SubjectOffering in ClassLevel model
schema = schema.replace('subjectOfferings SubjectOffering[]', 'subjectAssignments SubjectAssignment[]');

// Add subjectAssignments to Curriculum
// Curriculum has: subjects CurriculumSubject[]
schema = schema.replace('  subjects CurriculumSubject[]\n', '  subjects CurriculumSubject[]\n  subjectAssignments SubjectAssignment[]\n');

// Add subjectAssignments to ClassSection
// ClassSection has: Student Student[], Timetable Timetable[], Attendance Attendance[]
schema = schema.replace('  Timetable  Timetable[]', '  Timetable  Timetable[]\n  subjectAssignments SubjectAssignment[]');

// Replace SubjectOffering model with SubjectAssignment
const offeringModelStr = `model SubjectOffering {
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
}`;

const assignmentModelStr = `model SubjectAssignment {
  id             String       @id @default(uuid())
  tenantId       String
  tenant         Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  academicTermId String
  academicTerm   AcademicTerm @relation(fields: [academicTermId], references: [id], onDelete: Cascade)
  classLevelId   String
  classLevel     ClassLevel   @relation(fields: [classLevelId], references: [id], onDelete: Cascade)
  classSectionId String?
  classSection   ClassSection? @relation(fields: [classSectionId], references: [id], onDelete: Cascade)
  subjectId      String
  subject        Subject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  curriculumId   String
  curriculum     Curriculum   @relation(fields: [curriculumId], references: [id], onDelete: Cascade)

  TimetableSlot  TimetableSlot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([academicTermId, classLevelId, classSectionId, subjectId])
  @@map("acd_subject_assignments")
}`;

schema = schema.replace(offeringModelStr, assignmentModelStr);

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully for SubjectAssignment!');
