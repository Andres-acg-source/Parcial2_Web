import { IsUUID, IsString, IsOptional, IsEnum, IsNotEmpty, IsDateString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '../../common/enums/loan-status.enum';

export class GetLoansDto {
  @ApiPropertyOptional({ description: 'Distributed trace identifier for request correlation' })
  @IsOptional()
  @IsUUID()
  traceId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;
}