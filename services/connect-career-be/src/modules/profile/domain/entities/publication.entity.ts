import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CandidateProfile } from './candidate-profile.entity';

export enum PublicationType {
  JOURNAL_ARTICLE = 'journal_article',
  CONFERENCE_PAPER = 'conference_paper',
  BOOK = 'book',
  BOOK_CHAPTER = 'book_chapter',
  THESIS = 'thesis',
  BLOG_POST = 'blog_post',
  WHITE_PAPER = 'white_paper',
  OTHER = 'other',
}

@Entity('publications')
@Index(['candidateProfileId'])
@Index(['publicationDate'])
@Index(['publicationType'])
export class Publication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CandidateProfile, (profile) => profile.publications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidateProfileId' })
  candidateProfile: CandidateProfile;

  @Column('uuid')
  candidateProfileId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({
    type: 'enum',
    enum: PublicationType,
  })
  publicationType: PublicationType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publisher?: string;

  @Column({ type: 'date', nullable: true })
  publicationDate?: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url?: string;

  @Column('text', { array: true, default: [] })
  authors: string[];

  @Column('text', { array: true, default: [] })
  keywords: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
