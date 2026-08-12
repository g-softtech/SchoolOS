import { createHash } from 'crypto';

export interface FileDocument {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface DocumentMetadata {
  objectKey: string;
  checksum: string;
  uploadedBy: string;
  uploadedAt: Date;
  mimeType: string;
}

export interface StorageProvider {
  upload(key: string, buffer: Buffer): Promise<void>;
  generateSignedUrl(key: string, expiresInMs: number): Promise<string>;
}

export interface AuditService {
  logAction(tenantId: string, actorId: string, action: string, metadata: any): Promise<void>;
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class AdmissionsDocumentService {
  constructor(
    private readonly storage: StorageProvider,
    private readonly audit: AuditService,
  ) {}

  async uploadDocument(
    tenantId: string,
    applicationId: string,
    userId: string,
    file: FileDocument,
    docType: string // e.g., 'birth-certificate'
  ): Promise<DocumentMetadata> {
    // 1. Virus scanning hook (mock)
    await this.scanForViruses(file.buffer);

    // 2. SHA-256 Checksum
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    // 3. Immutable Object Key
    const objectKey = `${tenantId}/admissions/${applicationId}/${docType}-${checksum}.pdf`;

    // 4. Upload to Storage
    await this.storage.upload(objectKey, file.buffer);

    const metadata: DocumentMetadata = {
      objectKey,
      checksum,
      uploadedBy: userId,
      uploadedAt: new Date(),
      mimeType: file.mimetype,
    };

    // 5. Audit Trail
    await this.audit.logAction(tenantId, userId, 'UPLOAD_DOCUMENT', { applicationId, docType, checksum });

    return metadata;
  }

  async getSignedDownloadUrl(
    tenantId: string,
    userId: string,
    objectKey: string
  ): Promise<string> {
    // 1. Audit Trail for Download
    await this.audit.logAction(tenantId, userId, 'DOWNLOAD_DOCUMENT', { objectKey });

    // 2. Generate Signed URL
    const signedUrl = await this.storage.generateSignedUrl(objectKey, 1000 * 60 * 15); // 15 mins
    return signedUrl;
  }

  private async scanForViruses(buffer: Buffer): Promise<void> {
    // Simulated scan
    if (buffer.length === 0) throw new Error('File is empty, potentially malicious or corrupted');
  }
}
