import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../domain/entities';
import { IPermissionRepository } from '../../domain/repository/identity.repository';

@Injectable()
export class PermissionRepository implements IPermissionRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly repository: Repository<Permission>,
  ) {}

  async findById(id: string): Promise<Permission | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findAll(): Promise<Permission[]> {
    return this.repository.find();
  }

  async findActive(): Promise<Permission[]> {
    return this.repository.find({ where: { isActive: true } });
  }

  async create(permission: Partial<Permission>): Promise<Permission> {
    const entity = this.repository.create(permission);
    return this.repository.save(entity);
  }

  async update(id: string, updates: Partial<Permission>): Promise<Permission> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Permission not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findByRoleId(roleId: string): Promise<Permission[]> {
    return this.repository
      .createQueryBuilder('permission')
      .innerJoin('permission.roles', 'role')
      .where('role.id = :roleId', { roleId })
      .getMany();
  }

  async findByUserId(userId: string): Promise<Permission[]> {
    return this.repository
      .createQueryBuilder('permission')
      .innerJoin('permission.roles', 'role')
      .innerJoin('role.users', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  }
}
