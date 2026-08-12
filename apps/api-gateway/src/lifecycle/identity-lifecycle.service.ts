import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LifecycleException } from '@saas/core-platform';
import { IdentityState } from '@saas/core-platform';
import { randomUUID } from 'crypto';

export interface TransitionRequest {
  identityId: string;
  actorId: string;
  reason?: string;
  correlationId?: string;
}

@Injectable()
export class IdentityLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Finite State Machine definitions
   */
  private readonly validTransitions: Record<IdentityState, IdentityState[]> = {
    PROVISIONED: ['PENDING_ACTIVATION'],
    PENDING_ACTIVATION: ['ACTIVE', 'OFFBOARDED'],
    ACTIVE: ['SUSPENDED', 'OFFBOARDED'],
    SUSPENDED: ['ACTIVE', 'OFFBOARDED'],
    OFFBOARDED: ['ARCHIVED'],
    ARCHIVED: ['ACTIVE'] // Reinstatement goes to ACTIVE
  };

  private isValidTransition(from: IdentityState, to: IdentityState): boolean {
    const fsm: Record<string, string[]> = {
      PROVISIONED: ['PENDING_ACTIVATION', 'OFFBOARDED'],
      PENDING_ACTIVATION: ['ACTIVE', 'OFFBOARDED'],
      ACTIVE: ['SUSPENDED', 'OFFBOARDED'],
      SUSPENDED: ['ACTIVE', 'OFFBOARDED'],
      OFFBOARDED: ['ARCHIVED'],
      ARCHIVED: ['ACTIVE'], // Reinstatement
    };
    return fsm[from]?.includes(to) ?? false;
  }

  async provision(tenantId: string, userId: string, roleId: string, actorId: string): Promise<any> {
    const correlationId = randomUUID();
    
    // Provisioning is the initial state entry
    const membership = await this.prisma.tenantMembership.create({
      data: {
        tenantId,
        userId,
        roleId,
        state: 'PROVISIONED',
        lifecycleTransitions: {
          create: {
            fromState: 'NONE',
            toState: 'PROVISIONED',
            actorId,
            reason: 'Initial Provisioning',
            correlationId
          }
        }
      }
    });

    this.eventEmitter.emit('IDENTITY_CREATED', {
      identityId: membership.id,
      tenantId,
      userId,
      roleId,
      correlationId
    });

    return membership;
  }

  async transitionState(req: TransitionRequest, newState: IdentityState): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.tenantMembership.findUnique({
        where: { id: req.identityId }
      });

      if (!membership) {
        throw new LifecycleException('IDENTITY_NOT_FOUND', 'Identity not found');
      }

      if (membership.state === newState) {
        // Idempotency: Ignore if already in the target state
        return membership;
      }

      if (!this.isValidTransition(membership.state as IdentityState, newState)) {
        throw new LifecycleException(
          'ILLEGAL_TRANSITION',
          `Cannot transition identity from ${membership.state} to ${newState}`
        );
      }

      const txCorrelationId = req.correlationId || randomUUID();

      const updated = await tx.tenantMembership.update({
        where: { id: req.identityId },
        data: {
          state: newState,
          lifecycleTransitions: {
            create: {
              fromState: membership.state as IdentityState,
              toState: newState,
              actorId: req.actorId,
              reason: req.reason,
              correlationId: txCorrelationId
            }
          }
        }
      });

      // Side effects
      if (newState === 'SUSPENDED' || newState === 'OFFBOARDED' || newState === 'ARCHIVED') {
        // Revoke all sessions for this identity
        await tx.session.updateMany({
          where: { userId: membership.userId },
          data: { isRevoked: true }
        });
      }

      this.eventEmitter.emit('IDENTITY_STATE_CHANGED', {
        identityId: membership.id,
        fromState: membership.state,
        toState: newState,
        correlationId: txCorrelationId
      });

      return updated;
    });
  }

  async updateRole(req: TransitionRequest, newRoleId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.tenantMembership.findUnique({
        where: { id: req.identityId }
      });

      if (!membership) {
        throw new LifecycleException('IDENTITY_NOT_FOUND', 'Identity not found');
      }

      if (membership.state === 'ARCHIVED' || membership.state === 'OFFBOARDED') {
        throw new LifecycleException('ILLEGAL_MUTATION', 'Cannot change role of an archived or offboarded identity');
      }

      const updated = await tx.tenantMembership.update({
        where: { id: req.identityId },
        data: { roleId: newRoleId }
      });

      this.eventEmitter.emit('IDENTITY_ROLE_CHANGED', {
        identityId: membership.id,
        oldRoleId: membership.roleId,
        newRoleId,
        correlationId: req.correlationId || randomUUID()
      });

      return updated;
    });
  }

  async transferDepartment(req: TransitionRequest, newDepartmentId: string): Promise<any> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { id: req.identityId }
    });

    if (membership?.state === 'ARCHIVED' || membership?.state === 'OFFBOARDED') {
      throw new LifecycleException('ILLEGAL_MUTATION', 'Cannot transfer an archived or offboarded identity');
    }

    // Logic to update department...
    this.eventEmitter.emit('IDENTITY_TRANSFERRED', {
      identityId: req.identityId,
      newDepartmentId,
      correlationId: req.correlationId || randomUUID()
    });

    return membership;
  }
}
