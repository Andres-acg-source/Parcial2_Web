import { IsUUID, IsString, IsOptional, IsEnum, IsNotEmpty, IsDateString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookType } from '../../common/enums/book-type.enum';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(BookType)
  type?: BookType;

  @ApiPropertyOptional({ description: 'Distributed trace identifier for request correlation' })
  @IsOptional()
  @IsUUID()
  traceId?: string;
}