import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class UserMeDto {
  @ApiPropertyOptional({ description: 'Distributed trace identifier for request correlation' })
  @IsOptional()
  @IsUUID()
  traceId?: string;

  // Only return non-sensitive user data
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'librarian' | 'member';
  isActive: boolean;
}