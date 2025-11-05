import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role, User, UserStatus } from 'src/modules/identity/domain/entities';
import { Repository } from 'typeorm';
import {
  UpdateUserRolesDto,
  UpdateUserStatusDto,
} from '../dtos/user.back-office';

export interface UserBackOfficeFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: UserStatus;
  role?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pendingVerification: number;
  byRole: Array<{ role: string; count: number }>;
}

export interface PaginatedUsers {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class UserBackOfficeService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async getUsers(filters: UserBackOfficeFilters): Promise<PaginatedUsers> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions');

    if (filters.search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.username ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.status) {
      queryBuilder.andWhere('user.status = :status', {
        status: filters.status,
      });
    }
    if (filters.role) {
      queryBuilder.andWhere('roles.name = :role', { role: filters.role });
    }
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUserStats(): Promise<UserStats> {
    const [total, active, inactive, suspended, pendingVerification] =
      await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
        this.userRepository.count({ where: { status: UserStatus.INACTIVE } }),
        this.userRepository.count({ where: { status: UserStatus.SUSPENDED } }),
        this.userRepository.count({
          where: { status: UserStatus.PENDING_VERIFICATION },
        }),
      ]);

    const byRole = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'roles')
      .select('roles.name', 'role')
      .addSelect('COUNT(user.id)', 'count')
      .groupBy('roles.name')
      .getRawMany();

    return {
      total,
      active,
      inactive,
      suspended,
      pendingVerification,
      byRole: byRole.map((item) => ({
        role: item.role,
        count: parseInt(item.count),
      })),
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserStatus(
    id: string,
    updateStatusDto: UpdateUserStatusDto,
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(id, { status: updateStatusDto.status });

    const updatedUser = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    return updatedUser;
  }

  async updateUserRoles(
    id: string,
    updateRolesDto: UpdateUserRolesDto,
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate that all role IDs exist
    const roles = await this.roleRepository.findByIds(updateRolesDto.roleIds);
    if (roles.length !== updateRolesDto.roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid');
    }

    // Update user roles
    user.roles = roles;
    await this.userRepository.save(user);

    const updatedUser = await this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });

    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by setting status to inactive
    await this.userRepository.update(id, { status: UserStatus.INACTIVE });
  }

  async getUserSessions(id: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // This would require implementing session repository methods
    // For now, return a placeholder
    return {
      sessions: [],
      message: 'Session management not yet implemented',
    };
  }

  async revokeAllUserSessions(id: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // This would require implementing session repository methods
    // For now, return a placeholder
    return {
      message: 'Session revocation not yet implemented',
    };
  }
}
