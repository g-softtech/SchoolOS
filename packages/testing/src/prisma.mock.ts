import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;
export const mockPrismaClient = mockDeep<PrismaClient>();

export function createPrismaProvider(prismaServiceClass: any) {
  return {
    provide: prismaServiceClass,
    useValue: mockPrismaClient
  };
}
