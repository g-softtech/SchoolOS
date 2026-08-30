import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { HostelRoomService } from '@saas/core-platform';
import { CreateRoomDto, UpdateRoomDto } from '../dto/hostel.dto';
import { RequirePermission } from '../../../auth/decorators/auth.decorators';
import { AuditAction } from '../../../platform-services/audit/interceptors/audit-log/audit-log.interceptor';

@Controller('v1/hostels/:hostelId/rooms')
export class RoomsController {
  constructor(private readonly roomService: HostelRoomService) {}

  @Get()
  @RequirePermission('hostel.view')
  async getRooms(@Req() req: any, @Param('hostelId') hostelId: string) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.roomService.getRooms(tenantId, hostelId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('hostel.manage')
  @AuditAction('CREATE', 'HostelRoom')
  async createRoom(@Req() req: any, @Param('hostelId') hostelId: string, @Body() dto: CreateRoomDto) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.roomService.createRoom(tenantId, hostelId, dto);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('hostel.view')
  async getRoomById(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.roomService.getRoomById(tenantId, id);
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermission('hostel.manage')
  @AuditAction('UPDATE', 'HostelRoom')
  async updateRoom(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRoomDto) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.roomService.updateRoom(tenantId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('hostel.manage')
  @AuditAction('DELETE', 'HostelRoom')
  async deleteRoom(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const data = await this.roomService.deleteRoom(tenantId, id);
    return { success: true, data };
  }
}
