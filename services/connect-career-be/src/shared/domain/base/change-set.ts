import { Entity } from './entity.base';

/**
 * Represents the type of change for an entity
 */
export enum ChangeType {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
}

/**
 * Represents a tracked change in the Unit of Work
 */
export class ChangeSet<T extends Entity<any>> {
    constructor(
        public readonly entity: T,
        public readonly type: ChangeType,
    ) {}
}
