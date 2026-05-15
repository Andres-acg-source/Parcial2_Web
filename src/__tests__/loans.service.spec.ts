import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoansService } from '../loans/loans.service';
import { Loan } from '../loan/loan.entity';
import { Item } from '../item/item.entity';
import { User } from '../user/user.entity';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Date } from 'date-fns';

describe('LoansService', () => {
  let service: LoansService;
  let mockLoansRepository: Partial<Repository<Loan>>;
  let mockItemsRepository: Partial<Repository<Item>>;
  let mockUsersRepository: Partial<Repository<User>>;

  beforeEach(async () => {
    // Mock repositories
    mockLoansRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockItemsRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockUsersRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: getRepositoryToken(Loan),
          useValue: mockLoansRepository,
        },
        {
          provide: getRepositoryToken(Item),
          useValue: mockItemsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        ConfigService,
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test Case 1: Crea préstamo exitoso cuando item disponible, usuario bajo el límite y fechas válidas.
  describe('create', () => {
    const mockCreateDto = {
      userId: 'user-uuid',
      itemId: 'item-uuid',
      dueAt: '2026-01-10T00:00:00.000Z', // Due date 30 days in future
    };
    const mockLoan = {
      id: 'loan-uuid',
      userId: 'user-uuid',
      itemId: 'item-uuid',
      loanedAt: new Date(),
      dueAt: new Date('2026-01-10T00:00:00.000Z'),
      status: 'active',
      priority: 'normal',
      fineAmount: 0.00,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a loan successfully when all conditions are met', async () => {
      // Mock dependencies for success
      mockItemsRepository.findOne.mockResolvedValue({ id: 'item-uuid' });
      mockLoansRepository.count.mockResolvedValue(0); // Item available
      mockLoansRepository.count.mockResolvedValue(1); // User under limit (1 < 3)
      mockLoansRepository.save.mockResolvedValue(mockLoan);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual(mockLoan);
      expect(mockLoansRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: 'active',
        priority: 'normal',
      }));
    });
  });

  // Test Case 2: Lanza ConflictException si el item ya tiene un préstamo activo (R2).
  describe('create', () => {
    const mockCreateDto = {
      userId: 'user-uuid',
      itemId: 'item-uuid',
      dueAt: '2026-01-10T00:00:00.000Z',
    };

    it('should throw ConflictException if item is already loaned', async () => {
      // Mock dependencies for failure (R2)
      mockItemsRepository.findOne.mockResolvedValue({ id: 'item-uuid' });
      mockLoansRepository.count.mockResolvedValue(1); // Item NOT available (1 > 0)
      mockLoansRepository.count.mockResolvedValue(1); // User under limit

      await expect(service.create(mockCreateDto)).rejects.toThrow(ConflictException);
      await expect(service.create(mockCreateDto)).rejects.toHaveMessage('Item is currently loaned out. Blocked by Loan ID: mock-blocking-id.');
    });
  });

  // Test Case 3: Lanza ConflictException si el usuario ya tiene 3 préstamos activos (R3).
  describe('create', () => {
    const mockCreateDto = {
      userId: 'user-uuid',
      itemId: 'item-uuid',
      dueAt: '2026-01-10T00:00:00.000Z',
    };

    it('should throw ConflictException if user exceeds loan limit (3)', async () => {
      // Mock dependencies for failure (R3)
      mockItemsRepository.findOne.mockResolvedValue({ id: 'item-uuid' });
      mockLoansRepository.count.mockResolvedValue(0); // Item available
      mockLoansRepository.count.mockResolvedValue(4); // User OVER limit (4 >= 3)

      await expect(service.create(mockCreateDto)).rejects.toThrow(ConflictException);
      await expect(service.create(mockCreateDto)).rejects.toHaveMessage('You have reached your maximum limit of active loans (3).');
    });
  });

  // Test Case 4: return calcula multa correctamente: dado un préstamo con dueAt = hace 5 días, al devolver hoy debe calcular fineAmount = 5 × 0.50 = 2.50 (R4).
  describe('returnLoan', () => {
    const mockLoanId = 'loan-uuid';
    const mockDueAt = new Date('2026-01-10T00:00:00.000Z');
    const mockReturnedAt = new Date('2026-01-15T12:00:00.000Z'); // 5 days and 12 hours later

    it('should calculate fine amount correctly for 5 days overdue', async () => {
      // Mock finding the loan
      mockLoansRepository.findOne.mockResolvedValue({
        id: mockLoanId,
        dueAt: mockDueAt,
        status: 'active',
        fineAmount: 0.00,
        returnedAt: null,
      });
      
      // Mock saving the updated loan
      mockLoansRepository.save.mockResolvedValue({
        ...mockLoansRepository.findOne.mock.results[0].value,
        status: 'returned',
        returnedAt: mockReturnedAt,
        fineAmount: 2.50, // Expected fine: 5 days * 0.50
      });

      const result = await service.returnLoan(mockLoanId, {});

      expect(result.status).toBe('returned');
      expect(result.fineAmount).toBe(2.50);
    });
  });
});