import { Injectable } from '@nestjs/common';
import { StudentRepository } from '../repositories/student.repository';


@Injectable()
export class StudentSearchService {
  constructor(private readonly studentRepo: StudentRepository) {}

  async search(tenantId: string, query: { q?: string; status?: any; limit?: number; cursor?: string }) {
    const where: any = {};
    
    if (query.status) {
      where.membership = { state: query.status };
    }

    if (query.q) {
      where.OR = [
        { admissionNumber: { contains: query.q, mode: 'insensitive' } },
        { membership: { profile: { firstName: { contains: query.q, mode: 'insensitive' } } } },
        { membership: { profile: { lastName: { contains: query.q, mode: 'insensitive' } } } }
      ];
    }

    const students = await this.studentRepo.findManyWithPagination(tenantId, {
      cursor: query.cursor,
      limit: query.limit,
      where
    });

    return {
      data: students,
      nextCursor: students.length === query.limit ? students[students.length - 1].id : null
    };
  }
}
