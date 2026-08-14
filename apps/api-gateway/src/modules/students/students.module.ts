import { Module } from '@nestjs/common';
import { CorePlatformModule } from '@saas/core-platform';
import { IdentityModule } from '../identity/identity.module';

// Controllers
import { StudentController } from './controllers/student.controller';
import { GuardianController } from './controllers/guardian.controller';

// Repositories
import { StudentRepository } from './repositories/student.repository';
import { GuardianRepository } from './repositories/guardian.repository';
import { StudentStatusLogRepository } from './repositories/student-status-log.repository';

// Services
import { StudentService } from './services/student.service';
import { StudentLifecycleService } from './services/student-lifecycle.service';
import { StudentSearchService } from './services/student-search.service';
import { StudentNumberService } from './services/student-number.service';
import { GuardianService } from './services/guardian.service';

// Subscribers
import { EnrollmentSubscriber } from './subscribers/admission-enrolled.subscriber';

@Module({
  imports: [CorePlatformModule, IdentityModule],
  controllers: [StudentController, GuardianController],
  providers: [
    StudentRepository,
    GuardianRepository,
    StudentStatusLogRepository,
    StudentService,
    StudentLifecycleService,
    StudentSearchService,
    StudentNumberService,
    GuardianService,
    EnrollmentSubscriber
  ],
  exports: [
    StudentService,
    StudentLifecycleService
  ]
})
export class StudentsModule {}
