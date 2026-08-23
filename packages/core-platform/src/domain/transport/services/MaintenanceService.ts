import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';

export interface CreateMaintenanceLogDto {
  tenantId: string;
  vehicleId: string;
  date: Date;
  description: string;
  cost?: number;
}

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async logMaintenance(data: CreateMaintenanceLogDto) {
    const vehicle = await this.prisma.transportVehicle.findUnique({
      where: { id: data.vehicleId },
    });
    if (!vehicle || vehicle.tenantId !== data.tenantId) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.vehicleMaintenanceLog.create({
      data: {
        tenantId: data.tenantId,
        vehicleId: data.vehicleId,
        date: data.date,
        description: data.description,
        cost: data.cost,
      },
    });
  }

  async listMaintenanceLogs(tenantId: string, vehicleId?: string) {
    const where: any = { tenantId };
    if (vehicleId) where.vehicleId = vehicleId;

    return this.prisma.vehicleMaintenanceLog.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { vehicle: true },
    });
  }
}
