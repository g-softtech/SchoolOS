import { Controller, Post, Patch, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PageService } from '../services/page.service';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import { PoliciesGuard } from '../../identity/security/policies.guard';
import { AuthGuard } from '@nestjs/passport';
import { CreatePageDto, UpdatePageDto } from '../dto/website.dto';

@ApiTags('Website Pages')
@Controller('api/v1/website/pages')
@UseGuards(AuthGuard('jwt'), PoliciesGuard)
@ApiBearerAuth()
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Post()
  @RequirePermission('page:create')
  @ApiOperation({ summary: 'Create a new draft page' })
  async createPage(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreatePageDto
  ) {
    return this.pageService.createPage(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('page:update')
  @ApiOperation({ summary: 'Update page content blocks (requires optimistic lock version)' })
  async updatePage(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdatePageDto
  ) {
    return this.pageService.updatePage(tenantId, id, dto.version, {
      contentBlocks: dto.contentBlocks,
      seoMetadata: dto.seoMetadata
    });
  }

  @Post(':id/publish')
  @RequirePermission('page:publish')
  @ApiOperation({ summary: 'Publish a draft page to the edge CDN' })
  async publishPage(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string
  ) {
    return this.pageService.publishPage(tenantId, id);
  }

  @Post(':id/archive')
  @RequirePermission('page:archive')
  @ApiOperation({ summary: 'Archive a published page' })
  async archivePage(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string
  ) {
    return this.pageService.archivePage(tenantId, id);
  }
}
