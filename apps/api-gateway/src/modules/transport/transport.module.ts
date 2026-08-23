import { Module } from '@nestjs/common';
import { VehiclesController } from './controllers/vehicles.controller';
import { RoutesController } from './controllers/routes.controller';
import { MaintenanceController } from './controllers/maintenance.controller';
import { AllocationsController } from './controllers/allocations.controller';
import {
  VehicleService,
  RouteService,
  MaintenanceService,
  AllocationService,
} from '@saas/core-platform';

@Module({
  controllers: [
    VehiclesController,
    RoutesController,
    MaintenanceController,
    AllocationsController,
  ],
  providers: [
    VehicleService,
    RouteService,
    MaintenanceService,
    AllocationService,
  ],
})
export class TransportModule {}
