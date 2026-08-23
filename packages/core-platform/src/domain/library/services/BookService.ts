import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '../../../../prisma/generated/client';

export interface CreateBookDto {
  tenantId: string;
  isbn?: string;
  title: string;
  author: string;
  copiesAvailable: number;
}

@Injectable()
export class BookService {
  constructor(private readonly prisma: PrismaClient) {}

  async createBook(data: CreateBookDto) {
    return this.prisma.libraryBook.create({ data });
  }

  async getBook(tenantId: string, bookId: string) {
    const book = await this.prisma.libraryBook.findUnique({
      where: { id: bookId, tenantId },
    });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async listBooks(tenantId: string, query?: { search?: string, skip?: number, take?: number }) {
    return this.prisma.libraryBook.findMany({
      where: {
        tenantId,
        ...(query?.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
      },
      skip: query?.skip ?? 0,
      take: query?.take ?? 20,
      orderBy: { title: 'asc' },
    });
  }
}
