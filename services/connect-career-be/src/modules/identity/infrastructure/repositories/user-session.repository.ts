import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserSession, SessionStatus } from '../../domain/entities';
import { IUserSessionRepository } from '../../domain/repository/identity.repository';

@Injectable()
export class UserSessionRepository implements IUserSessionRepository {
  constructor(
    @InjectRepository(UserSession)
    private readonly repository: Repository<UserSession>,
  ) {}

  async findById(id: string): Promise<UserSession | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    return this.repository.findOne({ where: { refreshToken } });
  }

  async findByAccessTokenJti(jti: string): Promise<UserSession | null> {
    return this.repository.findOne({ where: { accessTokenJti: jti } });
  }

  async findActiveByUserId(userId: string): Promise<UserSession[]> {
    return this.repository.find({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        expiresAt: LessThan(new Date())
      }
    });
  }

  async create(session: Partial<UserSession>): Promise<UserSession> {
    const entity = this.repository.create(session);
    return this.repository.save(entity);
  }

  async update(id: string, updates: Partial<UserSession>): Promise<UserSession> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Session not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  async deleteExpired(): Promise<void> {
    await this.repository.delete({
      expiresAt: LessThan(new Date())
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.repository.update(
      { userId },
      { status: SessionStatus.REVOKED }
    );
  }
}
