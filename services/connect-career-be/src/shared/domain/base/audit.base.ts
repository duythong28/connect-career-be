import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Base class for audit fields
 * Provides common audit functionality including:
 * - Created/Updated/Deleted timestamps
 * - Created/Updated/Deleted user tracking
 * - Soft delete flag
 */
export abstract class AuditBase {
  @Column({ nullable: true })
  createdBy?: string;

  @Column({ nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deletedBy?: string;

  @Column({ nullable: true })
  deletedAt?: Date;

  @Column({ default: false })
  isDeleted: boolean;
}
