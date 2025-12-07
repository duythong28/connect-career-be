import { User } from 'src/modules/identity/domain/entities';
import { File } from 'src/shared/infrastructure/external-services/file-system/domain/entities/file.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CVStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum CVType {
  PDF = 'pdf',
  WORD = 'word',
  HTML = 'html',
  JSON = 'json',
}

export enum CVSource {
  UPLOADED = 'uploaded',
  BUILDER = 'builder',
  TEMPLATE = 'template',
}

export enum ParsingStatus {
  PENDING = 'pending',
  PARSING = 'parsing',
  PARSED = 'parsed',
  FAILED = 'failed',
  NOT_REQUIRED = 'not_required',
}

@Entity('cvs')
@Index(['userId', 'status'])
@Index(['isPublic', 'status'])
export class CV {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CVStatus,
    default: CVStatus.DRAFT,
  })
  status: CVStatus;

  @Column({
    type: 'enum',
    enum: CVType,
  })
  type: CVType;

  @Column({
    type: 'enum',
    enum: ParsingStatus,
    default: ParsingStatus.PENDING,
  })
  parsingStatus: ParsingStatus;

  @Column({ nullable: true })
  templateId?: string;

  @Column({ type: 'jsonb', nullable: true })
  templateData?: {
    name: string;
    category: string;
    preview_url: string;
    config: Record<string, any>;
  };

  @Column({ nullable: true })
  fileName?: string;

  @Column({ type: 'jsonb', nullable: true })
  content?: {
    personalInfo?: {
      name?: string;
      title?: string;
      email?: string;
      phone?: string;
      address?: string;
      linkedin?: string;
      github?: string;
      website?: string;
      avatar?: string;
    };
    summary?: string;
    workExperience?: Array<{
      id: string;
      company: string;
      position: string;
      startDate: string;
      endDate?: string;
      current: boolean;
      description: string;
      technologies?: string[];
      achievements?: string[];
    }>;
    education?: Array<{
      id: string;
      institution: string;
      degree: string;
      fieldOfStudy: string;
      startDate: string;
      endDate?: string;
      gpa?: number;
      honors?: string[];
    }>;
    skills?: {
      technical: string[];
      soft: string[];
      languages: Array<{
        language: string;
        proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native';
      }>;
    };
    certifications?: Array<{
      id: string;
      name: string;
      issuer: string;
      issueDate: string;
      expiryDate?: string;
      credentialId?: string;
      url?: string;
    }>;
    projects?: Array<{
      id: string;
      name: string;
      description: string;
      startDate: string;
      endDate?: string;
      technologies: string[];
      url?: string;
      github?: string;
    }>;
    customSections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
    [key: string]: any;
  };
  @Column({ type: 'text', nullable: true })
  extractedText?: string;

  @Column({ type: 'jsonb', nullable: true })
  builderData?: {
    version: string;
    theme: string;
    layout: string;
    colors: Record<string, string>;
    fonts: Record<string, string>;
    sections: string[];
    customizations: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ default: false })
  isPublic: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => File, { nullable: true })
  @JoinColumn({ name: 'fileId' })
  file?: File;

  @Column({ nullable: true })
  fileId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  parsedAt?: Date;

  get isDeleted(): boolean {
    return !!this.deletedAt;
  }

  get downloadUrl(): string {
    return this.file?.secureUrl || '';
  }

  get isParsed(): boolean {
    return this.parsingStatus === ParsingStatus.PARSED;
  }
}
