import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
const request = (supertest as any).default || supertest;
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { IdentityModule } from '../../src/modules/identity/identity.module';
import { DatabaseModule } from '../../src/database/database.module';
import { RedisCacheModule } from '../../src/platform-services/redis/redis.module';
// Assuming a TestDatabaseModule or similar exists, but we mock the services for pure auth endpoint testing
import { AuthenticationService } from '../../src/modules/identity/services/authentication.service';
import { RegistrationService } from '../../src/modules/identity/services/registration.service';
import { SessionService } from '../../src/modules/identity/services/session.service';
import { PasswordService } from '../../src/modules/identity/services/password.service';
import { PrismaService } from '@saas/core-platform';

describe('AuthController (e2e)', () => {
  jest.setTimeout(30000); // 30 seconds for DB bootstrap/teardown
  
  let app: INestApplication;
  let authService: any;

  beforeAll(async () => {
    authService = {
      login: jest.fn().mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env.test' }),
        RedisCacheModule,
        DatabaseModule,
        IdentityModule,
        ThrottlerModule.forRoot([{
          ttl: 60000,
          limit: 10,
        }]),
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        }
      ]
    })
      .overrideProvider('CACHE_PROVIDER')
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        reset: jest.fn(),
      })
      .overrideProvider(PrismaService)
      .useValue({
        tenant: { findUnique: jest.fn() },
        user: { findUnique: jest.fn() },
        role: { findUnique: jest.fn(), findFirst: jest.fn() },
        policy: { findMany: jest.fn() },
      })
      .overrideProvider(AuthenticationService)
      .useValue(authService)
      .overrideProvider(RegistrationService)
      .useValue({})
      .overrideProvider(SessionService)
      .useValue({})
      .overrideProvider(PasswordService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/v1/auth/login (POST) should enforce rate limiting', async () => {
    // We send 11 requests. The limit is 10 per 60s.
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'password' });
        // We do not enforce .expect(200) here because the real auth service might return 401,
        // which still counts towards the rate limit quota.
    }

    // The 11th request should be throttled (429 Too Many Requests)
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'password' });
    
    expect(res.status).toBe(429);
  });
});
