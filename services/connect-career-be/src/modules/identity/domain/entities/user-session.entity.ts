import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ unique: true })
  refreshToken: string;

  @Column({ unique: true })
  accessTokenJti: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE
  })
  status: SessionStatus;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  deviceId?: string;

  @Column({ nullable: true })
  deviceName?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ default: false })
  isMobile: boolean;

  @Column({ nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, user => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Computed properties
  get isActive(): boolean {
    return this.status === SessionStatus.ACTIVE && new Date() < this.expiresAt;
  }

  get isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  // Methods
  revoke(): void {
    this.status = SessionStatus.REVOKED;
  }

  expire(): void {
    this.status = SessionStatus.EXPIRED;
  }

  updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  extend(minutes: number): void {
    this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  }
}
