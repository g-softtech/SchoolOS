import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { WebsiteModule } from '../website.module';

describe('Website Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WebsiteModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/website/settings (GET) should enforce x-tenant-id isolation', () => {
    return request(app.getHttpServer())
      .get('/api/v1/website/settings')
      // Simulate mocked JWT auth token here
      .set('Authorization', 'Bearer mock-token')
      .expect(403); // Assuming the PoliciesGuard rejects without proper tenant context
  });

  it('/api/v1/website/pages (POST) should enforce @RequirePermission', () => {
    return request(app.getHttpServer())
      .post('/api/v1/website/pages')
      .set('Authorization', 'Bearer token-without-permission')
      .set('x-tenant-id', 'tenant-1')
      .send({ title: 'Test', slug: 'test' })
      .expect(403);
  });
});
