import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { StudentController } from '../controllers/student.controller';
import { GuardianController } from '../controllers/guardian.controller';
import { StudentService } from '../services/student.service';
import { StudentLifecycleService } from '../services/student-lifecycle.service';
import { StudentSearchService } from '../services/student-search.service';
import { GuardianService } from '../services/guardian.service';
import { StudentStatus } from '../dto/student.types';

// Mock Guards and Decorators since this is testing controller routing & payload handling
const mockGuard = { canActivate: jest.fn(() => true) };

describe('Students E2E', () => {
  let app: INestApplication;
  
  // Mocks
  const studentServiceMock = { getStudent: jest.fn() };
  const lifecycleServiceMock = { transitionStatus: jest.fn() };
  const searchServiceMock = { search: jest.fn() };
  const guardianServiceMock = { linkGuardian: jest.fn() };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [StudentController, GuardianController],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        { provide: StudentLifecycleService, useValue: lifecycleServiceMock },
        { provide: StudentSearchService, useValue: searchServiceMock },
        { provide: GuardianService, useValue: guardianServiceMock }
      ],
    })
    // In a real nest setup we would override the guards
    // .overrideGuard(AuthGuard).useValue(mockGuard)
    .compile();

    app = moduleRef.createNestApplication();
    
    // Simulate global middlewares like context parser
    app.use((req: any, res: any, next: any) => {
      // Simulate CurrentWorkspace decorator context
      req.workspaceContext = { tenantId: 'tenant-1', userId: 'user-1' };
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/students/search (GET)', async () => {
    searchServiceMock.search.mockResolvedValue({ data: [], nextCursor: null });

    return request(app.getHttpServer())
      .get('/api/v1/students/search?q=test')
      .expect(200)
      .expect({ data: [], nextCursor: null });
  });

  it('/api/v1/students/:id (GET)', async () => {
    studentServiceMock.getStudent.mockResolvedValue({ id: '123', studentNumber: 'STU-001' });

    return request(app.getHttpServer())
      .get('/api/v1/students/123')
      .expect(200)
      .expect({ id: '123', studentNumber: 'STU-001' });
  });

  it('/api/v1/students/:id/status (POST)', async () => {
    lifecycleServiceMock.transitionStatus.mockResolvedValue({ id: '123', status: StudentStatus.ACTIVE });

    return request(app.getHttpServer())
      .post('/api/v1/students/123/status')
      .send({ targetStatus: StudentStatus.ACTIVE, reason: 'Approved' })
      .expect(201) // NestJS POST default is 201
      .expect({ id: '123', status: StudentStatus.ACTIVE });
  });
});
