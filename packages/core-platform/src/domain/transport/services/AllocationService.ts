import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';

export interface CreateAllocationDto {
  tenantId: string;
  studentId: string;
  vehicleId: string;
  routeId: string;
  pickupPoint: string;
}

@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async createAllocation(data: CreateAllocationDto) {
    const student = await this.prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student || student.tenantId !== data.tenantId) {
      throw new NotFoundException('Student not found');
    }

    const vehicle = await this.prisma.transportVehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle || vehicle.tenantId !== data.tenantId) {
      throw new NotFoundException('Vehicle not found');
    }

    const route = await this.prisma.transportRoute.findUnique({ where: { id: data.routeId } });
    // route.vehicleId must match data.vehicleId implicitly through route relation but we enforce it just in case
    if (!route || route.vehicleId !== data.vehicleId) {
      throw new BadRequestException('Route does not belong to the selected vehicle');
    }

    return this.prisma.transportAllocation.create({
      data: {
        tenantId: data.tenantId,
        studentId: data.studentId,
        vehicleId: data.vehicleId,
        routeId: data.routeId,
        pickupPoint: data.pickupPoint,
      },
    });
  }

  async setAllocationStatus(tenantId: string, allocationId: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    const allocation = await this.prisma.transportAllocation.findUnique({ where: { id: allocationId } });
    if (!allocation || allocation.tenantId !== tenantId) {
      throw new NotFoundException('Allocation not found');
    }

    return this.prisma.transportAllocation.update({
      where: { id: allocationId },
      data: { status },
    });
  }

  async listAllocations(tenantId: string, vehicleId?: string, studentId?: string) {
    const where: any = { tenantId };
    if (vehicleId) where.vehicleId = vehicleId;
    if (studentId) where.studentId = studentId;

    return this.prisma.transportAllocation.findMany({
      where,
      include: { student: true, vehicle: true, route: true },
    });
  }
}
