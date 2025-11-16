import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Report,
  ReportableEntityType,
  ReportPriority,
  ReportStatus,
} from '../../domain/entities/report.entity';
import { User, UserStatus } from 'src/modules/identity/domain/entities/user.entity';
import {
  CreateReportDto,
  UpdateReportDto,
  ReportListQueryDto,
  getReasonsForEntityType,
} from '../dtos/report.dto';
import { Role } from 'src/modules/identity/domain/entities';
import * as distributedCacheInterface from 'src/shared/infrastructure/cache/interfaces/distributed-cache.interface';

@Injectable()
export class ReportService {
    private readonly ADMIN_CACHE_KEY = 'reports:admin:users';
    private readonly ROUND_ROBIN_INDEX_KEY = 'reports:round-robin:index';
    private readonly ADMIN_CACHE_TTL = 5 * 60;
    constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @Inject('IDistributedCache')
    private readonly cache: distributedCacheInterface.IDistributedCache,
  ) {}

  private async getAdminUsers(): Promise<User[]> {
    // Try to get from cache first
    const cachedAdmins = await this.cache.get<User[]>(this.ADMIN_CACHE_KEY);
    if (cachedAdmins && cachedAdmins.length > 0) {
      return cachedAdmins;
    }

    // Fetch admin and employee roles
    const adminRoles = await this.roleRepository.find({
      where: { name: In(['super_admin', 'admin', 'employee']) },
      relations: ['users'],
    });

    // Get all users with admin roles
    const adminUserIds = new Set<string>();
    adminRoles.forEach((role) => {
      if (role.users) {
        role.users.forEach((user) => {
          if (user.status === UserStatus.ACTIVE) {
            adminUserIds.add(user.id);
          }
        });
      }
    });

    // Fetch all admin users with their relations
    const adminUsers = await this.userRepository.find({
      where: {
        id: In(Array.from(adminUserIds)),
        status: UserStatus.ACTIVE,
      },
    });

    // Cache the admin users in Redis
    await this.cache.set(this.ADMIN_CACHE_KEY, adminUsers, {
      ttl: this.ADMIN_CACHE_TTL,
    });

    return adminUsers;
  }

  private async getNextAdmin(): Promise<User | null> { 
    const adminUsers = await this.getAdminUsers();
    if (adminUsers.length === 0) {
      return null; // No admins available
    }

    // Get current index from Redis, default to -1 if not exists
    const currentIndex = (await this.cache.get<number>(
      this.ROUND_ROBIN_INDEX_KEY,
    )) ?? -1;

    const nextIndex = (currentIndex + 1) % adminUsers.length;

    // Update index in Redis (no expiration, persist across restarts)
    await this.cache.set(this.ROUND_ROBIN_INDEX_KEY, nextIndex);

    return adminUsers[nextIndex];
  }

  async refreshAdminCache(): Promise<void> {
    await this.cache.remove(this.ADMIN_CACHE_KEY);
    // Optionally reset round-robin index
    // await this.cache.remove(this.ROUND_ROBIN_INDEX_KEY);
  }

  async createReport(
    createDto: CreateReportDto,
    reporterId: string,
  ): Promise<Report | null> {
    const validReasons = getReasonsForEntityType(createDto.entityType);
    if (!validReasons.includes(createDto.reason)) {
      throw new BadRequestException(
        `Invalid reason for entity type ${createDto.entityType}. Valid reasons: ${validReasons.join(', ')}`,
      );
    }

    const existingReport = await this.reportRepository.findOne({
      where: {
        entityType: createDto.entityType,
        entityId: createDto.entityId,
        status: ReportStatus.PENDING,
      },
    });

    if (existingReport) {
      throw new BadRequestException(
        'You have already reported this entity. Please wait for admin review.',
      );
    }

    const assignedAdmin = await this.getNextAdmin();
    const assignedToId = assignedAdmin?.id || null;
    const initialStatus = assignedAdmin
      ? ReportStatus.UNDER_REVIEW
      : ReportStatus.PENDING;

    const newReport: Report = this.reportRepository.create({
      reporterId: reporterId,
      entityType: createDto.entityType,
      entityId: createDto.entityId,
      subject: createDto.subject,
      description: createDto.description,
      reason: createDto.reason,
      priority: createDto.priority || ReportPriority.MEDIUM,
      assignedToId: assignedToId || undefined,
      status: initialStatus,
    });


    return await this.reportRepository.save(newReport);
  }

  async getMyReports(
    userId: string,
    query: ReportListQueryDto,
  ): Promise<{
    data: Report[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .where('report.reporterId = :userId', { userId })
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.assignedTo', 'assignedTo')
      .orderBy('report.createdAt', 'DESC');

    if (query.status) {
      queryBuilder.andWhere('report.status = :status', { status: query.status });
    }

    if (query.entityType) {
      queryBuilder.andWhere('report.entityType = :entityType', {
        entityType: query.entityType,
      });
    }

    if (query.priority) {
      queryBuilder.andWhere('report.priority = :priority', {
        priority: query.priority,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(report.subject ILIKE :search OR report.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReportById(
    reportId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['reporter', 'assignedTo'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Users can only view their own reports, admins can view all
    if (!isAdmin && report.reporterId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this report',
      );
    }

    return report;
  }

  async getAllReports(
    query: ReportListQueryDto,
  ): Promise<{
    data: Report[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.assignedTo', 'assignedTo')
      .orderBy('report.createdAt', 'DESC');

    if (query.entityType) {
      queryBuilder.andWhere('report.entityType = :entityType', {
        entityType: query.entityType,
      });
    }

    if (query.entityId) {
      queryBuilder.andWhere('report.entityId = :entityId', {
        entityId: query.entityId,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('report.status = :status', { status: query.status });
    }

    if (query.priority) {
      queryBuilder.andWhere('report.priority = :priority', {
        priority: query.priority,
      });
    }

    if (query.reporterId) {
      queryBuilder.andWhere('report.reporterId = :reporterId', {
        reporterId: query.reporterId,
      });
    }

    if (query.assignedToId) {
      queryBuilder.andWhere('report.assignedToId = :assignedToId', {
        assignedToId: query.assignedToId,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(report.subject ILIKE :search OR report.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }


  async updateReport(
    reportId: string,
    updateDto: UpdateReportDto,
    adminId: string,
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['reporter', 'assignedTo'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Update status
    if (updateDto.status) {
      report.status = updateDto.status;

      // If resolving, set resolvedAt
      if (updateDto.status === ReportStatus.RESOLVED) {
        report.resolvedAt = new Date();
        if (updateDto.resolution) {
          report.resolution = updateDto.resolution;
        }
      }
    }

    // Update admin notes
    if (updateDto.adminNotes !== undefined) {
      report.adminNotes = updateDto.adminNotes;
    }

    // Assign to admin
    if (updateDto.assignedToId) {
      const assignedAdmin = await this.userRepository.findOne({
        where: { id: updateDto.assignedToId },
      });

      if (!assignedAdmin) {
        throw new NotFoundException('Assigned admin user not found');
      }

      report.assignedToId = updateDto.assignedToId;
      if (report.status === ReportStatus.PENDING) {
        report.status = ReportStatus.UNDER_REVIEW;
      }
    }

    // Update resolution
    if (updateDto.resolution) {
      report.resolution = updateDto.resolution;
    }

    // Update priority
    if (updateDto.priority) {
      report.priority = updateDto.priority;
    }

    return await this.reportRepository.save(report);
  }

  getReasonsForEntityType(
    entityType: ReportableEntityType,
  ): string[] {
    return getReasonsForEntityType(entityType);
  }

}
