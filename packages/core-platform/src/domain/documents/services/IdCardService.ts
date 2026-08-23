import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';
import { PlatformEventBus } from '../../../providers/platform-event-bus';
import * as crypto from 'crypto';

export interface IssueIdCardDto {
  tenantId: string;
  ownerType: string;
  ownerId: string;
  expiryDate?: Date;
}

@Injectable()
export class IdCardService {
  private readonly logger = new Logger(IdCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: PlatformEventBus,
  ) {}

  async issueIdCard(data: IssueIdCardDto) {
    // Revoke any existing active card for this owner
    const existingActiveCard = await this.prisma.idCard.findFirst({
      where: { tenantId: data.tenantId, ownerType: data.ownerType, ownerId: data.ownerId, status: 'ACTIVE' }
    });
    
    if (existingActiveCard) {
      await this.revokeIdCard(data.tenantId, existingActiveCard.id, 'REVOKED');
    }

    // Generate an opaque verification token (crypto hash)
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Default expiry: 1 year from now if not provided
    const expiryDate = data.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const idCard = await this.prisma.idCard.create({
      data: {
        tenantId: data.tenantId,
        ownerType: data.ownerType,
        ownerId: data.ownerId,
        expiryDate,
        status: 'ACTIVE',
        verificationToken,
      },
    });

    this.eventBus.publish('IdCard.Issued', {
      tenantId: data.tenantId,
      idCardId: idCard.id,
      ownerType: data.ownerType,
      ownerId: data.ownerId,
    });

    return idCard;
  }

  async revokeIdCard(tenantId: string, idCardId: string, reason: 'REVOKED' | 'LOST' = 'REVOKED') {
    const idCard = await this.prisma.idCard.findFirst({
      where: { id: idCardId, tenantId },
    });

    if (!idCard) {
      throw new NotFoundException(`ID Card ${idCardId} not found`);
    }

    const updated = await this.prisma.idCard.update({
      where: { id: idCardId },
      data: { status: reason },
    });

    this.eventBus.publish('IdCard.Revoked', {
      tenantId,
      idCardId,
      reason,
    });

    return updated;
  }

  async getActiveIdCard(tenantId: string, ownerType: string, ownerId: string) {
    return this.prisma.idCard.findFirst({
      where: {
        tenantId,
        ownerType,
        ownerId,
        status: 'ACTIVE',
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  async verifyIdCard(token: string) {
    const idCard = await this.prisma.idCard.findUnique({
      where: { verificationToken: token },
    });

    if (!idCard) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    if (idCard.status !== 'ACTIVE') {
      return { valid: false, reason: idCard.status, idCard };
    }

    if (idCard.expiryDate && idCard.expiryDate < new Date()) {
      return { valid: false, reason: 'EXPIRED', idCard };
    }

    // Resolve owner information safely for public view
    let ownerDetails = null;
    let schoolDetails = null;

    if (idCard.ownerType === 'STUDENT') {
      const student = await this.prisma.student.findFirst({
        where: { id: idCard.ownerId },
        include: {
          membership: {
            include: { profile: true }
          },
          currentArm: {
            include: { class: true }
          }
        }
      });
      if (student) {
        ownerDetails = {
          name: `${student.membership.profile?.firstName} ${student.membership.profile?.lastName}`,
          photoUrl: student.membership.profile?.avatarUrl,
          idNumber: student.admissionNumber,
          role: 'Student',
          departmentOrClass: student.currentArm ? `${student.currentArm.class.name} ${student.currentArm.name}` : null
        };
      }
    } else if (idCard.ownerType === 'STAFF') {
      const staff = await this.prisma.staff.findFirst({
        where: { id: idCard.ownerId },
        include: {
          membership: {
            include: { profile: true }
          },
          department: true
        }
      });
      if (staff) {
        ownerDetails = {
          name: `${staff.membership.profile?.firstName} ${staff.membership.profile?.lastName}`,
          photoUrl: staff.membership.profile?.avatarUrl,
          idNumber: staff.staffIdNumber,
          role: 'Staff',
          departmentOrClass: staff.department?.name
        };
      }
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: idCard.tenantId }
    });
    
    if (tenant) {
      schoolDetails = {
        name: tenant.name
      };
    }

    return {
      valid: true,
      idCard: {
        id: idCard.id,
        issueDate: idCard.issueDate,
        expiryDate: idCard.expiryDate,
        owner: ownerDetails,
        school: schoolDetails
      }
    };
  }
}
