import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Finance Frontend Integration (e2e)', () => {
  let app: INestApplication;
  let authHeader: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup an admin session for frontend testing
    const loginRes = await request(app.getHttpServer())
      .post('/v1/identity/auth/login')
      .send({ email: 'admin@school.com', password: 'password123' });
    
    authHeader = `Bearer ${loginRes.body.data?.accessToken}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/finance/reports/summary (GET) returns shape matching Frontend TrialBalance', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/finance/reports/trial-balance')
      .set('Authorization', authHeader)
      .expect(200);

    // Assert the response matches the frontend interface expectations
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    
    // Frontend expects: asOf, lines, totalDebitsKobo, totalCreditsKobo
    expect(data).toHaveProperty('asOf');
    expect(data).toHaveProperty('lines');
    expect(Array.isArray(data.lines)).toBe(true);
    expect(data).toHaveProperty('totalDebitsKobo');
    expect(data).toHaveProperty('totalCreditsKobo');

    if (data.lines.length > 0) {
      const line = data.lines[0];
      // Frontend expects: accountId, accountName, accountCode, accountType, balanceKobo
      expect(line).toHaveProperty('accountId');
      expect(line).toHaveProperty('accountName');
      expect(line).toHaveProperty('accountCode');
      expect(line).toHaveProperty('accountType');
      expect(line).toHaveProperty('balanceKobo');
    }
  });

  it('/finance/invoices (GET) returns shape matching Frontend Invoice[]', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/finance/invoices')
      .set('Authorization', authHeader)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;

    // Frontend expects: { invoices: Invoice[], total: number }
    expect(data).toHaveProperty('invoices');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.invoices)).toBe(true);

    if (data.invoices.length > 0) {
      const inv = data.invoices[0];
      // Frontend expects: id, invoiceNumber, studentId, termId, status, totalAmountKobo, amountPaidKobo, dueDate, createdAt
      expect(inv).toHaveProperty('id');
      expect(inv).toHaveProperty('invoiceNumber');
      expect(inv).toHaveProperty('studentId');
      expect(inv).toHaveProperty('termId');
      expect(inv).toHaveProperty('status');
      expect(inv).toHaveProperty('totalAmountKobo');
      expect(inv).toHaveProperty('amountPaidKobo');
      expect(inv).toHaveProperty('dueDate');
      expect(inv).toHaveProperty('createdAt');
    }
  });
});
