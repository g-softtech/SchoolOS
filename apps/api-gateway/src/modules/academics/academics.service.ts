import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@saas/core-platform';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AcademicsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createSession(tenantId: string, name: string, startDate: Date, endDate: Date) {
    const session = await this.prisma.academicSession.create({
      data: {
        tenantId,
        name,
        startDate,
        endDate,
      },
    });

    this.eventEmitter.emit('Academic.Session.Created', {
      tenantId,
      sessionId: session.id,
      name: session.name,
    });

    return session;
  }

  async activateSession(tenantId: string, sessionId: string) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundException('Session not found');
    }

    // Deactivate all others
    await this.prisma.academicSession.updateMany({
      where: { tenantId },
      data: { isActive: false },
    });

    const activeSession = await this.prisma.academicSession.update({
      where: { id: sessionId },
      data: { isActive: true },
    });

    this.eventEmitter.emit('Academic.Session.Activated', {
      tenantId,
      sessionId: activeSession.id,
    });

    return activeSession;
  }
}
