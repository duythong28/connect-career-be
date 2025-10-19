import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IDomainEvent } from '../interfaces/domain-event.interface';
import { v7 } from 'uuid';

export abstract class Entity<TKey = string> {
  @Column('uuid', { primary: true })
  public id: TKey;
  @Column('uuid', { nullable: true })
  public readonly createdBy?: string;
  @Column('uuid', { nullable: true })
  public readonly updatedBy?: string;
  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  @CreateDateColumn()
  public readonly createdAt?: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  @UpdateDateColumn()
  public readonly updatedAt?: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
    nullable: true,
  })
  private deletedAt?: Date;

  @Column({
    type: 'boolean',
    default: false,
  })
  private isDeleted?: boolean = false;

  private readonly _domainEvents: IDomainEvent[] = [];
  private readonly _beforeCommitEvents: IDomainEvent[] = [];

  public constructor() {
    this.id = v7() as unknown as TKey;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Add a domain event to be published after commit
   * @param event - Domain event to add
   */
  public addDomainEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Add a domain event to be published before commit
   * @param event - Domain event to add
   */
  protected addBeforeCommitEvent(event: IDomainEvent): void {
    this._beforeCommitEvents.push(event);
  }

  /**
   * Get all domain events
   */
  public getDomainEvents(): IDomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Get all before-commit events
   */
  public getBeforeCommitEvents(): IDomainEvent[] {
    return [...this._beforeCommitEvents];
  }

  /**
   * Clear all domain events
   */
  public clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }
  /**
   * Clear all before-commit events
   */
  public clearBeforeCommitEvents(): void {
    this._beforeCommitEvents.length = 0;
  }

  /**
   * Mark entity as soft deleted
   * Sets isDeleted to true and deletedAt to current date
   */
  public softDelete(): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
  }

  /**
   * Check if this entity equals another
   * @param other - Entity to compare with
   */
  public equals(other: Entity<TKey>): boolean {
    if (!other) return false;
    if (!(other instanceof Entity)) return false;
    return other.id === this.id;
  }
  public setId(id: TKey): void {
    if (id) {
      this.id = id;
    }
  }
}

/**
 * Base aggregate entity class
 * @template TKey - Primary key type
 */
export abstract class AggregateEntity<TKey> extends Entity<TKey> {
  protected constructor() {
    super();
  }
}
