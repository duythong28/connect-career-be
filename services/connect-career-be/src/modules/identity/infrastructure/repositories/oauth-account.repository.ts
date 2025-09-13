import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthAccount } from '../../domain/entities';
import { IOAuthAccountRepository } from '../../domain/repository/identity.repository';

@Injectable()
export class OAuthAccountRepository implements IOAuthAccountRepository {
  constructor(
    @InjectRepository(OAuthAccount)
    private readonly repository: Repository<OAuthAccount>,
  ) {}

  async findById(id: string): Promise<OAuthAccount | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByProviderAndAccountId(provider: string, providerAccountId: string): Promise<OAuthAccount | null> {
    return this.repository.findOne({
      where: {
        provider: provider as any,
        providerAccountId
      }
    });
  }

  async findByUserId(userId: string): Promise<OAuthAccount[]> {
    return this.repository.find({ where: { userId } });
  }

  async findActiveByUserId(userId: string): Promise<OAuthAccount[]> {
    return this.repository.find({
      where: {
        userId,
        isActive: true
      }
    });
  }

  async create(account: Partial<OAuthAccount>): Promise<OAuthAccount> {
    const entity = this.repository.create(account);
    return this.repository.save(entity);
  }

  async update(id: string, updates: Partial<OAuthAccount>): Promise<OAuthAccount> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('OAuth account not found after update');
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
