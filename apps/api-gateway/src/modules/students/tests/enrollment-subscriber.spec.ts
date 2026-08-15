import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentSubscriber } from '../subscribers/admission-enrolled.subscriber';
import { StudentService } from '../services/student.service';

describe('EnrollmentSubscriber', () => {
  let subscriber: EnrollmentSubscriber;
  let studentService: jest.Mocked<StudentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentSubscriber,
        {
          provide: StudentService,
          useValue: {
            enrollStudentFromApplication: jest.fn()
          }
        }
      ],
    }).compile();

    subscriber = module.get<EnrollmentSubscriber>(EnrollmentSubscriber);
    studentService = module.get(StudentService);
  });

  it('should be defined', () => {
    expect(subscriber).toBeDefined();
  });

  it('should call enrollStudentFromApplication with correct payload', async () => {
    (studentService.enrollStudentFromApplication as jest.Mock).mockResolvedValue({
      id: 'stu-1',
      admissionNumber: 'STU-001'
    });

    await subscriber.handleApplicationEnrolled({
      tenantId: 'tenant-1',
      applicationId: 'app-123',
      studentFirstName: 'John',
      studentLastName: 'Doe',
      studentDateOfBirth: '2010-05-15'
    });

    expect(studentService.enrollStudentFromApplication).toHaveBeenCalledWith(
      'tenant-1',
      'app-123',
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-05-15')
      }
    );
  });

  it('should silently catch errors without throwing', async () => {
    (studentService.enrollStudentFromApplication as jest.Mock).mockRejectedValue(
      new Error('Identity provisioning failed')
    );

    // Should not throw — subscriber swallows and logs the error
    await expect(
      subscriber.handleApplicationEnrolled({
        tenantId: 'tenant-1',
        applicationId: 'app-bad',
        studentFirstName: 'Bad',
        studentLastName: 'Student',
        studentDateOfBirth: '2010-01-01'
      })
    ).resolves.toBeUndefined();
  });
});
