import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public Edge Delivery')
@Controller('api/v1/public/website/resolve')
export class EdgeDeliveryController {
  
  // NOTE: This controller specifically does NOT use PoliciesGuard or AuthGuard.
  // It relies on Redis edge-caching for `<50ms` latency and falls back to a query.

  @Get()
  @ApiOperation({ summary: 'Resolve domain/path to a public JSON page payload' })
  async resolvePath(@Query('domain') domain: string, @Query('path') path: string) {
    // 1. Validate custom domain mappings (bypasses standard tenant resolution)
    // 2. Query Page where status=PUBLISHED
    // 3. Omit metadata (deletedBy, version)
    return {
      resolvedDomain: domain,
      path,
      contentBlocks: [], // Simulated response
      seoMetadata: {}
    };
  }
}
