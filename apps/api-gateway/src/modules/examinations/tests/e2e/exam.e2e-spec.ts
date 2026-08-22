import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { PrismaService, EntitlementsService } from '@saas/core-platform';
import { ExaminationsModule } from '../../examinations.module';
import { randomUUID } from 'crypto';

// Minimal mock for guard and decorators
const mockAuthGuard = {
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'test-user', email: 'test@example.com' };
    req.workspace = { tenantId: 'tenant-1' };
    return true;
  },
};

describe('Examinations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ExaminationsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $transaction: jest.fn(),
        exam: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
        result: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() }
      })
      .overrideGuard('JwtAuthGuard')
      .useValue(mockAuthGuard)
      .overrideProvider(EntitlementsService)
      .useValue({ checkEntitlement: jest.fn().mockResolvedValue(true) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    // Quick mock for require permission since we are bypassing full RBAC in pure module test
    const { Reflector } = require('@nestjs/core');
    app.useGlobalGuards(mockAuthGuard as any);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Basic sanity check to ensure controllers are mounted
  it('/api/v1/exams (GET) - requires mock data or fails cleanly', () => {
    // We expect 403 or 200 depending on how global guards are actually applied in E2E
    // But mainly we verify the route exists (not 404).
    return request(app.getHttpServer())
      .get('/api/v1/exams')
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
