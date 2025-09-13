import { User } from "src/modules/identity/domain/entities";
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";

export enum FileStatus {
    UPLOADING = 'uploading',
    UPLOADED = 'uploaded',
    PROCESSING = 'processing',
    READY = 'ready',
    FAILED = 'failed',
    DELETED = 'deleted',
}

export enum FileType {
    IMAGE = 'image',
    VIDEO = 'video',
    DOCUMENT = 'document',
    AUDIO = 'audio',
    OTHER = 'other',
}

@Entity('files')
export class File {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({unique: true})
    publicId: string; 

    @Column()
    originalName: string;

    @Column()
    fileName: string;

    @Column()
    mimeType: string;

    @Column()
    fileSize: number;

    @Column({nullable: true})
    width?: number;

    @Column({nullable: true})
    height?: number;

    @Column()
    url: string;

    @Column()
    secureUrl: string;

    @Column({nullable: true})
    thumbnailUrl?: string;

    @Column({
        type: 'enum',
        enum: FileStatus,
        default: FileStatus.UPLOADING,
    })
    status: FileStatus;

    @Column({
        type: 'enum',
        enum: FileType,
    })
    type: FileType; 

    @Column({nullable: true})
    folder?: string;

    @Column({type: 'json', nullable: true})
    metadata?: Record<string, any>;

    @Column({type: 'json', nullable: true})
    transformations?: Record<string, any>;

    @Column({type: 'text', array: true, default: []})
    tags: string[];

    @Column({nullable: true})
    description?: string;

    @Column({type: 'timestamp', nullable: true})
    expiresAt?: Date;

    @Column({default: false})
    isPublic: boolean;

    @Column({default: false})
    isDeleted: boolean;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'uploadedBy' })
    uploadedBy?: User;

    @Column({nullable: true})
    uploadedById?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({type: 'timestamp', nullable: true})
    deletedAt?: Date;
}