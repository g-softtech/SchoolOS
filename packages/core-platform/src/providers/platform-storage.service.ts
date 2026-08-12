import { Injectable } from '@nestjs/common';

@Injectable()
export class PlatformStorageService {
  async upload(bucket: string, key: string, stream: any): Promise<any> {
    // Stub
  }
}
