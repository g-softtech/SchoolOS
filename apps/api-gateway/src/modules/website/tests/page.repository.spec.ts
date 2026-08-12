import { Test, TestingModule } from '@nestjs/testing';
import { PageRepository } from '../repositories/page.repository';
import { PrismaClient } from '@saas/core-platform';

describe('PageRepository Integration', () => {
  let repo: PageRepository;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    repo = new PageRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should enforce optimistic locking during updates', async () => {
    // Mock the prisma.page.updateMany to simulate optimistic locking rejection
    prisma.page.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    
    await expect(repo.updateWithLock('page-1', 'tenant-1', 1, {}))
      .rejects.toThrow('OptimisticLockException: Page was modified by another transaction');
  });

  it('should enforce soft deletes via findBySlug', async () => {
    prisma.page.findFirst = jest.fn();
    await repo.findBySlug('tenant-1', 'slug-1');

    expect(prisma.page.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', slug: 'slug-1', deletedAt: null }
    });
  });
});
