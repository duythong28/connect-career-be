import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MfaDevice, MfaDeviceStatus } from '../../domain/entities';
import { IMfaDeviceRepository } from '../../domain/repository/identity.repository';

@Injectable()
export class MfaDeviceRepository implements IMfaDeviceRepository {
  constructor(
    @InjectRepository(MfaDevice)
    private readonly repository: Repository<MfaDevice>,
  ) {}

  async findById(id: string): Promise<MfaDevice | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<MfaDevice[]> {
    return this.repository.find({ where: { userId } });
  }

  async findActiveByUserId(userId: string): Promise<MfaDevice[]> {
    return this.repository.find({
      where: {
        userId,
        status: MfaDeviceStatus.ACTIVE
      }
    });
  }

  async findPrimaryByUserId(userId: string): Promise<MfaDevice | null> {
    return this.repository.findOne({
      where: {
        userId,
        isPrimary: true,
        status: MfaDeviceStatus.ACTIVE
      }
    });
  }

  async create(device: Partial<MfaDevice>): Promise<MfaDevice> {
    const entity = this.repository.create(device);
    return this.repository.save(entity);
  }

  async update(id: string, updates: Partial<MfaDevice>): Promise<MfaDevice> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('MFA device not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }
}
