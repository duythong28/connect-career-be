import { AggregateRoot } from '@nestjs/cqrs';
import { Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn} from 'typeorm';
import { v7 } from 'uuid';
import { IDomainEvent } from '../interfaces/domain-event.interface';

/**
 * Base class for aggregate entities in the domain
 * Combines NestJS CQRS AggregateRoot with our Entity base class
 * @template TKey - Primary key type
 */
export abstract class AggregateEntity<TKey> extends AggregateRoot {
    @Column('uuid', { primary: true })
    public readonly id: TKey;

    @Column('uuid', { nullable: true })
    public readonly createdBy?: string;

    @Column('uuid', { nullable: true })
    public readonly updatedBy?: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', nullable: true })
    @CreateDateColumn()
    public readonly createdAt?: Date;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    @UpdateDateColumn()
    public readonly updatedAt?: Date;

    @DeleteDateColumn({
        type: 'timestamptz',
        default: null,
        nullable: true
    })
    deletedAt?: Date;
    
    @Column({
        type: 'boolean',
        default: false
    })
    public readonly isDeleted: boolean = false;

    private _domainEvents: IDomainEvent[] = [];
    private _beforeCommitEvents: IDomainEvent[] = [];

    /**
     * Create a new aggregate entity
     */
    public constructor() {
        super();
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
        this.apply(event);
    }

    /**
     * Add a domain event to be published before commit
     * @param event - Domain event to add
     */
    public addBeforeCommitEvent(event: IDomainEvent): void {
        this._beforeCommitEvents.push(event);
        this.apply(event);
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
        this._domainEvents = [];
        this.commit();
    }

    /**
     * Clear all before-commit events
     */
    public clearBeforeCommitEvents(): void {
        this._beforeCommitEvents = [];
    }

    /**
     * Mark entity as soft deleted
     * Sets isDeleted to true and deletedAt to current date
     */
    public softDelete(): void {
        // Use type assertion to modify readonly properties
        const self = this as any;
        self.isDeleted = true;
        self.deletedAt = new Date();
    }

    /**
     * Check if this entity equals another
     * @param other - Entity to compare with
     */
    public equals(other: AggregateEntity<TKey>): boolean {
        if (!other) return false;
        if (!(other instanceof AggregateEntity)) return false;
        return other.id === this.id;
    }
}
