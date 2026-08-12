import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PageService } from '../services/page.service';
import { PageRepository } from '../repositories/page.repository';
import { WebsiteRepository } from '../repositories/website.repository';
import { OutboxService } from '@saas/core-platform';

describe('PageService', () => {
  let service: PageService;
  let pageRepo: jest.Mocked<PageRepository>;
  let outboxService: jest.Mocked<OutboxService>;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({
      providers: [PageService, PageRepository, WebsiteRepository, OutboxService]
    }, PrismaService).compile();

    service = module.get<PageService>(PageService);
    pageRepo = module.get(PageRepository);
    outboxService = module.get(OutboxService);

    // Mock the transaction method to just run the callback
    pageRepo.transaction = jest.fn().mockImplementation(async (cb) => {
      return cb({ ...pageRepo, prisma: {} });
    });
  });

  it('should append Website.PagePublished event when publishing a page', async () => {
    pageRepo.findById.mockResolvedValue({ id: '1', slug: 'home' } as any);
    pageRepo.update.mockResolvedValue({ id: '1', slug: 'home', status: 'PUBLISHED' } as any);

    await service.publishPage('tenant-1', '1');

    expect(outboxService.appendEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'Website.PagePublished',
        payload: { tenantId: 'tenant-1', pageId: '1', slug: 'home' }
      })
    );
  });
});
