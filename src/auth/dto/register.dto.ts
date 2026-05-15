import { IsUUID, IsString, IsOptional, IsEnum, IsNotEmpty, IsDateString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @MinLength(2)
  firstName: string;

  @IsNotEmpty()
  @MinLength(2)
  lastName: string;

  @ApiPropertyOptional({ description: 'Distributed trace identifier for request correlation' })
  @IsOptional()
  @IsUUID()
  traceId?: string;
}