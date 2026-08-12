import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementsService } from './entitlements.service';

describe('EntitlementsService', () => {
  let service: EntitlementsService;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({
      providers: [EntitlementsService],
    }, PrismaService).compile();

    service = module.get<EntitlementsService>(EntitlementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
