import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';
import { Prisma } from '../../../../prisma/generated/client';

@Injectable()
export class HostelAllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async allocateStudent(tenantId: string, data: { roomId: string; studentId: string; academicYearId?: string }) {
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Verify Student Isolation
      const student = await tx.student.findFirst({
        where: { id: data.studentId, tenantId },
      });
      if (!student) {
        throw new NotFoundException('Student not found or belongs to another tenant');
      }

      // 2. Verify Room Isolation & Capacity
      const room = await tx.hostelRoom.findFirst({
        where: { id: data.roomId, tenantId },
        include: { _count: { select: { allocations: { where: { status: 'ACTIVE' } } } } }
      });
      if (!room) {
        throw new NotFoundException('Room not found or belongs to another tenant');
      }

      // 3. Prevent duplicate active allocations
      const existingAllocation = await tx.bedAllocation.findFirst({
        where: { studentId: data.studentId, status: 'ACTIVE', tenantId },
      });
      if (existingAllocation) {
        throw new BadRequestException('Student already has an active hostel allocation');
      }

      // 4. Enforce capacity safely
      // In high concurrency, doing a findFirst and then create could race.
      // But because Prisma transactions in PostgreSQL use Read Committed isolation by default,
      // it might still race if two transactions read concurrently.
      // We can use a locking query or rely on unique constraints, but Prisma doesn't natively support pessimistic locks without raw queries.
      // We'll use raw query for locking the room row specifically to ensure concurrency safety.
      const schemaName = process.env.DATABASE_URL?.match(/schema=([^&]+)/)?.[1] || 'public';
      const schemaRaw = Prisma.raw(`"${schemaName}".`);
      await tx.$executeRaw`SELECT id FROM ${schemaRaw}"ent_hostel_rooms" WHERE id = ${data.roomId} FOR UPDATE`;
      
      // Re-read active allocation count after obtaining the row lock
      const activeCount = await tx.bedAllocation.count({
        where: { roomId: data.roomId, status: 'ACTIVE', tenantId }
      });

      if (activeCount >= room.capacity) {
        throw new BadRequestException('Room capacity exceeded');
      }

      // 5. Create allocation
      return tx.bedAllocation.create({
        data: {
          tenantId,
          roomId: data.roomId,
          studentId: data.studentId,
          academicYearId: data.academicYearId || null,
          status: 'ACTIVE',
        },
      });
    });
  }

  async vacateStudent(tenantId: string, allocationId: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const allocation = await tx.bedAllocation.findFirst({
        where: { id: allocationId, tenantId },
      });

      if (!allocation) {
        throw new NotFoundException('Allocation not found');
      }

      if (allocation.status === 'VACATED') {
        throw new BadRequestException('Allocation is already vacated');
      }

      // Lock row just in case
      const schemaName = process.env.DATABASE_URL?.match(/schema=([^&]+)/)?.[1] || 'public';
      const schemaRaw = Prisma.raw(`"${schemaName}".`);
      await tx.$executeRaw`SELECT id FROM ${schemaRaw}"ent_bed_allocations" WHERE id = ${allocationId} FOR UPDATE`;

      return tx.bedAllocation.update({
        where: { id: allocationId },
        data: {
          status: 'VACATED',
          expiresAt: new Date(),
        },
      });
    });
  }

  async getAllocations(tenantId: string, roomId?: string) {
    return this.prisma.bedAllocation.findMany({
      where: {
        tenantId,
        ...(roomId ? { roomId } : {})
      },
      include: {
        student: true,
        room: true,
      }
    });
  }
}
