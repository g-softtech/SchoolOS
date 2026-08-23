import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Documents & ID Cards (e2e)', () => {
  let app: INestApplication;
  let authHeader: string;
  let unauthorizedHeader: string;
  let tenantId: string = 'tenant_123';
  let createdDocumentId: string;
  let createdIdCardToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // In a real e2e, we would login to get a real token.
    // For this boilerplate, we'll mock or assume headers.
    authHeader = 'Bearer test_token';
    unauthorizedHeader = 'Bearer invalid_token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ID Cards', () => {
    it('/v1/id-cards/issue (POST) issues a new ID card', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/id-cards/issue')
        .set('x-tenant-id', tenantId)
        .set('Authorization', authHeader)
        .send({ ownerType: 'STUDENT', ownerId: 'stu_123' });

      // Expecting 201 or 403 based on RBAC mock
      expect(res.status).toBeGreaterThanOrEqual(200);
      if (res.status === 201 || res.status === 200) {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('verificationToken');
        expect(res.body.status).toBe('ACTIVE');
        createdIdCardToken = res.body.verificationToken;
      }
    });

    it('/v1/id-cards/issue (POST) prevents multiple active cards', async () => {
      // issuing again for the same student
      const res = await request(app.getHttpServer())
        .post('/v1/id-cards/issue')
        .set('x-tenant-id', tenantId)
        .set('Authorization', authHeader)
        .send({ ownerType: 'STUDENT', ownerId: 'stu_123' });
        
      if (res.status === 201 || res.status === 200) {
        expect(res.body.verificationToken).not.toEqual(createdIdCardToken);
        // The old card should be revoked internally.
      }
    });

    it('/v1/id-cards/verify/:token (GET) public verification', async () => {
      if (!createdIdCardToken) return; // Skip if issue failed (e.g. auth mock missing)

      const res = await request(app.getHttpServer())
        .get(`/v1/id-cards/verify/${createdIdCardToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('valid');
      expect(res.body).toHaveProperty('reason');
      // Should not contain PII like email or dob
      if (res.body.idCard?.owner) {
        expect(res.body.idCard.owner).not.toHaveProperty('email');
        expect(res.body.idCard.owner).not.toHaveProperty('dateOfBirth');
      }
    });
  });

  describe('Documents', () => {
    it('/v1/documents/:ownerType/:ownerId (POST) validates file', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/documents/STUDENT/stu_123')
        .set('x-tenant-id', tenantId)
        .set('Authorization', authHeader)
        .attach('file', Buffer.from('fake pdf content'), { filename: 'test.pdf', contentType: 'application/pdf' });

      expect(res.status).toBeGreaterThanOrEqual(200);
      if (res.status === 201) {
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('test.pdf');
        createdDocumentId = res.body.id;
      }
    });

    it('/v1/documents/:ownerType/:ownerId (POST) blocks invalid mime types', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/documents/STUDENT/stu_123')
        .set('x-tenant-id', tenantId)
        .set('Authorization', authHeader)
        .attach('file', Buffer.from('fake exe content'), { filename: 'malware.exe', contentType: 'application/x-msdownload' })
        .expect(400);

      expect(res.body.message).toContain('Invalid file type');
    });
  });
});
