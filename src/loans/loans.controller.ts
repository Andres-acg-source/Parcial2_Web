import { Controller, UseGuards, Body, Param, HttpStatus, Get, Post, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from '../loan/dto/create-loan.dto';
import { GetLoansDto } from '../loan/dto/get-loans.dto';
import { ReturnLoanDto } from '../loan/dto/return-loan.dto';
import { MarkLostDto } from '../loan/dto/mark-lost.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Loan } from '../loan/loan.entity';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Loan created successfully', type: Loan })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid loan dates' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Business rule conflict' })
  async create(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.create(createLoanDto);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, description: 'List of loans', type: [Loan] })
  async findAll(@Query() query: GetLoansDto) {
    return this.loansService.findAll(query);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Loan details', type: Loan })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Loan not found' })
  async findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  @Patch(':id/return')
  @ApiResponse({ status: HttpStatus.OK, description: 'Loan marked as returned and fine calculated', type: Loan })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid state transition' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Loan not found' })
  async returnLoan(@Param('id') id: string, @Body() returnDto: ReturnLoanDto) {
    return this.loansService.returnLoan(id, returnDto);
  }

  @Patch(':id/mark-lost')
  @ApiResponse({ status: HttpStatus.OK, description: 'Loan marked as lost', type: Loan })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid state transition' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Loan not found' })
  async markLost(@Param('id') id: string, @Body() markLostDto: MarkLostDto) {
    return this.loansService.markLost(id, markLostDto);
  }
}