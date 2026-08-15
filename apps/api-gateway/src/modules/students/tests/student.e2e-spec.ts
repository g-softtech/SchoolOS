const request = require('supertest');
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { StudentController } from '../controllers/student.controller';
import { GuardianController } from '../controllers/guardian.controller';
import { StudentService } from '../services/student.service';
import { StudentLifecycleService } from '../services/student-lifecycle.service';
import { StudentSearchService } from '../services/student-search.service';
import { GuardianService } from '../services/guardian.service';

// Mock Guards and Decorators since this is testing controller routing & payload handling
describe('Students E2E (Controller)', () => {
  let app: INestApplication;

  // Mocks
  const studentServiceMock = { getStudent: jest.fn() };
  const lifecycleServiceMock = { transitionStatus: jest.fn() };
  const searchServiceMock = { search: jest.fn() };
  const guardianServiceMock = {
    linkGuardian: jest.fn(),
    provisionAndLinkGuardian: jest.fn()
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [StudentController, GuardianController],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        { provide: StudentLifecycleService, useValue: lifecycleServiceMock },
        { provide: StudentSearchService, useValue: searchServiceMock },
        { provide: GuardianService, useValue: guardianServiceMock }
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    // Simulate workspace context middleware (mirrors how CurrentWorkspace decorator reads req.workspace)
    app.use((req: any, _res: any, next: any) => {
      req.workspace = { tenantId: 'tenant-1', userId: 'user-1', roles: [], permissions: [] };
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/students/search (GET) should return paginated result', async () => {
    searchServiceMock.search.mockResolvedValue({ data: [], nextCursor: null });

    return request(app.getHttpServer())
      .get('/api/v1/students/search?q=test')
      .expect(200)
      .expect({ data: [], nextCursor: null });
  });

  it('/api/v1/students/:id (GET) should return student', async () => {
    studentServiceMock.getStudent.mockResolvedValue({ id: '123', admissionNumber: 'STU-001' });

    return request(app.getHttpServer())
      .get('/api/v1/students/123')
      .expect(200)
      .expect({ id: '123', admissionNumber: 'STU-001' });
  });

  it('/api/v1/students/:id/status (POST) should trigger lifecycle transition', async () => {
    const updatedStudent = { id: '123', membership: { state: 'ACTIVE' } };
    lifecycleServiceMock.transitionStatus.mockResolvedValue(updatedStudent);

    return request(app.getHttpServer())
      .post('/api/v1/students/123/status')
      .send({ targetStatus: 'ACTIVE', reason: 'Approved' })
      .expect(201) // NestJS POST default is 201
      .expect(updatedStudent);
  });
});
