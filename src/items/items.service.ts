import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../item/item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Loan } from '../loan/loan.entity';
import { LoanStatus } from '../common/enums/loan-status.enum';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
  ) {}

  async create(createItemDto: CreateItemDto): Promise<Item> {
    const existingItem = await this.itemsRepository.findOne({ where: { code: createItemDto.code } });
    if (existingItem) {
      throw new ConflictException(`Item with code ${createItemDto.code} already exists.`);
    }

    const item = this.itemsRepository.create(createItemDto);
    return this.itemsRepository.save(item);
  }

  async findAll(type?: string): Promise<(Item & { isAvailable: boolean })[]> {
    const query = this.itemsRepository.createQueryBuilder('item').where('item.isActive = true');

    if (type) {
      query.andWhere('item.type = :type', { type });
    }

    const items = await query.getMany();

    // Fetch availability for each item
    const itemsWithAvailability = await Promise.all(
      items.map(async (item) => {
        const activeLoans = await this.loansRepository.count({
          where: { itemId: item.id, status: LoanStatus.ACTIVE },
        });
        return { ...item, isAvailable: activeLoans === 0 };
      }),
    );

    return itemsWithAvailability;
  }

  async findOne(id: string): Promise<Item & { isAvailable: boolean }> {
    const item = await this.itemsRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    const activeLoans = await this.loansRepository.count({
      where: { itemId: item.id, status: LoanStatus.ACTIVE },
    });

    return { ...item, isAvailable: activeLoans === 0 };
  }

  async update(id: string, updateItemDto: UpdateItemDto): Promise<Item> {
    const item = await this.itemsRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

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