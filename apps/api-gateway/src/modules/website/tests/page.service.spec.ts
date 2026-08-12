import { createTestingModuleWithMocks } from '@saas/testing';
import { PrismaService } from '../../../database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PageService } from '../services/page.service';
import { PageRepository } from '../repositories/page.repository';
import { WebsiteRepository } from '../repositories/website.repository';
import { PlatformEventBus } from '@saas/core-platform';

describe('PageService', () => {
  let service: PageService;
  let pageRepo: jest.Mocked<PageRepository>;
  let eventBus: jest.Mocked<PlatformEventBus>;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({}, PrismaService).compile();

    service = module.get<PageService>(PageService);
    pageRepo = module.get(PageRepository);
    eventBus = module.get(PlatformEventBus);
  });

  it('should publish Website.PagePublished event when publishing a page', async () => {
    pageRepo.findById.mockResolvedValue({ id: '1', slug: 'home' } as any);
    pageRepo.update.mockResolvedValue({ id: '1', slug: 'home', status: 'PUBLISHED' } as any);

    await service.publishPage('tenant-1', '1');

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'Website.PagePublished',
        payload: { tenantId: 'tenant-1', pageId: '1', slug: 'home' }
      })
    );
  });
});
