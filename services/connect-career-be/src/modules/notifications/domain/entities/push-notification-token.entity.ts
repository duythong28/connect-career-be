import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('push_notification_tokens')
@Index(['userId', 'isActive'])
export class PushNotificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column()
  token: string; //FCM Token'

  @Column({
    type: 'enum',
    enum: ['fcm', 'apns', 'web'],
    default: 'fcm',
  })
  platform: 'fcm' | 'apns' | 'web';

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  deviceId?: string;

  @Column({ nullable: true })
  deviceName?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
