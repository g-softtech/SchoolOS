import { Module } from '@nestjs/common';
import { CorePlatformModule } from '@saas/core-platform';
import { IdentityModule } from '../identity/identity.module';

// Controllers
import { StudentController } from './controllers/student.controller';
import { GuardianController } from './controllers/guardian.controller';
import { MedicalRecordController } from './controllers/medical-record.controller';
import { DisciplineRecordController } from './controllers/discipline-record.controller';

// Repositories
import { StudentRepository } from './repositories/student.repository';
import { GuardianRepository } from './repositories/guardian.repository';
import { MedicalRecordRepository } from './repositories/medical-record.repository';
import { DisciplineRecordRepository } from './repositories/discipline-record.repository';

// Services
import { StudentService } from './services/student.service';
import { StudentLifecycleService } from './services/student-lifecycle.service';
import { StudentSearchService } from './services/student-search.service';
import { StudentNumberService } from './services/student-number.service';
import { GuardianService } from './services/guardian.service';
import { MedicalRecordService } from './services/medical-record.service';
import { DisciplineRecordService } from './services/discipline-record.service';

// Subscribers
import { EnrollmentSubscriber } from './subscribers/admission-enrolled.subscriber';

@Module({
  imports: [CorePlatformModule, IdentityModule],
  controllers: [StudentController, GuardianController, MedicalRecordController, DisciplineRecordController],
  providers: [
    StudentRepository,
    GuardianRepository,
    MedicalRecordRepository,
    DisciplineRecordRepository,
    StudentService,
    StudentLifecycleService,
    StudentSearchService,
    StudentNumberService,
    GuardianService,
    MedicalRecordService,
    DisciplineRecordService,
    EnrollmentSubscriber
  ],
  exports: [
    StudentService,
    StudentLifecycleService
  ]
})
export class StudentsModule {}
