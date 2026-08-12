import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { GlobalExceptionFilter } from '@saas/core-platform';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockImplementation((plain) => Promise.resolve(plain === 'correct-password')),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

const TENANT_ID = 'tenant-test-001';
const USER_ID = 'user-001';
const EMAIL = 'test@schoolos.com';
const ACTIVE_SESSION_TOKEN = 'token-active-123';
const REVOKED_SESSION_TOKEN = 'token-revoked-123';
const EXPIRED_SESSION_TOKEN = 'token-expired-123';
const ACTIVE_SESSION_ID = 'session-active-123';

const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  user: {
    findUnique: jest.fn(({ where }) => {
      if (where.email === EMAIL) {
        return Promise.resolve({
          id: USER_ID,
          email: EMAIL,
          passwordHash: 'hashed-password',
        });
      }
      return Promise.resolve(null);
    }),
    create: jest.fn((args) => Promise.resolve({ id: USER_ID, email: args.data.email, passwordHash: 'hashed-password' })),
  },
  session: {
    create: jest.fn((args) => Promise.resolve({ id: randomUUID(), ...args.data })),
    findUnique: jest.fn(({ where, include }) => {
      if (where.sessionToken === ACTIVE_SESSION_TOKEN) {
        return Promise.resolve({
          id: ACTIVE_SESSION_ID,
          userId: USER_ID,
          sessionToken: ACTIVE_SESSION_TOKEN,
          status: 'ACTIVE',
          expires: new Date(Date.now() + 100000),
          user: include?.user ? { id: USER_ID, email: EMAIL } : undefined,
        });
      }
      if (where.sessionToken === REVOKED_SESSION_TOKEN) {
        return Promise.resolve({
          id: 'session-revoked-123',
          userId: USER_ID,
          sessionToken: REVOKED_SESSION_TOKEN,
          status: 'REVOKED',
          expires: new Date(Date.now() + 100000),
          user: include?.user ? { id: USER_ID, email: EMAIL } : undefined,
        });
      }
      if (where.sessionToken === EXPIRED_SESSION_TOKEN) {
        return Promise.resolve({
          id: 'session-expired-123',
          userId: USER_ID,
          sessionToken: EXPIRED_SESSION_TOKEN,
          status: 'ACTIVE',
          expires: new Date(Date.now() - 100000),
          user: include?.user ? { id: USER_ID, email: EMAIL } : undefined,
        });
      }
      return Promise.resolve(null);
    }),
    update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
    updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
  },
};

