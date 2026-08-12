import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import request from 'supertest';

@Controller('smoke')
class SmokeController {
  @Get()
  ping() {
    return { message: 'pong' };
  }
}

describe('Supertest Smoke Test (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SmokeController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should successfully make an HTTP request and verify response', () => {
    return request(app.getHttpServer())
      .get('/smoke')
      .expect(200)
      .expect({ message: 'pong' });
  });
});
