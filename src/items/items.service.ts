import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../item/item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
  ) {}

  async create(createItemDto: CreateItemDto): Promise<Item> {
    // Check for unique code before creation
    const existingItem = await this.itemsRepository.findOne({ where: { code: createItemDto.code } });
    if (existingItem) {
      throw new ConflictException(`Item with code ${createItemDto.code} already exists.`);
    }

    const item = this.itemsRepository.create({
      ...createItemDto,
      // Ensure default values are handled by the entity/DB, but we can set them here if needed
    });

    return this.itemsRepository.save(item);
  }

  async findAll(query: any): Promise<Item[]> {
    // Implement filtering logic based on query parameters (e.g., ?type=book)
    // For now, list all active items.
    return this.itemsRepository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemsRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    return item;
  }

  async update(id: string, updateItemDto: UpdateItemDto): Promise<Item> {
    const item = await this.findOne(id);
    
    // Apply updates, respecting optional fields
    Object.assign(item, updateItemDto);

    return this.itemsRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const result = await this.itemsRepository.update(id, { isActive: false });
    if (result.affected === 0) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
  }
}