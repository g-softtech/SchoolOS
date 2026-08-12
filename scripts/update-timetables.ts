import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(process.cwd(), 'packages', 'core-platform', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// The user asked to remove Timetable model entirely and replace it with BellSchedule, TeachingDay, TimetableSlot, Period, Room.
// First let's remove legacy model Timetable.
const timetableRegex = /model Timetable \{[^}]+\}/g;
schema = schema.replace(timetableRegex, '');

// Also let's clean up Tenant's `Timetable Timetable[]`
schema = schema.replace('Timetable         Timetable[]', 'BellSchedule      BellSchedule[]\n  TeachingDay       TeachingDay[]\n  Period            Period[]\n  Room              Room[]\n  TimetableSlot     TimetableSlot[]');

// Let's remove Timetable[] from AcademicTerm and ClassSection
schema = schema.replace('  Timetable        Timetable[]', '');
schema = schema.replace('  Timetable  Timetable[]', '');

const newDomainTimetables = `
// ==================================================
// DOMAIN X: TIMETABLES
// ==================================================

model BellSchedule {
  id             String        @id @default(uuid())
  tenantId       String
  tenant         Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name           String
  effectiveFrom  DateTime?
  effectiveTo    DateTime?

  periods        Period[]
  teachingDays   TeachingDay[]
  timetableSlots TimetableSlot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("tmt_bell_schedules")
}

model TeachingDay {
  id             String       @id @default(uuid())
  tenantId       String
  tenant         Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  bellScheduleId String
  bellSchedule   BellSchedule @relation(fields: [bellScheduleId], references: [id], onDelete: Cascade)
  dayOfWeek      Int          // 1=Monday, 7=Sunday
  isSchoolDay    Boolean      @default(true)

  timetableSlots TimetableSlot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([bellScheduleId, dayOfWeek])
  @@map("tmt_teaching_days")
}

model Period {
  id             String       @id @default(uuid())
  tenantId       String
  tenant         Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  bellScheduleId String
  bellSchedule   BellSchedule @relation(fields: [bellScheduleId], references: [id], onDelete: Cascade)
  name           String       // "Period 1", "Break", "Assembly"
  startTime      String       // "08:00"
  endTime        String       // "08:40"
  isTeaching     Boolean      @default(true)

  timetableSlots TimetableSlot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([bellScheduleId])
  @@map("tmt_periods")
}

model Room {
  id        String @id @default(uuid())
  tenantId  String
  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name      String
  capacity  Int?

  timetableSlots TimetableSlot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("tmt_rooms")
}

model TimetableSlot {
  id                  String             @id @default(uuid())
  tenantId            String
  tenant              Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  academicTermId      String
  academicTerm        AcademicTerm       @relation(fields: [academicTermId], references: [id], onDelete: Cascade)
  bellScheduleId      String
  bellSchedule        BellSchedule       @relation(fields: [bellScheduleId], references: [id], onDelete: Cascade)
  teachingDayId       String
  teachingDay         TeachingDay        @relation(fields: [teachingDayId], references: [id], onDelete: Cascade)
  periodId            String
  period              Period             @relation(fields: [periodId], references: [id], onDelete: Cascade)
  subjectAssignmentId String
  subjectAssignment   SubjectAssignment  @relation(fields: [subjectAssignmentId], references: [id], onDelete: Cascade)
  teacherId           String?
  teacher             Staff?             @relation(fields: [teacherId], references: [id], onDelete: SetNull)
  roomId              String?
  room                Room?              @relation(fields: [roomId], references: [id], onDelete: SetNull)

  status      String   @default("DRAFT")
  publishedAt DateTime?
  version     Int      @default(1)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId, academicTermId])
  @@map("tmt_timetable_slots")
}

`;

schema += newDomainTimetables;

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully for Timetables!');
