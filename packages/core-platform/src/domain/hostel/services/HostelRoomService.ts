import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';

@Injectable()
export class HostelRoomService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(tenantId: string, hostelId: string, data: { roomNumber: string; capacity: number; type?: string }) {
    await this.validateHostel(tenantId, hostelId);
    return this.prisma.hostelRoom.create({
      data: {
        tenantId,
        hostelId,
        ...data,
      },
    });
  }

  async getRooms(tenantId: string, hostelId: string) {
    await this.validateHostel(tenantId, hostelId);
    return this.prisma.hostelRoom.findMany({
      where: { tenantId, hostelId },
      include: {
        _count: { select: { allocations: { where: { status: 'ACTIVE' } } } }
      }
    });
  }

  async getRoomById(tenantId: string, id: string) {
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { allocations: { where: { status: 'ACTIVE' } } } }
      }
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async updateRoom(tenantId: string, id: string, data: { roomNumber?: string; capacity?: number; type?: string; status?: string }) {
    const room = await this.getRoomById(tenantId, id); // validates tenant isolation
    
    // If reducing capacity, ensure we don't violate active allocations
    if (data.capacity !== undefined && data.capacity < room._count.allocations) {
      throw new BadRequestException('Cannot reduce capacity below current active allocations');
    }

    return this.prisma.hostelRoom.update({
      where: { id },
      data,
    });
  }

  async deleteRoom(tenantId: string, id: string) {
    const room = await this.getRoomById(tenantId, id);
    if (room._count.allocations > 0) {
      throw new BadRequestException('Cannot delete room with active allocations');
    }
    return this.prisma.hostelRoom.delete({
      where: { id },
    });
  }

  private async validateHostel(tenantId: string, hostelId: string) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id: hostelId, tenantId },
    });
    if (!hostel) {
      throw new NotFoundException('Hostel not found');
    }
  }
}
