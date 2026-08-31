import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:\\my_school_app\\saas-platform\\.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule, PrismaService } from '@saas/core-platform';
import { ExaminationsModule } from '../../examinations.module';
const request = require('supertest');
import { Reflector } from '@nestjs/core';

class MockJwtAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    if (req.headers['authorization'] === 'Bearer invalid_token') {
      throw new UnauthorizedException();
    }
    req.user = req.headers['x-mock-user'] ? JSON.parse(req.headers['x-mock-user']) : { tenantId: 'tenant-1' };
    req.workspaceContext = { tenantId: req.user.tenantId };
    return true;
  }
}

class MockPermissionsGuard {
  constructor(private reflector: Reflector) {}
  canActivate(context: any) {
    const requiredPermissions = this.reflector.get<string[]>('require_permission', context.getHandler());
    const req = context.switchToHttp().getRequest();
    if (requiredPermissions && requiredPermissions.length > 0 && req.headers['x-mock-permissions']) {
       const userPerms = JSON.parse(req.headers['x-mock-permissions']);
       const hasPerm = requiredPermissions.some(rp => userPerms.includes(rp));
       if (!hasPerm) return false;
    }
    return true;
  }
}

describe('Examinations & Results (Real E2E)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;

  const tenantSuffix = Date.now().toString();
  const tenant1 = `e2e-exam-tenant1-${tenantSuffix}`;
  const tenant2 = `e2e-exam-tenant2-${tenantSuffix}`;
  
  let t1Term: any, t1Subject: any, t1Student: any, t1Exam: any;
  let t2Term: any, t2Subject: any, t2Student: any, t2Exam: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        EventEmitterModule.forRoot(),
        ExaminationsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new MockJwtAuthGuard(), new MockPermissionsGuard(reflector));
    
    prisma = app.get(PrismaService);
    await app.init();

    // Setup Tenants
    const plan = await prisma.platformPlan.findFirst() || await prisma.platformPlan.create({ data: { name: 'Basic', priceMonthly: 0, priceYearly: 0, features: {} }});
    await prisma.tenant.createMany({
      data: [
        { id: tenant1, name: 'T1', slug: `t1-${tenantSuffix}`, planId: plan.id, status: 'ACTIVE' },
        { id: tenant2, name: 'T2', slug: `t2-${tenantSuffix}`, planId: plan.id, status: 'ACTIVE' }
      ]
    });

    const academicYear1 = await prisma.academicYear.create({ data: { tenantId: tenant1, name: '2026', startDate: new Date(), endDate: new Date(), status: 'ACTIVE' }});
    const academicYear2 = await prisma.academicYear.create({ data: { tenantId: tenant2, name: '2026', startDate: new Date(), endDate: new Date(), status: 'ACTIVE' }});

    t1Term = await prisma.term.create({ data: { tenantId: tenant1, academicYearId: academicYear1.id, name: 'Term 1', startDate: new Date(), endDate: new Date() }});
    t2Term = await prisma.term.create({ data: { tenantId: tenant2, academicYearId: academicYear2.id, name: 'Term 1', startDate: new Date(), endDate: new Date() }});

    const group1 = await prisma.subjectGroup.create({ data: { tenantId: tenant1, name: 'Group1' }});
    const group2 = await prisma.subjectGroup.create({ data: { tenantId: tenant2, name: 'Group2' }});
    
    t1Subject = await prisma.subject.create({ data: { tenantId: tenant1, name: 'Math', code: 'MTH1', subjectGroupId: group1.id }});
    t2Subject = await prisma.subject.create({ data: { tenantId: tenant2, name: 'Math', code: 'MTH2', subjectGroupId: group2.id }});

    const user1 = await prisma.user.create({ data: { email: `stu1-${tenantSuffix}@test.com`, passwordHash: 'hash' }});
    const user2 = await prisma.user.create({ data: { email: `stu2-${tenantSuffix}@test.com`, passwordHash: 'hash' }});
    
    const r1 = await prisma.role.create({ data: { tenantId: tenant1, name: 'STUDENT', isSystem: false } });
    const r2 = await prisma.role.create({ data: { tenantId: tenant2, name: 'STUDENT', isSystem: false } });
    const m1 = await prisma.tenantMembership.create({ data: { tenantId: tenant1, userId: user1.id, state: 'ACTIVE', roleId: r1.id } });
    const m2 = await prisma.tenantMembership.create({ data: { tenantId: tenant2, userId: user2.id, state: 'ACTIVE', roleId: r2.id } });

    const t1Class = await prisma.class.create({ data: { tenantId: tenant1, name: 'Grade 10', level: 10, subjects: { connect: { id: t1Subject.id } } }});
    const t2Class = await prisma.class.create({ data: { tenantId: tenant2, name: 'Grade 10', level: 10, subjects: { connect: { id: t2Subject.id } } }});
    const t1Arm = await prisma.arm.create({ data: { tenantId: tenant1, name: 'A', classId: t1Class.id, capacity: 30 }});
    const t2Arm = await prisma.arm.create({ data: { tenantId: tenant2, name: 'A', classId: t2Class.id, capacity: 30 }});

    t1Student = await prisma.student.create({ data: { tenantId: tenant1, admissionNumber: `STU1-${tenantSuffix}`, enrollmentDate: new Date(), membershipId: m1.id, currentArmId: t1Arm.id }});
    t2Student = await prisma.student.create({ data: { tenantId: tenant2, admissionNumber: `STU2-${tenantSuffix}`, enrollmentDate: new Date(), membershipId: m2.id, currentArmId: t2Arm.id }});
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.result.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.exam.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.student.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.user.deleteMany({ where: { email: { contains: tenantSuffix } } });
        await prisma.subject.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.subjectGroup.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.term.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.academicYear.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
        await prisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      if (app) await app.close();
      if (prisma) await prisma.$disconnect();
    }
  });

  describe('Exams RBAC & Tenant Isolation', () => {
    it('should reject unauthorized access (401)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exams')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('should reject access without required permissions (403)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exams')
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify([]))
        .expect(403);
    });

    it('should create an exam for T1 (requires exam.manage)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/exams')
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['exam.manage']))
        .send({
          termId: t1Term.id,
          subjectId: t1Subject.id,
          title: 'Midterm Math',
          totalMarks: 100,
          isCBT: false,
          date: new Date().toISOString(),
        })
        .expect(201);
        
      t1Exam = res.body;
      expect(t1Exam.title).toBe('Midterm Math');
      expect(t1Exam.tenantId).toBe(tenant1);
    });

    it('should fetch isolated exams (requires exam.view)', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/v1/exams')
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['exam.view']))
        .expect(200);
      expect(res1.body.length).toBe(1);

      const res2 = await request(app.getHttpServer())
        .get('/api/v1/exams')
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant2 }))
        .set('x-mock-permissions', JSON.stringify(['exam.view']))
        .expect(200);
      expect(res2.body.length).toBe(0);
    });
  });

  describe('Grading & Result Logic', () => {
    it('should allow batch enter results for valid tenant (requires exam.grade)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exams/${t1Exam.id}/results/batch`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['exam.grade']))
        .send({
          results: [
            { studentId: t1Student.id, score: 85, remarks: 'Excellent' }
          ]
        })
        .expect(201);
        
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('should calculate the correct grade based on score', async () => {
      // Re-fetch the result from the db to check the grade
      const result = await prisma.result.findFirst({
        where: { tenantId: tenant1, examId: t1Exam.id, studentId: t1Student.id }
      });
      expect(result).toBeDefined();
      expect(result?.grade).toBe('A');
    });

    it('should reject batch enter for another tenants exam (Tenant Isolation)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/exams/${t1Exam.id}/results/batch`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant2 }))
        .set('x-mock-permissions', JSON.stringify(['exam.grade']))
        .send({
          results: [
            { studentId: t2Student.id, score: 85 }
          ]
        })
        .expect(404);
    });
    
    it('should reject scores greater than totalMarks', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/exams/${t1Exam.id}/results/batch`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['exam.grade']))
        .send({
          results: [
            { studentId: t1Student.id, score: 101 }
          ]
        })
        .expect(400); // Bad request exception from result.service.ts
    });
  });

  describe('Student Results (Read)', () => {
    it('should reject unauthorized access (401)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/students/${t1Student.id}/results`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('should reject access without exam.view permission (403)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/students/${t1Student.id}/results`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify([]))
        .expect(403);
    });

    it('should allow fetching student results with exam.view permission', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${t1Student.id}/results`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['exam.view']))
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(1);
      expect(res.body[0].studentId).toBe(t1Student.id);
      expect(Number(res.body[0].score)).toBe(85);
      expect(res.body[0].grade).toBe('A');
      expect(res.body[0].exam).toBeDefined();
      expect(res.body[0].exam.subject).toBeDefined();
      expect(res.body[0].exam.subject.name).toBe('Math');
    });

    it('should return 404 for a student that does not belong to the tenant (Tenant Isolation)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/students/${t2Student.id}/results`)
        .set('Authorization', 'Bearer valid_token')
        .set('x-mock-user', JSON.stringify({ tenantId: tenant1 }))
        .set('x-mock-permissions', JSON.stringify(['exam.view']))
        .expect(404);
    });
  });
});
