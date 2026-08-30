import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

class MockJwtAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    if (req.headers['authorization'] === 'Bearer invalid_token_123') {
      throw new UnauthorizedException();
    }
    req.user = req.headers['x-mock-user'] ? JSON.parse(req.headers['x-mock-user']) : { tenantId: 'tenant-1' };
    return true;
  }
}

class MockPermissionsGuard {
  canActivate() { return true; }
}

describe('Reporting API (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let authHeader: string;
  let unauthorizedHeader: string;
  let tenantId: string;
  let otherTenantId = 'tenant_other_reporting';
  let studentId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalGuards(new MockJwtAuthGuard(), new MockPermissionsGuard());
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    
    authHeader = 'Bearer valid_mock_token';
    unauthorizedHeader = 'Bearer invalid_token_123';
    
    // Create plan if it doesn't exist
    const plan = await prisma.platformPlan.findFirst();
    const planId = plan?.id || (await prisma.platformPlan.create({
      data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }
    })).id;

    // Dynamically create isolated test tenants
    tenantId = `tenant-reporting-${Date.now()}`;
    await prisma.tenant.create({
      data: { id: tenantId, name: 'Reporting Tenant', slug: `reporting-${Date.now()}`, planId, status: 'ACTIVE' }
    });
    
    otherTenantId = `tenant-reporting-other-${Date.now()}`;
    await prisma.tenant.create({
      data: { id: otherTenantId, name: 'Other Reporting Tenant', slug: `other-rep-${Date.now()}`, planId, status: 'ACTIVE' }
    });

    // Setup dummy data for Finance (Invoice) to test collection rate & outstanding balance
    const term = await prisma.term.create({
      data: {
        tenantId,
        name: 'First Term',
        academicYearId: (await prisma.academicYear.create({
          data: { tenantId, name: '2025/2026', startDate: new Date(), endDate: new Date(), status: 'ACTIVE' }
        })).id,
        startDate: new Date(),
        endDate: new Date()
      }
    });

    // Create a mock user for the student
    const studentUser = await prisma.user.create({
      data: { email: `student_rep_${Date.now()}@school.com`, passwordHash: 'hash' }
    });
    const studentRole = await prisma.role.create({ data: { tenantId, name: 'STUDENT', isSystem: false } });
    const stuMembership = await prisma.tenantMembership.create({
      data: { tenantId, userId: studentUser.id, state: 'ACTIVE', roleId: studentRole.id }
    });
    const existingStudent = await prisma.student.create({
      data: { tenantId, membershipId: stuMembership.id, admissionNumber: `ADM_REP_${Date.now()}` }
    });
    studentId = existingStudent.id;

    // Create Invoice for OUTSTANDING_BALANCE and COLLECTION_RATE
    // totalAmount: 1000, amountPaid: 400. Outstanding = 600, CollectionRate = 40%
    const inv = await prisma.invoice.create({
      data: {
        tenantId,
        studentId,
        termId: term.id,
        invoiceNumber: `INV_${Date.now()}`,
        totalAmount: 1000,
        amountPaid: 400,
        status: 'SENT',
        dueDate: new Date()
      }
    });
    invoiceId = inv.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.metricSnapshot.deleteMany({ where: { tenantId } });
      await prisma.scheduledJob.deleteMany({ where: { tenantId } });
      await prisma.invoice.deleteMany({ where: { tenantId } });
      await prisma.student.deleteMany({ where: { tenantId } });
      await prisma.term.deleteMany({ where: { tenantId } });
      await prisma.academicYear.deleteMany({ where: { tenantId } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    if (app) await app.close();
  });

  describe('Permissions & Authorization', () => {
    it('1. Unauthorized access is rejected', async () => {
      await request(app.getHttpServer())
        .get('/v1/reports/executive')
        .set('Authorization', unauthorizedHeader)
        .set('x-tenant-id', tenantId)
        .expect(401);
    });
  });

  describe('Rebuild Job Creation/Execution', () => {
    it('2. POST /reports/jobs/rebuild triggers analytical metric calculation', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/reports/jobs/rebuild')
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .expect(201);
        
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Rebuild completed');

      // Verify ScheduledJob is created
      const job = await prisma.scheduledJob.findFirst({
        where: { tenantId, type: 'ANALYTICAL_PROJECTION_REBUILD' },
        orderBy: { createdAt: 'desc' }
      });
      expect(job).toBeDefined();
      expect(job!.status).toBe('COMPLETED');
      
      // Verify MetricSnapshot is created with isLatest = true
      const snapshot = await prisma.metricSnapshot.findFirst({
        where: { tenantId, metricName: 'COLLECTION_RATE', isLatest: true }
      });
      expect(snapshot).toBeDefined();
      expect(snapshot!.value).toBe(40); // 400/1000 * 100
      expect(snapshot!.explainabilityString).toContain('Collection rate is 40.00%');
    });
  });

  describe('Executive Report Composition', () => {
    it('3. GET /reports/executive fetches both operational and analytical metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/reports/executive')
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .expect(200);

      // Operational
      expect(res.body.totalOutstandingBalance.value).toBe(600); // 1000 - 400
      // Analytical
      expect(res.body.collectionRatePercentage.value).toBe(40);
      
      // Explainability interpolation test
      expect(res.body.collectionRatePercentage.explainabilityString).toContain('Collection rate is 40.00% based on total invoices');
      
      // Lineage test
      expect(res.body.collectionRatePercentage.lineage).toBeDefined();
      expect(res.body.collectionRatePercentage.lineage.metricVersion).toBe('v1');
    });

    it('4. Tenant Isolation - Tenant B sees different (empty) metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/reports/executive')
        .set('Authorization', authHeader)
        .set('x-tenant-id', otherTenantId)
        .expect(200);

      expect(res.body.totalOutstandingBalance.value).toBe(0);
      expect(res.body.collectionRatePercentage.value).toBe(0);
    });
  });

  describe('Student & Campus Reports', () => {
    it('5. GET /reports/student/:id fetches student-scoped operational metric', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/reports/student/${studentId}`)
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body.studentId).toBe(studentId);
      expect(res.body.studentAverageScore.value).toBe(0); // not implemented
    });
    
    it('6. GET /reports/campus fetches isolated campus list', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/reports/campus')
        .set('Authorization', authHeader)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body.campuses).toEqual([]); // currently returning empty array as per stub
    });
  });
});
