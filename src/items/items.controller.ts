import { Controller, UseGuards, Body, Param, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Item } from '../item/item.entity';

@ApiTags('Items')
@UseGuards(JwtAuthGuard)
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
  async findAll(query: any) {
    return this.itemsService.findAll(query);
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Item details', type: Item })
  async findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Item updated successfully', type: Item })
  async update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    return this.itemsService.update(id, updateItemDto);
  }

  @Delete(':id')
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Item soft deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.itemsService.remove(id);
    return null;
  }
}