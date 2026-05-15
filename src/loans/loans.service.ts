import { Injectable, ConflictException, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../loan/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { GetLoansDto } from './dto/get-loans.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { MarkLostDto } from './dto/mark-lost.dto';
import { Item } from '../item/item.entity';
import { User } from '../user/user.entity';
import { ConfigService } from '@nestjs/config';
import { format, subDays, addDays, isAfter, isBefore } from 'date-fns';

@Injectable()
export class LoansService {
  private readonly DAILY_FINE_RATE = 0.50;
  private readonly MAX_ACTIVE_LOANS_PER_USER = 3;

  constructor(
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  // R1: Validation de fechas
  private validateLoanDates(dueAt: Date, loanedAt: Date): void {
    const maxLoanDays = 30;
    const loanDuration = Math.ceil((dueAt.getTime() - loanedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (loanDuration <= 0) {
      throw new BadRequestException('The due date must be after the loan date.');
    }
    if (loanDuration > maxLoanDays) {
      throw new BadRequestException(`The loan duration cannot exceed ${maxLoanDays} days.`);
    }
  }

  // R2: Item disponible
  private isItemAvailable(itemId: string): Promise<boolean> {
    // Check for any active or overdue loans
    return this.loansRepository.count({
      where: {
        itemId: itemId,
        status: ['active', 'overdue'],
      },
    }).then(count => count === 0);
  }

  // R3: Límite de préstamos simultáneos por usuario
  private checkUserLoanLimit(userId: string): Promise<boolean> {
    // Count active or overdue loans for the user
    return this.loansRepository.count({
      where: {
        userId: userId,
        status: ['active', 'overdue'],
      },
    }).then(count => count < this.MAX_ACTIVE_LOANS_PER_USER);
  }

  // R4: Cálculo de multa
  private calculateFine(dueAt: Date, returnedAt: Date): number {
    // Calculate days overdue: ceil((returnedAt - dueAt) / 1 day)
    const diffTime = Math.abs(returnedAt.getTime() - dueAt.getTime());
    // Convert milliseconds to days, then use Math.ceil
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return daysOverdue * this.DAILY_FINE_RATE;
  }

  async create(createLoanDto: CreateLoanDto): Promise<Loan> {
    const loanedAt = new Date();
    const dueAt = new Date(createLoanDto.dueAt);

    // R1: Validation de fechas
    this.validateLoanDates(dueAt, loanedAt);

    // R2: Item disponible
    const isAvailable = await this.isItemAvailable(createLoanDto.itemId);
    if (!isAvailable) {
      // Find the blocking loan to provide a clear message
      const blockingLoan = await this.loansRepository.findOne({
        where: { itemId: createLoanDto.itemId, status: ['active', 'overdue'] },
        order: { createdAt: 'ASC' }
      });
      throw new ConflictException(`Item is currently loaned out. Blocked by Loan ID: ${blockingLoan?.id || 'Unknown'}.`);
    }

    // R3: Límite de préstamos simultáneos por usuario
    const userHasLimit = await this.checkUserLoanLimit(createLoanDto.userId);
    if (!userHasLimit) {
      throw new ConflictException('You have reached your maximum limit of active loans (3).');
    }

    // Create the loan record
    const loan = this.loansRepository.create({
      userId: createLoanDto.userId,
      itemId: createLoanDto.itemId,
      loanedAt: loanedAt,
      dueAt: dueAt,
      status: 'active',
      priority: 'normal', // Default value
    });

    return this.loansRepository.save(loan);
  }

  async findAll(query: any): Promise<Loan[]> {
    // Implement filtering logic based on query parameters
    // For now, list all loans.
    return this.loansRepository.find();
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }
    return loan;
  }

  async returnLoan(id: string, returnDto: ReturnLoanDto): Promise<Loan> {
    const loan = await this.findOne(id);

    // R5: Transiciones FSM de Loan
    if (loan.status === 'returned' || loan.status === 'lost') {
      throw new BadRequestException('This loan is already returned or marked as lost and cannot be returned again.');
    }

    const returnedAt = new Date();
    
    // R4: Cálculo de multa
    const fineAmount = this.calculateFine(loan.dueAt, returnedAt);

    // Update status and returnedAt
    loan.status = 'returned';
    loan.returnedAt = returnedAt;
    loan.fineAmount = fineAmount;
    
    return this.loansRepository.save(loan);
  }

  async markLost(id: string, markLostDto: MarkLostDto): Promise<Loan> {
    const loan = await this.findOne(id);

    // R5: Transiciones FSM de Loan
    if (loan.status === 'returned' || loan.status === 'lost') {
      throw new BadRequestException('This loan is already returned or marked as lost and cannot be marked as lost again.');
    }

    // Update status
    loan.status = 'lost';
    loan.returnedAt = new Date(); // Mark the date it was lost
    
    return this.loansRepository.save(loan);
  }
}