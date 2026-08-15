import { AcademicCalendarService } from '../services/academic-calendar.service';
import { PrismaService, PlatformEventBus } from '@saas/core-platform';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AcademicCalendarService', () => {
  const mockPrisma = mockDeep<PrismaService>();
  const mockEventBus = mockDeep<PlatformEventBus>();
  let service: AcademicCalendarService;

  beforeEach(() => {
    mockReset(mockPrisma);
    mockReset(mockEventBus);
    service = new AcademicCalendarService(mockPrisma, mockEventBus);
  });

  describe('createAcademicYear', () => {
    it('should throw BadRequestException if start date is after end date', async () => {
      await expect(
        service.createAcademicYear('t1', {
          name: '2026/2027',
          startDate: '2027-01-01',
          endDate: '2026-01-01'
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should create an academic year with UPCOMING status', async () => {
      mockPrisma.academicYear.create.mockResolvedValue({ id: 'y1' } as any);
      
      const result = await service.createAcademicYear('t1', {
        name: '2026/2027',
        startDate: '2026-09-01',
        endDate: '2027-06-30'
      });

      expect(mockPrisma.academicYear.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1',
          name: '2026/2027',
          status: 'UPCOMING'
        })
      });
      expect(result).toEqual({ id: 'y1' });
    });
  });

  describe('activateAcademicYear', () => {
    it('should run inside a transaction and update status correctly', async () => {
      const mockTx = {
        academicYear: {
          findUnique: jest.fn().mockResolvedValue({ id: 'y2', tenantId: 't1', status: 'UPCOMING', name: '2026' }),
          updateMany: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 'y2', name: '2026', status: 'ACTIVE' })
        }
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      const result = await service.activateAcademicYear('t1', 'y2');

      expect(mockTx.academicYear.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', status: 'ACTIVE' },
        data: { status: 'PAST' }
      });

      expect(mockTx.academicYear.update).toHaveBeenCalledWith({
        where: { id: 'y2' },
        data: { status: 'ACTIVE' }
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith('AcademicYear.Activated', {
        tenantId: 't1',
        academicYearId: 'y2',
        name: '2026'
      });

      expect(result.id).toEqual('y2');
    });

    it('should throw NotFoundException if year belongs to another tenant', async () => {
      const mockTx = {
        academicYear: {
          findUnique: jest.fn().mockResolvedValue({ id: 'y2', tenantId: 't2' })
        }
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      await expect(service.activateAcademicYear('t1', 'y2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTerm', () => {
    it('should reject if dates are outside the academic year', async () => {
      mockPrisma.academicYear.findUnique.mockResolvedValue({
        id: 'y1',
        tenantId: 't1',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-06-30')
      } as any);

      await expect(
        service.createTerm('t1', {
          academicYearId: 'y1',
          name: 'Fall',
          startDate: '2026-08-01', // Before year start
          endDate: '2026-12-15'
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a term successfully', async () => {
      mockPrisma.academicYear.findUnique.mockResolvedValue({
        id: 'y1',
        tenantId: 't1',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-06-30')
      } as any);

      mockPrisma.term.create.mockResolvedValue({ id: 'term1' } as any);

      const result = await service.createTerm('t1', {
        academicYearId: 'y1',
        name: 'Fall',
        startDate: '2026-09-15',
        endDate: '2026-12-15'
      });

      expect(mockPrisma.term.create).toHaveBeenCalled();
      expect(result.id).toEqual('term1');
    });
  });
});
