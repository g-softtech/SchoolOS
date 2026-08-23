import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Transport API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // The application is protected by TenantMiddleware and JWT.
  // We mock a request or rely on a known test tenant/auth logic.
  // For the sake of this mock e2e test, we'll verify the routes exist (even if they return 403/401).

  it('/v1/transport/vehicles (GET) should return 403 or 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/v1/transport/vehicles')
      .expect((res) => {
        if (res.status !== 401 && res.status !== 403) {
          throw new Error('Expected 401 or 403');
        }
      });
  });

  it('/v1/transport/routes (GET) should return 403 or 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/v1/transport/routes')
      .expect((res) => {
        if (res.status !== 401 && res.status !== 403) {
          throw new Error('Expected 401 or 403');
        }
      });
  });

  it('/v1/transport/allocations (GET) should return 403 or 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/v1/transport/allocations')
      .expect((res) => {
        if (res.status !== 401 && res.status !== 403) {
          throw new Error('Expected 401 or 403');
        }
      });
  });

  it('/v1/transport/maintenance (GET) should return 403 or 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/v1/transport/maintenance')
      .expect((res) => {
        if (res.status !== 401 && res.status !== 403) {
          throw new Error('Expected 401 or 403');
        }
      });
  });
});
