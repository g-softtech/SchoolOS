import { Injectable } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { Student, Prisma } from '@saas/core-platform';

@Injectable()
export class StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.StudentCreateInput): Promise<Student> {
    return this.prisma.student.create({ data });
  }

  async findById(id: string, tenantId: string): Promise<any> {
    return this.prisma.student.findUnique({
      where: { id, tenantId },
      include: {
        membership: {
          include: { profile: true }
        },
        guardians: {
          include: { 
            guardian: {
              include: { membership: { include: { profile: true } } }
            }
          }
        }
      }
    });
  }

  async update(id: string, tenantId: string, data: Prisma.StudentUpdateInput): Promise<Student> {
    return this.prisma.student.update({
      where: { id, tenantId },
      data,
    });
  }

  async findManyWithPagination(
    tenantId: string,
    params: {
      cursor?: string;
      limit?: number;
      where?: Prisma.StudentWhereInput;
    }
  ): Promise<any[]> {
    const { cursor, limit = 50, where } = params;
    return this.prisma.student.findMany({
      where: { ...where, tenantId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { 
        membership: { include: { profile: true } }
      },
    });
  }

  async findByMembershipId(membershipId: string, tenantId: string): Promise<any> {
    return this.prisma.student.findUnique({
      where: { membershipId, tenantId },
      include: {
        membership: { include: { profile: true } }
      }
    });
  }
}

