import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';

export interface CreateRouteDto {
  tenantId: string;
  vehicleId: string;
  routeName: string;
  stops: any; // Using Json representation
}

@Injectable()
export class RouteService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoute(data: CreateRouteDto) {
    const vehicle = await this.prisma.transportVehicle.findUnique({
      where: { id: data.vehicleId },
    });
    if (!vehicle || vehicle.tenantId !== data.tenantId) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.transportRoute.create({
      data: {
        vehicleId: data.vehicleId,
        routeName: data.routeName,
        stops: data.stops,
      },
    });
  }

  async getRoute(tenantId: string, routeId: string) {
    const route = await this.prisma.transportRoute.findUnique({
      where: { id: routeId },
      include: { vehicle: true, allocations: true },
    });
    // Check isolation through vehicle
    if (!route || route.vehicle.tenantId !== tenantId) {
      throw new NotFoundException('Route not found');
    }
    return route;
  }

  async listRoutes(tenantId: string) {
    return this.prisma.transportRoute.findMany({
      where: { vehicle: { tenantId } },
      include: { vehicle: true },
    });
  }
}
