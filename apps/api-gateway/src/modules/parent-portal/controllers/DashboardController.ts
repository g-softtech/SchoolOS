import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { FamilyDashboardService } from '../services/FamilyDashboardService';
import { FamilyContextGuard } from '../auth/FamilyContext.guard';
import { GetFamilyContext } from '../auth/FamilyContext.decorator';
import { FamilyContext } from '../auth/FamilyContext';
import { FamilyDashboardView } from '../dto/ViewModels';
// Optional: Setup a BFF Cache interceptor here
// import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('api/parent/dashboard')
@UseGuards(FamilyContextGuard)
export class DashboardController {
  constructor(private readonly dashboardService: FamilyDashboardService) {}

  @Version('1')
  @Get()
  // @UseInterceptors(CacheInterceptor) // Cache for 30s
  async getDashboard(
    @GetFamilyContext() context: FamilyContext
  ): Promise<FamilyDashboardView> {
    // The FamilyContextGuard has already resolved the secure context.
    // We simply pass it down. The Service does all the heavy lifting.
    return await this.dashboardService.getDashboard(context);
  }
}
