import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agent_interviewers')
@Index(['userId'])
@Index(['retellAgentId'])
export class AgentInterviewer {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column('varchar')
  retellAgentId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int', default: 7 })
  rapport: number;

  @Column({ type: 'int', default: 10 })
  exploration: number;

  @Column({ type: 'int', default: 7 })
  empathy: number;

  @Column({ type: 'int', default: 5 })
  speed: number;

  @Column({ type: 'varchar', nullable: true })
  image?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  audio?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
