import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storagePath = path.resolve(process.cwd(), 'uploads');

  constructor() {
    this.initStorage();
  }

  private async initStorage() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (err) {
      this.logger.error('Failed to create storage directory', err);
    }
  }

  /**
   * Universal upload method.
   * Can be swapped later to AWS S3, Cloudinary, etc., without changing consuming code.
   */
  async uploadFile(tenantId: string, module: string, file: any): Promise<string> {
    const uniqueFileName = `${Date.now()}-${file.originalname}`;
    const tenantModulePath = path.join(this.storagePath, tenantId, module);
    
    await fs.mkdir(tenantModulePath, { recursive: true });

    const filePath = path.join(tenantModulePath, uniqueFileName);
    
    // Abstracted saving logic (assuming 'file' has buffer and originalname - typical of Multer)
    await fs.writeFile(filePath, file.buffer);

    // Return the URL/Path
    // In production, this would be the S3 URL
    return `/uploads/${tenantId}/${module}/${uniqueFileName}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Basic local deletion logic
    const relativePath = fileUrl.replace('/uploads/', '');
    const absolutePath = path.join(this.storagePath, relativePath);
    
    try {
      await fs.unlink(absolutePath);
    } catch (err) {
      this.logger.error(`Failed to delete file: ${absolutePath}`, err);
    }
  }
}
