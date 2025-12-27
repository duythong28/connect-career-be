import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import {
  BillableAction,
  ActionCategory,
} from '../../domain/entities/billable-action.entity';
import {
  CreateBillableActionDto,
  UpdateBillableActionDto,
  UpdateBillableActionStatusDto,
  BillableActionsListQueryDto,
} from '../dtos/billable-actions.dto';

@Injectable()
export class BillableActionsService {
  private readonly logger = new Logger(BillableActionsService.name);

  constructor(
    @InjectRepository(BillableAction)
    private readonly billableActionRepository: Repository<BillableAction>,
  ) {}

  async findAll(query: BillableActionsListQueryDto) {
    const { pageNumber = 1, pageSize = 20, category, isActive, search } = query;
    const skip = (pageNumber - 1) * pageSize;

    const where: FindOptionsWhere<BillableAction> = {};

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.actionName = ILike(`%${search}%`);
    }

    const [items, total] = await this.billableActionRepository.findAndCount({
      where,
      skip,
      take: pageSize,
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      items,
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string): Promise<BillableAction> {
    const action = await this.billableActionRepository.findOne({
      where: { id },
    });

    if (!action) {
      throw new NotFoundException(`Billable action with ID ${id} not found`);
    }

    return action;
  }

  async findByCode(actionCode: string): Promise<BillableAction> {
    const action = await this.billableActionRepository.findOne({
      where: { actionCode },
    });

    if (!action) {
      throw new NotFoundException(
        `Billable action with code ${actionCode} not found`,
      );
    }

    return action;
  }

  async create(dto: CreateBillableActionDto): Promise<BillableAction> {
    // Check if action code already exists
    const existing = await this.billableActionRepository.findOne({
      where: { actionCode: dto.actionCode },
    });

    if (existing) {
      throw new BadRequestException(
        `Billable action with code ${dto.actionCode} already exists`,
      );
    }

    const action = this.billableActionRepository.create({
      ...dto,
      currency: dto.currency || 'USD',
      isActive: true,
    });

    const saved = await this.billableActionRepository.save(action);
    this.logger.log(`Created billable action: ${saved.actionCode}`);
    return saved;
  }

  async update(
    id: string,
    dto: UpdateBillableActionDto,
  ): Promise<BillableAction> {
    const action = await this.findOne(id);

    // Update only provided fields
    Object.assign(action, dto);

    const updated = await this.billableActionRepository.save(action);
    this.logger.log(`Updated billable action: ${updated.actionCode}`);
    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateBillableActionStatusDto,
  ): Promise<BillableAction> {
    const action = await this.findOne(id);
    action.isActive = dto.isActive;

    const updated = await this.billableActionRepository.save(action);
    this.logger.log(
      `${dto.isActive ? 'Activated' : 'Deactivated'} billable action: ${updated.actionCode}`,
    );
    return updated;
  }

  async updatePrice(id: string, cost: number): Promise<BillableAction> {
    if (cost < 0) {
      throw new BadRequestException('Cost cannot be negative');
    }

    const action = await this.findOne(id);
    action.cost = cost;

    const updated = await this.billableActionRepository.save(action);
    this.logger.log(`Updated price for ${updated.actionCode}: $${cost}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const action = await this.findOne(id);
    await this.billableActionRepository.remove(action);
    this.logger.log(`Deleted billable action: ${action.actionCode}`);
  }
}
