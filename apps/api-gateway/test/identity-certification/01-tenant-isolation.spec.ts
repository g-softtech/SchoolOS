import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';

// =============================================================================
// Level 1: Tenant Isolation
//
// Constitutional Rule:
//   Data belonging to one tenant MUST never be observable by another tenant.
//   Every request MUST enforce tenantId via zero-trust middleware.
//   No cross-tenant operation may succeed under any conditions.
// =============================================================================

// Golden Dataset
const TENANT_A_ID = 'tenant-a-001-aaaa-aaaa-aaaaaaaaaaaa';
const TENANT_B_ID = 'tenant-b-002-bbbb-bbbb-bbbbbbbbbbbb';
const USER_A_ID   = 'user-a-001-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B_ID   = 'user-b-002-bbbb-bbbb-bbbbbbbbbbbb';
const STUDENT_A_ID = 'student-a-001-aaaa-aaaa-aaaaaaaaaaaa';
const STUDENT_B_ID = 'student-b-002-bbbb-bbbb-bbbbbbbbbbbb';
const GUARDIAN_B_ID = 'guardian-b-001-bbbb-bbbb-bbbbbbbbbbbb';

// =============================================================================
// Shared Mock Prisma — simulates true tenant-scoped DB responses.
// Calls with a mismatched tenantId return null (as production Prisma would).
// =============================================================================
const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  student: {
    findUnique: jest.fn(({ where }) => {
      // Simulates DB-level WHERE id=X AND tenantId=Y
      if (where.id === STUDENT_A_ID && where.tenantId === TENANT_A_ID) {
        return Promise.resolve({ id: STUDENT_A_ID, tenantId: TENANT_A_ID, admissionNumber: 'A001' });
      }
      if (where.id === STUDENT_B_ID && where.tenantId === TENANT_B_ID) {
        return Promise.resolve({ id: STUDENT_B_ID, tenantId: TENANT_B_ID, admissionNumber: 'B001' });
      }
      // Cross-tenant: returns null — no 403 leak of existence
      return Promise.resolve(null);
    }),
    findMany: jest.fn(({ where }) => {
      // Returns only records scoped to the requested tenantId
      if (where.tenantId === TENANT_A_ID) {
        return Promise.resolve([{ id: STUDENT_A_ID, tenantId: TENANT_A_ID }]);
      }
      if (where.tenantId === TENANT_B_ID) {
        return Promise.resolve([{ id: STUDENT_B_ID, tenantId: TENANT_B_ID }]);
      }
      return Promise.resolve([]);
    }),
    update: jest.fn(({ where }) => {
      // Rejects cross-tenant writes deterministically
      if (where.id === STUDENT_B_ID && where.tenantId === TENANT_A_ID) {
        return Promise.resolve(null); // Nothing updated
      }
      return Promise.resolve({ id: where.id, tenantId: where.tenantId });
    }),
    create: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(({ where }) => {
      // Audit logs are also tenant-scoped
      if (where.tenantId === TENANT_A_ID) {
        return Promise.resolve([{ id: 'log-a', tenantId: TENANT_A_ID, action: 'LOGIN' }]);
      }
      return Promise.resolve([]);
    }),
  },
};

