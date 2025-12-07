import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('agent_logs')
export class AgentLogEntity {
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

  @Column('jsonb')
  result: any;

  @Column('int')
  executionTime: number;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}
