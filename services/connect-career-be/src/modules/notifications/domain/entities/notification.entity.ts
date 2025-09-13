import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum NotificationChannel {
    EMAIL = 'email',
    SMS = 'sms',
    WEBSOCKET = 'websocket',
}

export enum NotificationStatus {
    SCHEDULED = 'scheduled',
    SENT = 'sent',
    FAILED = 'failed',
}

@Entity('notifications')
export class NotificationEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column()
    message: string;

    @Column()
    recipient: string;

    @Column({
        type: 'enum',
        enum: NotificationChannel,
    })
    channel: NotificationChannel;

    @Column({
        type: 'enum',
        enum: NotificationStatus,
        default: NotificationStatus.SENT,
    })
    status: NotificationStatus;

    @Column({ type: 'timestamp', nullable: true })
    scheduledAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}