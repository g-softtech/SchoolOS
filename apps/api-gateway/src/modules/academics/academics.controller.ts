import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AcademicsService } from './academics.service';

@Controller('academics')
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Post('sessions')
  async createSession(@Request() req, @Body() body: any) {
    return this.academicsService.createSession(
      req.user.tenantId,
      body.name,
      new Date(body.startDate),
      new Date(body.endDate),
    );
  }

  @Post('sessions/:id/activate')
  async activateSession(@Request() req, @Param('id') id: string) {
    return this.academicsService.activateSession(req.user.tenantId, id);
  }
}
