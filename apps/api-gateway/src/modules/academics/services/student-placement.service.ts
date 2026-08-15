import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, PlatformEventBus, Student } from '@saas/core-platform';
import { PlaceStudentDto } from '../dto/student-placement.dto';

@Injectable()
export class StudentPlacementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: PlatformEventBus
  ) {}

  async placeStudentInArm(tenantId: string, studentId: string, dto: PlaceStudentDto): Promise<Student> {
    // 1. Verify Student exists and belongs to tenant
    const student = await this.prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.tenantId !== tenantId) {
      throw new NotFoundException('Student not found');
    }

    // 2. Verify Arm exists and belongs to tenant
    const arm = await this.prisma.arm.findUnique({
      where: { id: dto.armId },
      include: { class: true }
    });

    if (!arm || arm.tenantId !== tenantId) {
      throw new NotFoundException('Arm not found');
    }

    // 3. Update the student record safely
    const updatedStudent = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        currentArmId: dto.armId
      }
    });

    // 4. Publish Domain Event
    await this.eventBus.publish('Student.PlacedInArm', {
      tenantId,
      studentId: student.id,
      armId: arm.id,
      classId: arm.classId,
      previousArmId: student.currentArmId
    });

    return updatedStudent;
  }
}
