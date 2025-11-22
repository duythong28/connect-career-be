import {
    Injectable,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { User, UserStatus } from 'src/modules/identity/domain/entities/user.entity';
  import { Role } from 'src/modules/identity/domain/entities/role.entity';
  import {
    UserListQueryDto,
    UpdateUserDto,
    UpdateUserStatusDto,
  } from '../dtos/user-management.dto';
  
  @Injectable()
  export class UserManagementService {
    constructor(
      @InjectRepository(User)
      private readonly userRepository: Repository<User>,
      @InjectRepository(Role)
      private readonly roleRepository: Repository<Role>,
    ) {}
  
    async getUsers(query: UserListQueryDto) {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;
  
      const queryBuilder = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'roles')
        .leftJoinAndSelect('roles.permissions', 'permissions');
  
      if (query.search) {
        queryBuilder.andWhere(
          '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.fullName ILIKE :search OR user.username ILIKE :search)',
          { search: `%${query.search}%` },
        );
      }
  
      if (query.status) {
        queryBuilder.andWhere('user.status = :status', { status: query.status });
      }
  
      if (query.emailVerified !== undefined) {
        queryBuilder.andWhere('user.emailVerified = :emailVerified', {
          emailVerified: query.emailVerified,
        });
      }
  
      if (query.roleId) {
        queryBuilder.andWhere('roles.id = :roleId', { roleId: query.roleId });
      }
  
      const [data, total] = await queryBuilder
        .orderBy('user.createdAt', 'DESC')
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
  
    async getUserById(userId: string): Promise<User> {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles', 'roles.permissions'],
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      return user;
    }
  
    async updateUser(
      userId: string,
      updateDto: UpdateUserDto,
      adminId: string,
    ): Promise<User> {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      // Prevent updating admin users
      if (user.hasRole('super_admin') || user.hasRole('admin')) {
        throw new BadRequestException('Cannot update admin users');
      }
  
      if (updateDto.email && updateDto.email !== user.email) {
        // Check if email already exists
        const existingUser = await this.userRepository.findOne({
          where: { email: updateDto.email },
        });
        if (existingUser && existingUser.id !== userId) {
          throw new BadRequestException('Email already exists');
        }
        user.email = updateDto.email;
        // If email is changed, mark as unverified
        if (updateDto.emailVerified === undefined) {
          user.emailVerified = false;
        }
      }
  
      if (updateDto.firstName !== undefined) {
        user.firstName = updateDto.firstName;
        // Update fullName if lastName exists
        if (user.lastName) {
          user.fullName = `${updateDto.firstName} ${user.lastName}`.trim();
        } else {
          user.fullName = updateDto.firstName;
        }
      }
  
      if (updateDto.lastName !== undefined) {
        user.lastName = updateDto.lastName;
        // Update fullName if firstName exists
        if (user.firstName) {
          user.fullName = `${user.firstName} ${updateDto.lastName}`.trim();
        } else {
          user.fullName = updateDto.lastName;
        }
      }
  
      if (updateDto.phoneNumber !== undefined) {
        user.phoneNumber = updateDto.phoneNumber;
      }
  
      if (updateDto.status !== undefined) {
        user.status = updateDto.status;
      }
  
      if (updateDto.emailVerified !== undefined) {
        user.emailVerified = updateDto.emailVerified;
      }
  
      await this.userRepository.save(user);
  
      // Return with relations
      return this.getUserById(userId);
    }
  
    async updateUserStatus(
      userId: string,
      updateDto: UpdateUserStatusDto,
      adminId: string,
    ): Promise<User> {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      // Prevent updating admin users
      if (user.hasRole('super_admin') || user.hasRole('admin')) {
        throw new BadRequestException('Cannot update admin user status');
      }
  
      user.status = updateDto.status;
      await this.userRepository.save(user);
  
      // Return with relations
      return this.getUserById(userId);
    }
  
    async deleteUser(userId: string, adminId: string): Promise<void> {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      // Prevent deleting admin users
      if (user.hasRole('super_admin') || user.hasRole('admin')) {
        throw new BadRequestException('Cannot delete admin users');
      }
  
      // Soft delete by setting status to INACTIVE
      user.status = UserStatus.INACTIVE;
      await this.userRepository.save(user);
    }
  }