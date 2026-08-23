import { Controller, Post, Body, Param, Req } from '@nestjs/common';
import { CirculationService } from '@saas/core-platform';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import type { Request } from 'express';

@Controller('v1/library/circulation')
export class CirculationController {
  constructor(private readonly circulationService: CirculationService) {}

  @Post('issue')
  @RequirePermission('library.manage_circulation')
  async issueBook(@Req() req: Request, @Body() body: { bookId: string; studentId: string; dueDate: string }) {
    return this.circulationService.issueBook({
      tenantId: (req.user as any).tenantId,
      bookId: body.bookId,
      studentId: body.studentId,
      dueDate: new Date(body.dueDate),
    });
  }

  @Post('return/:borrowingId')
  @RequirePermission('library.manage_circulation')
  async returnBook(@Req() req: Request, @Param('borrowingId') borrowingId: string) {
    return this.circulationService.returnBook((req.user as any).tenantId, borrowingId);
  }

  @Post('overdue-check')
  @RequirePermission('library.manage_circulation')
  async runOverdueCheck(@Req() req: Request) {
    // Usually triggered by a cron job, but we expose it for manual/testing triggers
    const processed = await this.circulationService.runOverdueCheck((req.user as any).tenantId);
    return { status: 'success', processedOverdues: processed };
  }
}
