import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from 'src/modules/identity/domain/entities';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryColumn('uuid')
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'jsonb', nullable: true })
  values?: string[];

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  industriesLike: string[];

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  industriesDislike: string[];

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  skillsLike: string[];

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  skillsDislike: string[];

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  preferredRoleTypes: string[];

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  preferredLocations: string[];

  @Column({ type: 'varchar', nullable: true })
  preferredCompanySize?: string;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  hiddenCompanyIds: string[];
}
