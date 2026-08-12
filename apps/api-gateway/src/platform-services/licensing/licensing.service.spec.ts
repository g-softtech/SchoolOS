import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LicensingService } from './licensing.service';

describe('LicensingService', () => {
  let service: LicensingService;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({
      providers: [LicensingService],
    }, PrismaService).compile();

    service = module.get<LicensingService>(LicensingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
