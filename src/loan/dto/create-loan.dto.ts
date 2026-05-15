import { IsUUID, IsString, IsOptional, IsEnum, IsNotEmpty, IsDateString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '../../common/enums/loan-status.enum';

export class CreateLoanDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @IsNotEmpty()
  @IsDateString()
  dueAt: string;

  @ApiPropertyOptional({ description: 'Distributed trace identifier for request correlation' })
  @IsOptional()
  @IsUUID()
  traceId?: string;
}