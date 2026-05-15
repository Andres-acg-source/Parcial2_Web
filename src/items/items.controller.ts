import { Controller, UseGuards, Body, Param, HttpStatus, Get, Post, Patch, Delete, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Item } from '../item/item.entity';

@ApiTags('Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Item created successfully', type: Item })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Item code already exists' })
  async create(@Body() createItemDto: CreateItemDto) {
    return this.itemsService.create(createItemDto);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, description: 'List of active items', type: [Item] })
  async findAll(@Query('type') type?: string) {
    return this.itemsService.findAll(type);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Item details', type: Item })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Item not found' })
  async findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Item updated successfully', type: Item })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Item not found' })
  async update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    return this.itemsService.update(id, updateItemDto);
  }

  @Delete(':id')
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Item soft deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Item not found' })
  async remove(@Param('id') id: string) {
    await this.itemsService.remove(id);
  }
}