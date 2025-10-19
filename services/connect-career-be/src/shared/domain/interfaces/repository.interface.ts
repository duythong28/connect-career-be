import { Entity } from '../base/entity.base';

/**
 * Generic repository interface for domain entities
 * @template T - The type of entity this repository handles
 * @template TKey - The type of the entity's primary key
 */
export interface IRepository<T extends Entity<TKey>, TKey = string> {
  /**
   * Find an entity by its id
   * @param id - The id of the entity to find
   */
  findById(id: TKey): Promise<T | null>;

  /**
   * Find entities by their ids
   * @param ids - Array of entity ids to find
   */
  findByIds(ids: TKey[]): Promise<T[]>;

  /**
   * Find all entities
   */
  findAll(): Promise<T[]>;

  /**
   * Create a new entity
   * @param entity - The entity to create
   */
  create(entity: T): Promise<T>;

  /**
   * Update an existing entity
   * @param entity - The entity to update
   */
  update(entity: T): Promise<T>;

  /**
   * Save an entity (create or update)
   * @param entity - Entity to save
   */
  save(entity: T): Promise<T>;

  /**
   * Delete an entity
   * @param entity - The entity to delete
   */
  delete(entity: T): Promise<void>;

  /**
   * Delete an entity by its id
   * @param id - The id of the entity to delete
   */
  deleteById(id: TKey): Promise<void>;

  /**
   * Save multiple entities
   * @param entities - Array of entities to save
   */
  saveMany(entities: T[]): Promise<void>;

  /**
   * Get all tracked entities
   */
  getTrackedEntities(): T[];
}
