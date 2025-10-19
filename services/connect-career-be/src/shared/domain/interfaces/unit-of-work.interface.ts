import { IRepository } from './repository.interface';
import { Entity } from '../base/entity.base';
import { QueryRunner } from 'typeorm';
import { ChangeType } from '../base/change-set';
import { IDomainEvent } from './domain-event.interface';

/**
 * Interface for managing database transactions and repositories
 */
export interface IUnitOfWork {
  /**
   * Get the current QueryRunner instance
   */
  readonly queryRunner: QueryRunner;

  /**
   * Indicates whether there is an active transaction
   */
  readonly hasActiveTransaction: boolean;

  /**
   * Begin a new transaction
   */
  beginTransaction(
    isolationLevel?:
      | 'READ UNCOMMITTED'
      | 'READ COMMITTED'
      | 'REPEATABLE READ'
      | 'SERIALIZABLE',
  ): Promise<void>;

  /**
   * Commit the current transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback the current transaction
   */
  rollback(): Promise<void>;

  /**
   * Release the query runner resources
   */
  release(): Promise<void>;

  /**
   * Get a repository for a specific entity type
   * @template T - The type of entity
   * @template TKey - The type of the entity's primary key
   * @param entityType - The entity class
   */
  getRepository<T extends Entity<TKey>, TKey = string>(
    entityType: new (...args: any[]) => T,
  ): IRepository<T, TKey>;

  /**
   * Track entity changes for batch processing
   * @param entity - Entity to track
   * @param type - Type of change
   */
  trackChange<T extends Entity<any>>(entity: T, type: ChangeType): void;

  /**
   * Add a domain event to be processed before commit
   * @param event - Event to process before commit
   */
  addBeforeCommitEvent(event: IDomainEvent): void;

  /**
   * Add a domain event to be processed after successful commit
   * @param event - Event to process after commit
   */
  addDomainEvent(event: IDomainEvent): void;
}
