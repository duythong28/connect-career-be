import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../domain/entities';
import { IRoleRepository } from '../../domain/repository/identity.repository';

@Injectable()
export class RoleRepository implements IRoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repository: Repository<Role>,
  ) {}

  async findById(id: string): Promise<Role | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findAll(): Promise<Role[]> {
    return this.repository.find();
  }

  async findActive(): Promise<Role[]> {
    return this.repository.find({ where: { isActive: true } });
  }

  async create(role: Partial<Role>): Promise<Role> {
    const entity = this.repository.create(role);
    return this.repository.save(entity);
  }

  async update(id: string, updates: Partial<Role>): Promise<Role> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Role not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findWithPermissions(id: string): Promise<Role | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['permissions']
    });
  }

  async findByUserId(userId: string): Promise<Role[]> {
    return this.repository
      .createQueryBuilder('role')
      .innerJoin('role.users', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  }
}
