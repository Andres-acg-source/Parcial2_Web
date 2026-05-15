import { IsUUID, IsString, IsOptional, IsDateString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnLoanDto {
  @ApiPropertyOptional({ description: 'Distributed trace identifier for request correlation' })
  @IsOptional()
  @IsUUID()
  traceId?: string;
}