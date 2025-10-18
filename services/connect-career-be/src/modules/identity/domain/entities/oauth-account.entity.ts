import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
  LINKEDIN = 'linkedin',
}

@Entity('oauth_accounts')
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    enumName: 'auth_provider',
  })
  provider: AuthProvider;

  @Column()
  providerAccountId: string;

  @Column({ type: 'text', nullable: true })
  accessToken?: string;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  accessTokenExpires?: Date;

  @Column({ nullable: true })
  scope?: string;

  @Column({ type: 'jsonb', nullable: true })
  providerData?: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.oauthAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Domain methods
  get isTokenExpired(): boolean {
    return this.accessTokenExpires
      ? this.accessTokenExpires < new Date()
      : false;
  }

  updateTokens(
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number,
  ): void {
    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    if (expiresIn) {
      this.accessTokenExpires = new Date(Date.now() + expiresIn * 1000);
    }
  }

  deactivate(): void {
    this.isActive = false;
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.accessTokenExpires = undefined;
  }

  activate(): void {
    this.isActive = true;
  }

  isExpired(): boolean {
    return this.accessTokenExpires
      ? new Date() >= this.accessTokenExpires
      : false;
  }
}
