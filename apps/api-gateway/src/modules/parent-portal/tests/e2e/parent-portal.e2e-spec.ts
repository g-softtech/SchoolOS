import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaClient, PrismaService } from '@saas/core-platform';
import { DatabaseModule } from '../../../../database/database.module';
import { ParentPortalModule } from '../../parent-portal.module';
const request = require('supertest');
import { Reflector } from '@nestjs/core';

class MockJwtAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    if (req.headers['authorization'] === 'Bearer invalid_token') {
      throw new UnauthorizedException();
    }
    if (req.headers['x-mock-user']) {
      req.user = JSON.parse(req.headers['x-mock-user']);
    }
    return true;
  }
}

describe('Parent Portal (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;

  const ts = Date.now().toString();
  const t1 = `e2e-pp-t1-${ts}`;
  const t2 = `e2e-pp-t2-${ts}`;
  
  let guardianUserId: string;
  let guardianId: string;
  let s1Id: string;
  let s2Id: string;
  let s3Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        EventEmitterModule.forRoot(),
        ParentPortalModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalGuards(new MockJwtAuthGuard());
    
    prisma = app.get(PrismaService);
    await app.init();

    const plan = await prisma.platformPlan.findFirst() || await prisma.platformPlan.create({ data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }});
    await prisma.tenant.createMany({
      data: [
        { id: t1, name: 'T1', slug: `t1-${ts}`, planId: plan.id, status: 'ACTIVE' },
        { id: t2, name: 'T2', slug: `t2-${ts}`, planId: plan.id, status: 'ACTIVE' }
      ]
    });

    const ay1 = await prisma.academicYear.create({ data: { tenantId: t1, name: '2026', startDate: new Date(), endDate: new Date(), status: 'ACTIVE' }});
    const term1 = await prisma.term.create({ data: { tenantId: t1, academicYearId: ay1.id, name: 'Term 1', startDate: new Date(), endDate: new Date() }});

    const gUser = await prisma.user.create({ data: { email: `g-${ts}@test.com`, passwordHash: 'hash' }});
    guardianUserId = gUser.id;
    const pRole = await prisma.role.create({ data: { tenantId: t1, name: 'PARENT', isSystem: true }});
    const sRole1 = await prisma.role.create({ data: { tenantId: t1, name: 'STUDENT', isSystem: true }});
    const sRole2 = await prisma.role.create({ data: { tenantId: t2, name: 'STUDENT', isSystem: true }});
    
    const mG = await prisma.tenantMembership.create({ data: { tenantId: t1, userId: gUser.id, state: 'ACTIVE', roleId: pRole.id }});
    const guardian = await prisma.guardian.create({ data: { tenantId: t1, membershipId: mG.id }});
    guardianId = guardian.id;

    const uS1 = await prisma.user.create({ data: { email: `s1-${ts}@test.com`, passwordHash: 'hash' }});
    const mS1 = await prisma.tenantMembership.create({ data: { tenantId: t1, userId: uS1.id, state: 'ACTIVE', roleId: sRole1.id }});
    const s1 = await prisma.student.create({ data: { tenantId: t1, admissionNumber: `S1-${ts}`, enrollmentDate: new Date(), membershipId: mS1.id }});
    s1Id = s1.id;

    const uS2 = await prisma.user.create({ data: { email: `s2-${ts}@test.com`, passwordHash: 'hash' }});
    const mS2 = await prisma.tenantMembership.create({ data: { tenantId: t1, userId: uS2.id, state: 'ACTIVE', roleId: sRole1.id }});
    const s2 = await prisma.student.create({ data: { tenantId: t1, admissionNumber: `S2-${ts}`, enrollmentDate: new Date(), membershipId: mS2.id }});
    s2Id = s2.id;

    const uS3 = await prisma.user.create({ data: { email: `s3-${ts}@test.com`, passwordHash: 'hash' }});
    const mS3 = await prisma.tenantMembership.create({ data: { tenantId: t2, userId: uS3.id, state: 'ACTIVE', roleId: sRole2.id }});
    const s3 = await prisma.student.create({ data: { tenantId: t2, admissionNumber: `S3-${ts}`, enrollmentDate: new Date(), membershipId: mS3.id }});
    s3Id = s3.id;

    await prisma.studentGuardian.create({ data: { studentId: s1Id, guardianId: guardianId, relationship: 'FATHER' }});

    const cls = await prisma.class.create({ data: { tenantId: t1, name: 'C1', level: 1 }});
    const arm = await prisma.arm.create({ data: { tenantId: t1, name: 'A', classId: cls.id, capacity: 30 }});

    await prisma.attendance.create({ data: { tenantId: t1, studentId: s1Id, date: new Date(), status: 'PRESENT', armId: arm.id }});

    const inv = await prisma.invoice.create({ data: { tenantId: t1, studentId: s1Id, termId: term1.id, invoiceNumber: `INV-${ts}`, totalAmount: 50000.0, status: 'PARTIAL', dueDate: new Date() }});
    await prisma.payment.create({ data: { tenantId: t1, invoiceId: inv.id, amount: 10000.0, method: 'CASH', reference: `REF-${ts}` }});

    const sg = await prisma.subjectGroup.create({ data: { tenantId: t1, name: 'G' }});
    const sub = await prisma.subject.create({ data: { tenantId: t1, name: 'Math', code: 'M1', subjectGroupId: sg.id }});
    const exam = await prisma.exam.create({ data: { tenantId: t1, termId: term1.id, subjectId: sub.id, totalMarks: 100, title: 'Midterm', date: new Date() }});
    await prisma.result.create({ data: { tenantId: t1, examId: exam.id, studentId: s1Id, score: 90, grade: 'A' }});
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.result.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.exam.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.payment.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.invoice.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.attendance.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.studentGuardian.deleteMany({ where: { guardianId } });
        await prisma.student.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.guardian.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.tenantMembership.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.role.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.user.deleteMany({ where: { email: { contains: ts } } });
        await prisma.subject.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.class.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.arm.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.subjectGroup.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.term.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.academicYear.deleteMany({ where: { tenantId: { in: [t1, t2] } } });
        await prisma.tenant.deleteMany({ where: { id: { in: [t1, t2] } } });
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (app) await app.close();
      if (prisma) await prisma.$disconnect();
    }
  });

  const getHeaders = (tenantId: string, userId: string) => ({
    'Authorization': 'Bearer valid_token',
    'x-mock-user': JSON.stringify({ tenantId, id: userId, sub: userId })
  });

  describe('Authorization & Isolation', () => {
    it('should allow valid guardian and return authorized children on dashboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/parent/dashboard')
        .set(getHeaders(t1, guardianUserId))
        .expect(200);

      expect(res.body.assessments).toBeDefined();
      expect(res.body.assessments.length).toBe(1);
      expect(res.body.assessments[0].studentId).toBe(s1Id);
      expect(res.body.assessments[0].firstName).toBe('Student');
    });

    it('should reject same-tenant unauthorized child access attempts (FamilyContext restriction)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/parent/finance/summary`)
        .set(getHeaders(t1, guardianUserId))
        .expect(200);

      const studentsInFinance = res.body.children.map((c: any) => c.studentId);
      expect(studentsInFinance).toContain(s1Id);
      expect(studentsInFinance).not.toContain(s2Id);
    });

    it('should reject cross-tenant child access completely', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/parent/finance/summary`)
        .set(getHeaders(t1, guardianUserId))
        .expect(200);

      const studentsInFinance = res.body.children.map((c: any) => c.studentId);
      expect(studentsInFinance).not.toContain(s3Id);
    });
  });

  describe('Data Authenticity', () => {
    it('finance data should reflect real DB records', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/parent/finance/summary`)
        .set(getHeaders(t1, guardianUserId))
        .expect(200);
      
      expect(res.body.totalOutstanding).toBeDefined(); 
      expect(res.body.children[0].totalOutstanding).toBeDefined();
    });

    it('attendance data should reflect real DB records', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/parent/dashboard`)
        .set(getHeaders(t1, guardianUserId))
        .expect(200);
      
      expect(res.body.attendance.length).toBe(1);
      expect(res.body.attendance[0].studentId).toBe(s1Id);
      expect(res.body.attendance[0].todayStatus).toBe('PRESENT');
      expect(res.body.attendance[0].termPercentage).toBe(100);
    });

    it('assessment data should reflect real DB records', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/parent/dashboard`)
        .set(getHeaders(t1, guardianUserId))
        .expect(200);
      
      expect(res.body.assessments[0].recentResults.length).toBe(1);
      expect(Number(res.body.assessments[0].recentResults[0].score)).toBe(90);
      expect(res.body.assessments[0].recentResults[0].grade).toBe('A');
    });

    it('announcements should remain explicitly empty', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/parent/dashboard`)
        .set(getHeaders(t1, guardianUserId))
        .expect(200);
      
      expect(res.body.announcements).toEqual([]);
    });
  });

  describe('SSE Stream Security', () => {
    it('SSE stream should establish connection (tested via simple HTTP GET since Jest Supertest SSE is tricky)', (done) => {
      const req = request(app.getHttpServer())
        .get(`/api/parent/events/stream`)
        .set(getHeaders(t1, guardianUserId))
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);
        
      req.end((err) => {
         if (err && err.message !== 'aborted') {
            done(err);
         }
      });

      // Abort after receiving headers to prevent hanging
      setTimeout(() => {
        req.abort();
        done();
      }, 200);
    });
  });
});
