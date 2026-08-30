import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';

@Injectable()
export class HostelBuildingService {
  constructor(private readonly prisma: PrismaService) {}

  async createBuilding(tenantId: string, data: { name: string; capacity: number; gender?: string; wardenId?: string }) {
    if (data.wardenId) {
      await this.validateWarden(tenantId, data.wardenId);
    }
    return this.prisma.hostel.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async getBuildings(tenantId: string) {
    return this.prisma.hostel.findMany({
      where: { tenantId },
      include: {
        warden: true,
        rooms: {
          select: {
            id: true,
            capacity: true,
            _count: {
              select: { allocations: { where: { status: 'ACTIVE' } } }
            }
          }
        },
      },
    });
  }

  async getBuildingById(tenantId: string, id: string) {
    const building = await this.prisma.hostel.findFirst({
      where: { id, tenantId },
      include: { warden: true, rooms: true },
    });
    if (!building) throw new NotFoundException('Hostel building not found');
    return building;
  }

  async updateBuilding(tenantId: string, id: string, data: { name?: string; capacity?: number; gender?: string; status?: string }) {
    await this.getBuildingById(tenantId, id); // validates tenant isolation
    return this.prisma.hostel.update({
      where: { id },
      data,
    });
  }

  async assignWarden(tenantId: string, id: string, wardenId: string | null) {
    await this.getBuildingById(tenantId, id);
    if (wardenId) {
      await this.validateWarden(tenantId, wardenId);
    }
    return this.prisma.hostel.update({
      where: { id },
      data: { wardenId },
    });
  }

  private async validateWarden(tenantId: string, wardenId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: wardenId, tenantId },
    });
    if (!staff) {
      throw new BadRequestException('Warden not found or belongs to another tenant');
    }
  }
}
