import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';

@Injectable()
export class HostelAllocationService {
  constructor(private readonly prisma: PrismaService) {}

  // Methods will go here in Checkpoint 2
}
