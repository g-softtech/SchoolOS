import { Controller, Get, Post, Patch, Body, Param, Request } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CredentialService } from './credential.service';

/**
 * StaffController handles routing only.
 * Zero business logic lives here — it delegates entirely to StaffService and CredentialService.
 */
@Controller('api/v1/staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly credentialService: CredentialService,
  ) {}

  // ─── Departments ────────────────────────────────────────────────────

  @Post('departments')
  createDepartment(@Request() req, @Body() body: { name: string; description?: string; parentId?: string }) {
    return this.staffService.createDepartment(req.user.tenantId, body.name, body.description, body.parentId);
  }

  @Get('departments')
  listDepartments(@Request() req) {
    return this.staffService.listDepartments(req.user.tenantId);
  }

  // ─── Positions ───────────────────────────────────────────────────────

  @Post('departments/:departmentId/positions')
  createPosition(
    @Request() req,
    @Param('departmentId') departmentId: string,
    @Body() body: { title: string; isTeachingRole?: boolean; description?: string },
  ) {
    return this.staffService.createPosition(
      req.user.tenantId,
      departmentId,
      body.title,
      body.isTeachingRole ?? false,
      body.description,
    );
  }

  // ─── Employees ───────────────────────────────────────────────────────

  @Post('employees')
  hireEmployee(@Request() req, @Body() body: any) {
    return this.staffService.hireEmployee(req.user.tenantId, {
      ...body,
      dateOfHire: new Date(body.dateOfHire),
    });
  }

  @Patch('employees/:employeeId/status')
  transitionStatus(
    @Request() req,
    @Param('employeeId') employeeId: string,
    @Body() body: { status: string; reason: string },
  ) {
    return this.staffService.transitionStatus(req.user.tenantId, employeeId, body.status, body.reason);
  }

  // ─── Credentials ─────────────────────────────────────────────────────

  @Post('employees/:employeeId/credentials')
  issueCredential(
    @Request() req,
    @Param('employeeId') employeeId: string,
    @Body() body: { type: string; expiresAt?: string },
  ) {
    return this.credentialService.issueCredential(
      req.user.tenantId,
      employeeId,
      body.type,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  @Post('employees/:employeeId/credentials/:credentialId/revoke')
  revokeCredential(
    @Request() req,
    @Param('employeeId') employeeId: string,
    @Param('credentialId') credentialId: string,
    @Body() body: { reason: string },
  ) {
    return this.credentialService.revokeCredential(req.user.tenantId, credentialId, body.reason);
  }
}
