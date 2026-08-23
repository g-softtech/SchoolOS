import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient, BorrowStatus, Prisma } from '../../../../prisma/generated/client';
import { FineService } from './FineService';
import { PlatformEventBus } from '../../../providers/platform-event-bus';

export interface IssueBookDto {
  tenantId: string;
  bookId: string;
  studentId: string;
  dueDate: Date;
}

@Injectable()
export class CirculationService {
  private readonly logger = new Logger(CirculationService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly fineService: FineService,
    private readonly eventBus: PlatformEventBus,
  ) {}

  async issueBook(data: IssueBookDto) {
    // We must ensure the book has available copies safely (concurrency-safe)
    // We use a transaction to safely decrement the copies available if > 0.
    
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify student exists and has no active overdue books
      const overdueBorrowing = await tx.bookBorrowing.findFirst({
        where: { book: { tenantId: data.tenantId }, studentId: data.studentId, status: 'OVERDUE' },
      });
      if (overdueBorrowing) {
        throw new BadRequestException('Student has overdue books. Cannot issue new books.');
      }

      // 2. Decrement available copies atomically. If this fails due to 0 copies, Prisma throws a RecordNotFound or we check beforehand with FOR UPDATE.
      // We will use an atomic update where copiesAvailable > 0.
      
      const updateResult = await tx.libraryBook.updateMany({
        where: {
          id: data.bookId,
          tenantId: data.tenantId,
          copiesAvailable: { gt: 0 },
        },
        data: {
          copiesAvailable: { decrement: 1 },
        }
      });

      if (updateResult.count === 0) {
        throw new BadRequestException('No copies available for this book');
      }

      // 3. Create the borrowing record
      const borrowing = await tx.bookBorrowing.create({
        data: {
          bookId: data.bookId,
          studentId: data.studentId,
          dueDate: data.dueDate,
          status: 'ISSUED',
        },
      });

      await this.eventBus.publish('LibraryBook.Issued', { borrowingId: borrowing.id, tenantId: data.tenantId });
      return borrowing;
    });
  }

  async returnBook(tenantId: string, borrowingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const borrowing = await tx.bookBorrowing.findUnique({
        where: { id: borrowingId, book: { tenantId } },
        include: { book: true },
      });

      if (!borrowing) throw new NotFoundException('Borrowing record not found');
      if (borrowing.status === 'RETURNED') throw new BadRequestException('Book is already returned');

      // Update borrowing to RETURNED
      const updatedBorrowing = await tx.bookBorrowing.update({
        where: { id: borrowingId },
        data: {
          status: 'RETURNED',
          returnDate: new Date(),
        },
      });

      // Increment available copies
      await tx.libraryBook.update({
        where: { id: borrowing.bookId },
        data: { copiesAvailable: { increment: 1 } },
      });

      await this.eventBus.publish('LibraryBook.Returned', { borrowingId: updatedBorrowing.id, tenantId });
      return updatedBorrowing;
    });
  }

  async runOverdueCheck(tenantId: string) {
    // Mark overdue borrowings and assess fines
    const now = new Date();
    
    // Find all ISSUED books where due date has passed
    const overdues = await this.prisma.bookBorrowing.findMany({
      where: {
        book: { tenantId },
        status: 'ISSUED',
        dueDate: { lt: now },
      },
    });

    for (const borrowing of overdues) {
      await this.prisma.bookBorrowing.update({
        where: { id: borrowing.id },
        data: { status: 'OVERDUE' },
      });

      // Assess a fine (e.g. 500 kobo = ?5 base fine).
      // Idempotency is handled inside assessFine.
      await this.fineService.assessFine({
        tenantId,
        borrowingId: borrowing.id,
        amountKobo: 50000, // ?500 fine
        reason: 'Overdue Book Return',
      });
    }

    return overdues.length;
  }
}
