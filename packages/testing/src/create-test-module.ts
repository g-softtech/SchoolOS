import { Test, TestingModuleBuilder, ModuleMetadata } from '@nestjs/testing';
import { createPrismaProvider } from './prisma.mock';

export function createTestingModuleWithMocks(
  metadata: ModuleMetadata,
  prismaServiceToken?: any
): TestingModuleBuilder {
  const providers = metadata.providers || [];
  
  if (prismaServiceToken) {
    providers.push(createPrismaProvider(prismaServiceToken));
  }

  return Test.createTestingModule({
    ...metadata,
    providers
  });
}
