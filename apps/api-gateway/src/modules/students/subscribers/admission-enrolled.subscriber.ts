import { Injectable, Logger } from '@nestjs/common';
import { PlatformEventBus } from '@saas/core-platform';
import { StudentService } from '../services/student.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class EnrollmentSubscriber {
  private readonly logger = new Logger(EnrollmentSubscriber.name);

  constructor(
    private readonly studentService: StudentService
  ) {}

  @OnEvent('Admissions.Application.Enrolled')
  async handleApplicationEnrolled(payload: {
    tenantId: string;
    applicationId: string;
    studentFirstName: string;
    studentLastName: string;
    studentDateOfBirth: string;
  }) {
    this.logger.log(`Received Enrollment Event for Application: ${payload.applicationId}`);

    try {
      const student = await this.studentService.createStudent(payload.tenantId, {
        firstName: payload.studentFirstName,
        lastName: payload.studentLastName,
        dateOfBirth: new Date(payload.studentDateOfBirth)
      });
      
      this.logger.log(`Canonical Student Created: ${student.admissionNumber}`);
    } catch (err: any) {
      this.logger.error(`Failed to construct Canonical Student: ${err.message}`, err.stack);
      // Real implementation would throw to DLQ (Dead Letter Queue)
    }
  }
}
