import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../loan/loan.entity';
import { CreateLoanDto } from '../loan/dto/create-loan.dto';
import { GetLoansDto } from '../loan/dto/get-loans.dto';
import { ReturnLoanDto } from '../loan/dto/return-loan.dto';
import { MarkLostDto } from '../loan/dto/mark-lost.dto';
import { Item } from '../item/item.entity';
import { User } from '../user/user.entity';
import { ConfigService } from '@nestjs/config';
import { LoanStatus } from '../common/enums/loan-status.enum';

@Injectable()
export class LoansService {
  private readonly DAILY_FINE_RATE: number;
  private readonly MAX_ACTIVE_LOANS_PER_USER: number;

  constructor(
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    this.DAILY_FINE_RATE = parseFloat(this.configService.get('DAILY_FINE_RATE', '0.50'));
    this.MAX_ACTIVE_LOANS_PER_USER = parseInt(this.configService.get('MAX_ACTIVE_LOANS', '3'), 10);
  }

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

  // R4: Cálculo de multa
  private calculateFine(dueAt: Date, returnedAt: Date): number {
    const diffTime = returnedAt.getTime() - dueAt.getTime();
    const daysOverdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return parseFloat((daysOverdue * this.DAILY_FINE_RATE).toFixed(2));
  }

  async create(createLoanDto: CreateLoanDto): Promise<Loan> {
    const loanedAt = new Date();
    const dueAt = new Date(createLoanDto.dueAt);

    // R1: Validation de fechas
    this.validateLoanDates(dueAt, loanedAt);

    // R2: Item disponible
    const existingLoan = await this.loansRepository.findOne({
      where: [{ itemId: createLoanDto.itemId, status: LoanStatus.ACTIVE }, { itemId: createLoanDto.itemId, status: LoanStatus.OVERDUE }],
    });

    if (existingLoan) {
      throw new ConflictException(
        `Item is currently loaned out. Blocked by Loan ID: ${existingLoan.id}.`,
      );
    }

    // R3: Límite de préstamos simultáneos por usuario
    const activeLoansCount = await this.loansRepository.count({
      where: [
        { userId: createLoanDto.userId, status: LoanStatus.ACTIVE },
        { userId: createLoanDto.userId, status: LoanStatus.OVERDUE },
      ],
    });

    if (activeLoansCount >= this.MAX_ACTIVE_LOANS_PER_USER) {
      throw new ConflictException(
        `You have reached your maximum limit of active loans (${this.MAX_ACTIVE_LOANS_PER_USER}).`,
      );
    }

    const loan = this.loansRepository.create({
      userId: createLoanDto.userId,
      itemId: createLoanDto.itemId,
      loanedAt,
      dueAt,
      status: LoanStatus.ACTIVE,
      priority: 'normal',
    } as any) as any;

    return this.loansRepository.save(loan);
  }

  async findAll(query: GetLoansDto): Promise<Loan[]> {
    const qb = this.loansRepository.createQueryBuilder('loan');

    if (query.userId) {
      qb.andWhere('loan.userId = :userId', { userId: query.userId });
    }

    if (query.itemId) {
      qb.andWhere('loan.itemId = :itemId', { itemId: query.itemId });
    }

    if (query.status) {
      // Handle overdue status: active loans with dueAt < now()
      if (query.status === 'overdue') {
        qb.andWhere('loan.status = :status AND loan.dueAt < NOW() AND loan.returnedAt IS NULL', {
          status: 'active',
        });
      } else {
        qb.andWhere('loan.status = :status', { status: query.status });
      }
    }

    return qb.getMany();
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
      throw new BadRequestException(
        'This loan is already returned or marked as lost and cannot be returned again.',
      );
    }

    const returnedAt = new Date();

    // R4: Cálculo de multa
    const fineAmount = this.calculateFine(loan.dueAt, returnedAt);

    loan.status = LoanStatus.RETURNED;
    loan.returnedAt = returnedAt;
    loan.fineAmount = fineAmount;

    return this.loansRepository.save(loan);
  }

  async markLost(id: string, markLostDto: MarkLostDto): Promise<Loan> {
    const loan = await this.findOne(id);

    // R5: Transiciones FSM de Loan
    if (loan.status === 'returned' || loan.status === 'lost') {
      throw new BadRequestException(
        'This loan is already returned or marked as lost and cannot be marked as lost again.',
      );
    }

    loan.status = LoanStatus.LOST;
    loan.returnedAt = new Date();

    return this.loansRepository.save(loan);
  }
}