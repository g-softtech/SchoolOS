import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({
      providers: [StorageService],
    }, PrismaService).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
