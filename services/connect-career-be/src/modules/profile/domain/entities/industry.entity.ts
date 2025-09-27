import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('industries')
@Index(['parentId'])
@Index(['name'])
export class Industry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { default: 0 })
  sortOrder: number;

  @ManyToOne(() => Industry, (industry) => industry.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Industry;

  @Column('uuid', { nullable: true })
  parentId?: string;
  @OneToMany(() => Industry, (industry) => industry.parent)
  children: Industry[];

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('text', { array: true, default: [] })
  keywords: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  get isParent(): boolean {
    return !this.parentId;
  }

  get isChild(): boolean {
    return !!this.parentId;
  }

  get fullName(): string {
    return this.parent ? `${this.parent.name} - ${this.name}` : this.name;
  }
}
