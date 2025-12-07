import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agent_executions')
export class AgentExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  sessionId: string;

  @Column()
  agentName: string;

  @Column({ nullable: true })
  intent?: string;

  @Column('text')
  task: string;

  @Column('jsonb', { nullable: true })
  entities?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  result?: any;

  @Column({ default: false })
  success: boolean;

  @Column('int', { nullable: true })
  executionTime?: number;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
