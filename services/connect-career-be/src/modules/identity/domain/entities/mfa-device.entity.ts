import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import * as crypto from 'crypto';

export enum MfaDeviceType {
  TOTP = 'totp', // Time-based One-Time Password (Google Authenticator, Authy)
  SMS = 'sms',
  EMAIL = 'email',
  HARDWARE_TOKEN = 'hardware_token',
  BACKUP_CODES = 'backup_codes'
}

export enum MfaDeviceStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  DISABLED = 'disabled'
}

@Entity('mfa_devices')
export class MfaDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: MfaDeviceType
  })
  type: MfaDeviceType;

  @Column({
    type: 'enum',
    enum: MfaDeviceStatus,
    default: MfaDeviceStatus.PENDING
  })
  status: MfaDeviceStatus;

  @Column({ nullable: true })
  name?: string; // User-friendly name for the device

  @Column({ nullable: true })
  secret?: string; // For TOTP devices

  @Column({ nullable: true })
  phoneNumber?: string; // For SMS devices

  @Column({ nullable: true })
  email?: string; // For email devices

  @Column({ nullable: true })
  serialNumber?: string; // For hardware tokens

  @Column('simple-array', { nullable: true })
  backupCodes?: string[];

  @Column({ nullable: true })
  verifiedAt?: Date;

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, user => user.mfaDevices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Computed properties
  get isActive(): boolean {
    return this.status === MfaDeviceStatus.ACTIVE;
  }

  get isPending(): boolean {
    return this.status === MfaDeviceStatus.PENDING;
  }

  // Methods
  activate(): void {
    this.status = MfaDeviceStatus.ACTIVE;
    this.verifiedAt = new Date();
  }

  disable(): void {
    this.status = MfaDeviceStatus.DISABLED;
  }

  recordUsage(): void {
    this.lastUsedAt = new Date();
    this.usageCount += 1;
  }

  generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    this.backupCodes = codes;
    return codes;
  }

  useBackupCode(code: string): boolean {
    if (!this.backupCodes || this.backupCodes.length === 0) {
      return false;
    }

    const codeIndex = this.backupCodes.indexOf(code.toUpperCase());
    if (codeIndex === -1) {
      return false;
    }

    // Remove the used backup code
    this.backupCodes.splice(codeIndex, 1);
    this.recordUsage();
    return true;
  }

  setPrimary(): void {
    this.isPrimary = true;
  }

  removePrimary(): void {
    this.isPrimary = false;
  }
}