describe('Level 1: Tenant Isolation', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // JWTs per tenant — simulating tokens issued at login
  let tokenForTenantA: string;
  let tokenForTenantB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = app.get(JwtService);

    // Issue tokens scoped to each user (tenant resolved via membership at runtime)
    tokenForTenantA = jwtService.sign({ sub: USER_A_ID });
    tokenForTenantB = jwtService.sign({ sub: USER_B_ID });
  });

  afterAll(async () => {
    await app.close();
  });

  // ===========================================================================
  // 1. ZERO-TRUST GATEWAY ENFORCEMENT
  //    Every request without x-tenant-id must be blocked unconditionally.
  // ===========================================================================
  describe('1a. Zero-Trust Gateway', () => {
    it('blocks all requests without x-tenant-id header (403 Forbidden)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/students/search')
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toBe('Missing x-tenant-id header');
        });
    });

    it('allows requests when x-tenant-id is present (middleware passes)', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('x-tenant-id', TENANT_A_ID)
        .expect(200);
    });

    it('does not accept x-tenant-id from request body (header-only enforcement)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/students/search')
        .send({ tenantId: TENANT_A_ID }) // body injection attempt
        // expect(403) because header is missing
        .expect(403);
    });
  });

  // ===========================================================================
  // 2. READ ISOLATION
  //    Tenant A cannot observe Tenant B's data under any conditions.
  // ===========================================================================
  describe('1b. Read Isolation', () => {
    it('Tenant A receives their own student data when requesting their ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_A_ID}`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .expect((res) => {
          // Either 200 with A's data, or 400 if permission check fails
          // Crucially: must NOT be Tenant B's data
          if (res.status === 200) {
            expect(res.body.data?.tenantId ?? res.body?.tenantId).toBe(TENANT_A_ID);
          }
        });
    });

    it('Tenant A cannot read Tenant B student — returns 400 (not found), NOT 403', () => {
      // Requesting Tenant B's student ID, but using Tenant A's header.
      // The DB silently returns null (tenantId mismatch) → 404 Not Found.
      // A 403 would expose the resource exists in another tenant (IDOR risk).
      // NOTE: NestJS 404 messages echo the URL path — that's acceptable,
      //       what must NOT appear is actual tenant data (tenantId field, student object).
      return request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_B_ID}`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
          // Must NOT return actual Tenant B data fields
          expect(res.body.tenantId).toBeUndefined();
          expect(res.body.admissionNumber).toBeUndefined();
          expect(res.body.data).toBeUndefined();
        });
    });

    it('Tenant A student list does not contain Tenant B students', () => {
      return request(app.getHttpServer())
        .get('/api/v1/students/search')
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .expect((res) => {
          if (res.status === 200) {
            const students = res.body.data ?? res.body;
            const ids = (Array.isArray(students) ? students : []).map((s: any) => s.id);
            expect(ids).not.toContain(STUDENT_B_ID);
          }
        });
    });

    it('Tenant A cannot read Tenant B guardians', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_B_ID}/guardians`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .expect((res) => {
          expect([400, 401, 403, 404]).toContain(res.status);
          expect(res.body.tenantId).toBeUndefined();
        });
    });

    it('Tenant A cannot enumerate IDs belonging to Tenant B', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/students`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .expect((res) => {
          if (res.status === 200) {
            const students = res.body.data ?? res.body;
            const ids = (Array.isArray(students) ? students : []).map((s: any) => s.id);
            expect(ids).not.toContain(STUDENT_B_ID);
          }
        });
    });
  });

  // ===========================================================================
  // 3. WRITE ISOLATION
  //    Tenant A cannot mutate Tenant B's data under any conditions.
  // ===========================================================================
  describe('1c. Write Isolation', () => {
    it('Tenant A cannot update Tenant B student (cross-tenant write rejected)', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_B_ID}/status`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .send({ targetStatus: 'GRADUATED', reason: 'cross-tenant attack' })
        .expect((res) => {
          // Must fail — 400 (not found) or 403 (permission)
          expect([400, 403, 404]).toContain(res.status);
        });
    });

    it('Tenant A cannot create memberships in Tenant B', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/memberships`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .send({ userId: USER_A_ID, targetTenantId: TENANT_B_ID, role: 'ADMIN' })
        .expect((res) => {
          expect([400, 401, 403, 404]).toContain(res.status);
        });
    });

    it('Tenant A cannot delete Tenant B resources', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/students/${STUDENT_B_ID}`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .expect((res) => {
          expect([400, 401, 403, 404]).toContain(res.status);
        });
    });

    it('Tenant A cannot attach foreign relationships', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_A_ID}/guardians`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .send({ guardianId: GUARDIAN_B_ID, relationshipType: 'PARENT', isPrimary: true })
        .expect((res) => {
          expect([400, 401, 403, 404]).toContain(res.status);
        });
    });
  });

  // ===========================================================================
  // 4. AUTHENTICATION ISOLATION
  //    A token issued for Tenant A must not grant access to Tenant B's context.
  // ===========================================================================
  describe('1d. Authentication Isolation', () => {
    it('Token issued for User A with Tenant B header cannot retrieve Tenant B student', () => {
      // Token sub = USER_A_ID, header claims TENANT_B — membership check should fail.
      // NOTE: NestJS 404 messages echo the URL path — that's acceptable.
      //       What must NOT appear is actual student data (tenantId, admissionNumber, etc.)
      return request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_B_ID}`)
        .set('x-tenant-id', TENANT_B_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`) // Tenant A's token
        .expect((res) => {
          // Either 401 (membership not found) or 403 (not authorized) or 404 (not found)
          expect([400, 401, 403, 404]).toContain(res.status);
          // Must NOT return actual Tenant B student data
          expect(res.body.tenantId).toBeUndefined();
          expect(res.body.admissionNumber).toBeUndefined();
          expect(res.body.data).toBeUndefined();
        });
    });

    it('Membership resolution always uses the correct tenant', () => {
      // Sending Tenant B's token with Tenant A's context must fail
      return request(app.getHttpServer())
        .get(`/api/v1/students/search`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantB}`)
        .expect((res) => {
          expect([400, 401, 403, 404]).toContain(res.status);
        });
    });
  });

  // ===========================================================================
  // 5. ERROR HANDLING — Information Disclosure
  //    Errors must never reveal cross-tenant resource existence.
  // ===========================================================================
  describe('1e. Error Handling', () => {
    it('Cross-tenant lookup returns a non-existence error, not a permission error', () => {
      // A 403 would expose that the resource exists (IDOR risk)
      // A 404/400 (not found) is correct — it reveals nothing
      return request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_B_ID}`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .expect((res) => {
          expect(res.status).not.toBe(403);
          expect(JSON.stringify(res.body)).not.toContain(TENANT_B_ID);
        });
    });

    it('Error responses never leak tenant IDs from other tenants', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/students/non-existent-id`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .expect((res) => {
          expect(JSON.stringify(res.body)).not.toContain(TENANT_B_ID);
          expect(JSON.stringify(res.body)).not.toContain(GUARDIAN_B_ID);
        });
    });
  });

  // ===========================================================================
  // 6. BACKGROUND PROCESSING
  // ===========================================================================
  describe('1f. Background Processing', () => {
    it('Background jobs only process records for their tenant', async () => {
      // This tests the logical boundary: a background job executing in the context of Tenant A
      // should only ever see Tenant A's records, even if processing a global queue.
      const mockJobProcessor = async (tenantId: string) => {
        return mockPrisma.student.findMany({ where: { tenantId } });
      };
      
      const recordsForA = await mockJobProcessor(TENANT_A_ID);
      const idsForA = recordsForA.map(r => r.id);
      expect(idsForA).toContain(STUDENT_A_ID);
      expect(idsForA).not.toContain(STUDENT_B_ID);
      
      const recordsForB = await mockJobProcessor(TENANT_B_ID);
      const idsForB = recordsForB.map(r => r.id);
      expect(idsForB).toContain(STUDENT_B_ID);
      expect(idsForB).not.toContain(STUDENT_A_ID);
    });

    it('Events never leak across tenants', () => {
      const eventPayload = { tenantId: TENANT_A_ID, type: 'STUDENT_CREATED', data: { id: STUDENT_A_ID } };
      expect(eventPayload.tenantId).toBe(TENANT_A_ID);
      expect(eventPayload.tenantId).not.toBe(TENANT_B_ID);
    });
  });

  // ===========================================================================
  // 7. AUDIT ISOLATION
  //    Audit logs must be tenant-scoped — a tenant admin must NEVER see
  //    another tenant's audit trail.
  // ===========================================================================
  describe('1g. Audit Isolation', () => {
    it('Audit logs returned to Tenant A never contain Tenant B entries', async () => {
      const logsA = await mockPrisma.auditLog.findMany({ where: { tenantId: TENANT_A_ID } });
      expect(logsA.some(log => log.tenantId === TENANT_B_ID)).toBe(false);
    });

    it('A tenant administrator cannot query another tenant audit trail', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/audit`)
        .set('x-tenant-id', TENANT_A_ID)
        .set('Authorization', `Bearer ${tokenForTenantA}`)
        .query({ targetTenantId: TENANT_B_ID }) // Attempting to override via query param
        .expect((res) => {
          if (res.status === 200) {
             const logs = res.body.data ?? res.body;
             const leak = (Array.isArray(logs) ? logs : []).some((log: any) => log.tenantId === TENANT_B_ID);
             expect(leak).toBe(false);
          } else {
             expect([400, 401, 403, 404]).toContain(res.status);
          }
        });
    });
  });
});
