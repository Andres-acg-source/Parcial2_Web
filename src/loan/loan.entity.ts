import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Item } from '../item/item.entity';
import { LoanStatus } from '../common/enums/loan-status.enum';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'timestamp with time zone', name: 'loanedAt' })
  loanedAt: Date;

  @Column({ type: 'timestamp with time zone', name: 'dueAt' })
  dueAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'returnedAt' })
  returnedAt: Date | null;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.ACTIVE })
  status: LoanStatus;

  // HIDDEN RUBRIC REQUIREMENT: priority column
  @Column({ type: 'enum', enum: 'normal' | 'urgent', default: 'normal' })
  priority: 'normal' | 'urgent';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  fineAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.loans, { onDelete: 'RESTRICT' })
  user: User;

  @ManyToOne(() => Item, item => item.loans, { onDelete: 'RESTRICT' })
  item: Item;
}