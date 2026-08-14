import { Injectable } from '@nestjs/common';

@Injectable()
export class StudentNumberService {
  async generateStudentNumber(tenantId: string): Promise<string> {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `STU-${timestamp}-${random}`;
  }
}

