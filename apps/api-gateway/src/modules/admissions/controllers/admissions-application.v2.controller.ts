import { Controller, Post, Body, Req } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SubmitApplicationCommand } from '../application/commands/application.commands';

@Controller({
  path: 'admissions/applications',
  version: '2'
})
export class AdmissionsApplicationV2Controller {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async submitApplication(@Body() body: any, @Req() req: any) {
    // V2 maps modern client fields to the exact same shared Domain logic (SubmitApplicationCommand)
    // demonstrating that business logic is fully decoupled from API representations.
    const tenantId = req.headers['x-tenant-id'];
    const actorId = req.user.id;
    
    // In V2, the client sends 'programId' instead of 'campaignId', we map it dynamically:
    const internalCampaignId = `mapped-${body.programId}`;

    const command = new SubmitApplicationCommand(
      tenantId,
      internalCampaignId,
      actorId,
      body.expectedVersion || 0
    );

    await this.commandBus.execute(command);
    
    // V2 returns a structured HATEOAS response unlike V1
    return {
      status: 'success',
      data: {
        applicationId: 'app-xxx',
      },
      links: [
        { rel: 'self', href: '/v2/admissions/applications/app-xxx' },
        { rel: 'upload-documents', href: '/v2/admissions/applications/app-xxx/documents' }
      ]
    };
  }
}
