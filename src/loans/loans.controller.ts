import { Controller, UseGuards, Body, Param, HttpStatus, HttpException, HttpStatusException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { GetLoansDto } from './dto/get-loans.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { MarkLostDto } from './dto/mark-lost.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Item } from '../item/item.entity';
import { User } from '../user/user.entity';

@ApiTags('Loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Loan created successfully', type: Item })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Business rule conflict (e.g., item unavailable, user limit reached)', type: Object })
  async create(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.create(createLoanDto);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, description: 'List of loans', type: [Item] })
  async findAll(@Query() query: GetLoansDto) {
    return this.loansService.findAll(query);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Loan details', type: Item })
  async findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  @Patch(':id/return')
  @ApiResponse({ status: HttpStatus.OK, description: 'Loan marked as returned and fine calculated', type: Item })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Business rule conflict (e.g., already returned)', type: Object })
  async returnLoan(@Param('id') id: string, @Body() returnDto: ReturnLoanDto) {
    return this.loansService.returnLoan(id, returnDto);
  }

  @Patch(':id/mark-lost')
  @ApiResponse({ status: HttpStatus.OK, description: 'Loan marked as lost', type: Item })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Business rule conflict (e.g., already returned)', type: Object })
  async markLost(@Param('id') id: string, @Body() markLostDto: MarkLostDto) {
    return this.loansService.markLost(id, markLostDto);
  }
}