describe('Level 2: Authentication', () => {
  let app: INestApplication;
  let eventEmitter: EventEmitter2;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new (require('@nestjs/common').ValidationPipe)());
    app.useGlobalFilters(new GlobalExceptionFilter()); // Apply global filter for Explainability
    eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(eventEmitter, 'emit');
  });

  const req = () => request(app.getHttpServer());

  describe('1. Identity proof', () => {
    it('rejects invalid credentials with Explainability payload', () => {
      return req()
        .post('/api/v1/auth/login')
        .set('x-tenant-id', TENANT_ID)
        .send({ email: EMAIL, password: 'wrong-password' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.domain).toBe('IDENTITY');
          expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
          expect(res.body.error.correlationId).toBeDefined();
        });
    });

    it('rejects unknown users', () => {
      return req()
        .post('/api/v1/auth/login')
        .set('x-tenant-id', TENANT_ID)
        .send({ email: 'unknown@schoolos.com', password: 'correct-password' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
        });
    });
  });

  describe('2. Access token issuance', () => {
    it('issues JWT and refresh token on valid login', () => {
      return req()
        .post('/api/v1/auth/login')
        .set('x-tenant-id', TENANT_ID)
        .send({ email: EMAIL, password: 'correct-password' })
        .set('x-device-id', 'test-device-123')
        .set('user-agent', 'jest-test')
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(mockPrisma.session.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                userId: USER_ID,
                device: 'test-device-123',
                userAgent: 'jest-test',
              }),
            }),
          );
        });
    });
  });

  describe('3. Refresh token rotation', () => {
    it('issues new tokens on valid refresh and updates session', () => {
      return req()
        .post('/api/v1/auth/refresh')
        .set('x-tenant-id', TENANT_ID)
        .send({ refreshToken: ACTIVE_SESSION_TOKEN })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(res.body.refreshToken).not.toBe(ACTIVE_SESSION_TOKEN);
          expect(mockPrisma.session.update).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { id: ACTIVE_SESSION_ID },
              data: expect.objectContaining({ sessionToken: res.body.refreshToken }),
            }),
          );
        });
    });
  });

  describe('4. Logout', () => {
    it('successfully revokes a session', () => {
      return req()
        .post('/api/v1/auth/logout')
        .set('x-tenant-id', TENANT_ID)
        .send({ refreshToken: ACTIVE_SESSION_TOKEN })
        .expect(200)
        .expect((res) => {
          expect(mockPrisma.session.update).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { id: ACTIVE_SESSION_ID },
              data: expect.objectContaining({ status: 'REVOKED' }),
            }),
          );
        });
    });
  });

  describe('5. Revocation', () => {
    it('rejects revoked tokens', () => {
      return req()
        .post('/api/v1/auth/refresh')
        .set('x-tenant-id', TENANT_ID)
        .send({ refreshToken: REVOKED_SESSION_TOKEN })
        .expect(401)
        .expect((res) => {
          expect(res.body.error.code).toBe('TOKEN_REVOKED');
        });
    });
  });

  describe('6. Expiration', () => {
    it('rejects expired tokens and marks session EXPIRED', () => {
      return req()
        .post('/api/v1/auth/refresh')
        .set('x-tenant-id', TENANT_ID)
        .send({ refreshToken: EXPIRED_SESSION_TOKEN })
        .expect(401)
        .expect((res) => {
          expect(res.body.error.code).toBe('TOKEN_EXPIRED');
          expect(mockPrisma.session.update).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { id: 'session-expired-123' },
              data: expect.objectContaining({ status: 'EXPIRED' }),
            }),
          );
        });
    });
  });

  describe('7. Replay detection', () => {
    it('rejects same invalid payload immediately across multiple replays', async () => {
      await req()
        .post('/api/v1/auth/refresh')
        .set('x-tenant-id', TENANT_ID)
        .send({ refreshToken: 'unknown-token' })
        .expect(401);
      
      await req()
        .post('/api/v1/auth/refresh')
        .set('x-tenant-id', TENANT_ID)
        .send({ refreshToken: 'unknown-token' })
        .expect(401);
    });
  });

  describe('8. Refresh token reuse detection', () => {
    it('triggers massive revocation and security alert on reuse of revoked token', async () => {
      await req()
        .post('/api/v1/auth/refresh')
        .set('x-tenant-id', TENANT_ID)
        .send({ refreshToken: REVOKED_SESSION_TOKEN })
        .expect(401);

      // Verify cascading revocation
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, status: 'ACTIVE' },
          data: { status: 'REVOKED' },
        }),
      );

      // Verify Domain and Audit events
      expect(eventEmitter.emit).toHaveBeenCalledWith('Security.TokenReuseDetected', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('AUTH_SECURITY_ALERT', expect.objectContaining({
        type: 'TOKEN_REUSE',
        userId: USER_ID,
      }));
    });
  });

  describe('9. Multi-device sessions', () => {
    it('models each login as an independent session', async () => {
      await req().post('/api/v1/auth/login').set('x-tenant-id', TENANT_ID).send({ email: EMAIL, password: 'correct-password' }).set('x-device-id', 'device-A');
      await req().post('/api/v1/auth/login').set('x-tenant-id', TENANT_ID).send({ email: EMAIL, password: 'correct-password' }).set('x-device-id', 'device-B');

      expect(mockPrisma.session.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.session.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ device: 'device-A' }) }));
      expect(mockPrisma.session.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ device: 'device-B' }) }));
    });
  });

  describe('10. Audit completeness', () => {
    it('emits AUTH_LOGIN_SUCCESS audit event on valid login', async () => {
      await req().post('/api/v1/auth/login').set('x-tenant-id', TENANT_ID).send({ email: EMAIL, password: 'correct-password' });
      expect(eventEmitter.emit).toHaveBeenCalledWith('AUTH_LOGIN_SUCCESS', expect.objectContaining({ userId: USER_ID }));
    });

    it('emits AUTH_LOGOUT audit event on logout', async () => {
      await req().post('/api/v1/auth/logout').set('x-tenant-id', TENANT_ID).send({ refreshToken: ACTIVE_SESSION_TOKEN });
      expect(eventEmitter.emit).toHaveBeenCalledWith('AUTH_LOGOUT', expect.objectContaining({ userId: USER_ID }));
    });
  });

  describe('11. Explainability', () => {
    it('returns deterministically typed payload on bad request format', async () => {
      return req()
        .post('/api/v1/auth/login')
        .set('x-tenant-id', TENANT_ID)
        .send({ no_email_provided: true })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('HTTP_ERROR');
          expect(res.body.error.domain).toBe('PLATFORM');
          expect(res.body.error.correlationId).toBeDefined();
        });
    });
  });

  describe('12. Performance', () => {
    it('executes login under acceptable latencies (1000ms)', async () => {
      const start = Date.now();
      await req().post('/api/v1/auth/login').set('x-tenant-id', TENANT_ID).send({ email: EMAIL, password: 'correct-password' }).expect(200);
      const latency = Date.now() - start;
      expect(latency).toBeLessThan(1000); 
    });
  });

  describe('13. Security', () => {
    it('keeps domain events separate from audit events', async () => {
      await req().post('/api/v1/auth/login').set('x-tenant-id', TENANT_ID).send({ email: EMAIL, password: 'correct-password' });
      expect(eventEmitter.emit).toHaveBeenCalledWith('Identity.LoginSucceeded', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('AUTH_LOGIN_SUCCESS', expect.any(Object));
    });
  });
});
