import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';

export interface CreateVehicleDto {
  tenantId: string;
  plateNumber: string;
  capacity: number;
  driverId?: string;
}

export interface UpdateLocationDto {
  tenantId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async createVehicle(data: CreateVehicleDto) {
    if (data.driverId) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: data.driverId },
        include: {
          membership: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true }
                  }
                }
              }
            }
          }
        }
      });
      if (!staff || staff.tenantId !== data.tenantId) {
        throw new NotFoundException('Driver not found');
      }

      const hasDriverPermission = staff.membership?.role?.permissions?.some(
        rp => rp.permission.name === 'transport.drive'
      );
      if (!hasDriverPermission) {
        throw new BadRequestException('Selected staff member is not authorized to act as a driver');
      }
    }

    return this.prisma.transportVehicle.create({
      data: {
        tenantId: data.tenantId,
        plateNumber: data.plateNumber,
        capacity: data.capacity,
        driverId: data.driverId,
      },
    });
  }

  async getVehicle(tenantId: string, vehicleId: string) {
    const vehicle = await this.prisma.transportVehicle.findUnique({
      where: { id: vehicleId },
      include: { driver: true, routes: true, maintenance: true },
    });
    if (!vehicle || vehicle.tenantId !== tenantId) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  async listVehicles(tenantId: string) {
    return this.prisma.transportVehicle.findMany({
      where: { tenantId },
      include: { driver: true },
    });
  }

  async updateLocation(vehicleId: string, data: UpdateLocationDto) {
    if (data.lat < -90 || data.lat > 90) throw new BadRequestException('Invalid latitude');
    if (data.lng < -180 || data.lng > 180) throw new BadRequestException('Invalid longitude');
    if (!data.timestamp || isNaN(Date.parse(data.timestamp))) throw new BadRequestException('Invalid timestamp');

    const vehicle = await this.prisma.transportVehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || vehicle.tenantId !== data.tenantId) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.transportVehicle.update({
      where: { id: vehicleId },
      data: {
        lastLocation: {
          lat: data.lat,
          lng: data.lng,
          timestamp: data.timestamp,
        },
      },
    });
  }
}
