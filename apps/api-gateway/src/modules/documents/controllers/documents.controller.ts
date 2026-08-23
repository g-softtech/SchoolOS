import { Controller, Post, Get, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from '@saas/core-platform';
import { StorageService } from '../../../platform-services/storage/storage.service';
import { RequirePermission } from '../../identity/security/require-permission.decorator';

@Controller('v1/documents')
export class DocumentsController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly storageService: StorageService
  ) {}

  @Post(':ownerType/:ownerId')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission('documents.manage')
  async uploadDocument(
    @Req() req: any,
    @Param('ownerType') ownerType: string,
    @Param('ownerId') ownerId: string,
    @UploadedFile() file: any
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File is too large');
    }

    // Sanitize filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    file.originalname = safeName;

    const tenantId = req.tenant.id;
    // Save to local storage using the existing Platform Storage abstraction
    const fileUrl = await this.storageService.uploadFile(tenantId, `docs_${ownerType.toLowerCase()}`, file);

    return this.documentService.createDocument({
      tenantId,
      ownerType: ownerType.toUpperCase(),
      ownerId,
      type: 'GENERAL',
      name: file.originalname,
      url: fileUrl,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  @Get(':ownerType/:ownerId')
  @RequirePermission('documents.view')
  async listDocuments(
    @Req() req: any,
    @Param('ownerType') ownerType: string,
    @Param('ownerId') ownerId: string
  ) {
    return this.documentService.listDocuments(req.tenant.id, ownerType.toUpperCase(), ownerId);
  }

  @Delete(':id')
  @RequirePermission('documents.manage')
  async deleteDocument(@Req() req: any, @Param('id') documentId: string) {
    return this.documentService.deleteDocument(req.tenant.id, documentId);
  }
}
