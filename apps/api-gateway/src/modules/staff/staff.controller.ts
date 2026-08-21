import { Controller, Get, Post, Patch, Body, Param, Request, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { CreateDepartmentDto, HireStaffDto, UpdateEmploymentDto } from './dto/staff.dto';

@Controller('api/v1/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // ─── Departments ────────────────────────────────────────────────────
  @Post('departments')
  @RequirePermission('staff.manage')
  createDepartment(@Request() req, @Body() body: CreateDepartmentDto) {
    return this.staffService.createDepartment(req.user.tenantId, body);
  }

  @Get('departments')
  @RequirePermission('staff.read')
  listDepartments(@Request() req) {
    return this.staffService.listDepartments(req.user.tenantId);
  }

  // ─── Staff & Employment ─────────────────────────────────────────────
  @Post()
  @RequirePermission('staff.manage')
  hireStaff(@Request() req, @Body() body: HireStaffDto) {
    return this.staffService.hireStaff(req.user.tenantId, body);
  }

  @Get()
  @RequirePermission('staff.read')
  getStaffList(@Request() req) {
    return this.staffService.getStaffList(req.user.tenantId);
  }

  @Get('eligible-memberships')
  @RequirePermission('staff.manage')
  getEligibleMemberships(@Request() req) {
    return this.staffService.getEligibleMemberships(req.user.tenantId);
  }

  @Get(':staffId')
  @RequirePermission('staff.read')
  getStaffById(@Request() req, @Param('staffId') staffId: string) {
    return this.staffService.getStaffById(req.user.tenantId, staffId);
  }

  @Patch(':staffId/employment/status')
  @RequirePermission('staff.manage')
  updateEmploymentStatus(
    @Request() req,
    @Param('staffId') staffId: string,
    @Body() body: UpdateEmploymentDto,
  ) {
    return this.staffService.updateEmploymentStatus(req.user.tenantId, staffId, body);
  }
}
