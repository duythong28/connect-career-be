import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { IRepository } from '../interfaces/repository.interface';
import { Entity } from './entity.base';
import { EventBus } from '@nestjs/cqrs';

/**
 * Base implementation of Unit of Work pattern
 */
@Injectable()
export abstract class BaseUnitOfWork {
  protected readonly _repositories: Map<string, IRepository<any, any>> =
    new Map();
  protected readonly _queryRunner: QueryRunner;
  protected readonly eventBus?: EventBus;
  private _hasActiveTransaction = false;

  protected constructor(
    protected readonly dataSource: DataSource,
    eventBus?: EventBus,
  ) {
    this._queryRunner = dataSource.createQueryRunner();
    this.eventBus = eventBus;
  }

  /**
   * Get query runner instance
   */
  protected get queryRunner(): QueryRunner {
    return this._queryRunner;
  }

  /**
   * Check if there is an active transaction
   */
  public get hasActiveTransaction(): boolean {
    return this._hasActiveTransaction;
  }

  /**
   * Begin a new transaction
   */
  public async beginTransaction(): Promise<void> {
    if (this._hasActiveTransaction) {
      return;
    }

    await this.queryRunner.startTransaction();
    this._hasActiveTransaction = true;
  }

  /**
   * Begin a new transaction (alias for beginTransaction)
   */
  public async begin(): Promise<void> {
    return this.beginTransaction();
  }

  /**
   * Execute a function within a transaction
   * @param action - Function to execute within transaction
   */
  public async executeInTransaction<T>(action: () => Promise<T>): Promise<T> {
    const needsTransaction = !this._hasActiveTransaction;

    if (needsTransaction) {
      await this.beginTransaction();
    }

    try {
      const result = await action();

      if (needsTransaction) {
        await this.commit();
      }

      return result;
    } catch (error) {
      if (needsTransaction) {
        await this.rollback();
      }
      throw error;
    }
  }

  /**
   * Process domain events before committing transaction
   */
  private async processBeforeCommitEvents(): Promise<void> {
    if (!this.eventBus) return;

    // Get all tracked entities from repositories
    const trackedEntities = Array.from(this._repositories.values()).flatMap(
      (repo) => repo.getTrackedEntities(),
    );

    // Process before-commit events
    for (const entity of trackedEntities) {
      const events = entity.getBeforeCommitEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      entity.clearBeforeCommitEvents();
    }
  }

  /**
   * Process domain events after committing transaction
   */
  private async processAfterCommitEvents(): Promise<void> {
    if (!this.eventBus) return;

    // Get all tracked entities from repositories
    const trackedEntities = Array.from(this._repositories.values()).flatMap(
      (repo) => repo.getTrackedEntities(),
    );

    // Process domain events
    for (const entity of trackedEntities) {
      const events = entity.getDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      entity.clearDomainEvents();
    }
  }

  /**
   * Commit the current transaction
   */
  public async commit(): Promise<void> {
    if (!this._hasActiveTransaction) {
      return;
    }

    try {
      // Process before-commit events
      await this.processBeforeCommitEvents();

      // Commit transaction
      await this.queryRunner.commitTransaction();
      this._hasActiveTransaction = false;

      // Process after-commit events
      await this.processAfterCommitEvents();
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Rollback the current transaction
   */
  public async rollback(): Promise<void> {
    if (!this._hasActiveTransaction) {
      return;
    }

    await this.queryRunner.rollbackTransaction();
    this._hasActiveTransaction = false;

    // Clear all events since transaction was rolled back
    const trackedEntities = Array.from(this._repositories.values()).flatMap(
      (repo) => repo.getTrackedEntities(),
    );

    for (const entity of trackedEntities) {
      entity.clearBeforeCommitEvents();
      entity.clearDomainEvents();
    }
  }

  /**
   * Dispose the current transaction
   */
  public disposeCurrentTransaction(): void {
    this._hasActiveTransaction = false;
  }

  /**
   * Release all resources
   */
  public async release(): Promise<void> {
    await this.queryRunner.release();
  }

  /**
   * Get a repository for the specified entity type
   * @template T - Entity type
   * @template TKey - Primary key type
   * @param entityType - Entity class to get repository for
   */
  public getRepository<T extends Entity<TKey>, TKey>(
    entityType: new (...args: any[]) => T,
  ): IRepository<T, TKey> {
    const entityName = entityType.name;

    if (!this._repositories.has(entityName)) {
      const repository = this.createRepository<T, TKey>(entityType);
      this._repositories.set(entityName, repository);
    }

    return this._repositories.get(entityName) as IRepository<T, TKey>;
  }

  /**
   * Create a repository for the specified entity type
   * @template T - Entity type
   * @template TKey - Primary key type
   * @param entityType - Entity class to create repository for
   */
  protected abstract createRepository<T extends Entity<TKey>, TKey>(
    entityType: new (...args: any[]) => T,
  ): IRepository<T, TKey>;
}
