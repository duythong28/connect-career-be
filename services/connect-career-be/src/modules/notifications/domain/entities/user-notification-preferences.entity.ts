import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('user_notification_preferences')
@Index(['userId'], { unique: true })
export class UserNotificationPreferences {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid', { unique: true })
    userId: string;

    @Column('jsonb', { default: {} })
    preferences: {
        email: {
            enabled: boolean;
            types: string[];
            frequency: 'realtime' | 'digest' | 'daily' | 'weekly';
        };
        push: {
            enabled: boolean;
            types: string[];
        };
        sms: {
            enabled: boolean;
            types: string[];
            phoneNumber: string | null;
        };
        inApp: {
            enabled: boolean;
            markAsRead: boolean;
        };
    };

    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
}