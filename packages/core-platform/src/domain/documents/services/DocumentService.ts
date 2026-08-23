import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../providers/prisma.service';
import { PlatformEventBus } from '../../../providers/platform-event-bus';

export interface CreateDocumentDto {
  tenantId: string;
  ownerType: string;
  ownerId: string;
  type: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  description?: string;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: PlatformEventBus,
  ) {}

  async createDocument(data: CreateDocumentDto) {
    const doc = await this.prisma.document.create({
      data: {
        tenantId: data.tenantId,
        ownerType: data.ownerType,
        ownerId: data.ownerId,
        type: data.type,
        name: data.name,
        url: data.url,
        mimeType: data.mimeType,
        size: data.size,
        description: data.description,
      },
    });

    this.eventBus.publish('Document.Created', {
      tenantId: data.tenantId,
      documentId: doc.id,
      ownerType: data.ownerType,
      ownerId: data.ownerId,
    });

    return doc;
  }

  async listDocuments(tenantId: string, ownerType: string, ownerId: string) {
    return this.prisma.document.findMany({
      where: {
        tenantId,
        ownerType,
        ownerId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDocument(tenantId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    this.eventBus.publish('Document.Deleted', {
      tenantId,
      documentId,
    });

    return updated;
  }
}
