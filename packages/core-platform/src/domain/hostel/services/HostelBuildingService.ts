import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';

@Injectable()
export class HostelBuildingService {
  constructor(private readonly prisma: PrismaService) {}

  // Methods will go here in Checkpoint 2
}
