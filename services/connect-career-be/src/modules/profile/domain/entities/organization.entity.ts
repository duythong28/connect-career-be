import { User } from 'src/modules/identity/domain/entities';
import { File } from 'src/shared/infrastructure/external-services/file-system/domain/entities/file.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Industry } from './industry.entity';
import {
  InvitationStatus,
  MembershipStatus,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationRole,
} from './organization-memberships.entity';
import { OrganizationReview } from './organization-reviews.entity';

export enum OrganizationType {
  CORPORATION = 'corporation',
  LLC = 'llc',
  PARTNERSHIP = 'partnership',
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  NON_PROFIT = 'non_profit',
  GOVERNMENT = 'government',
  STARTUP = 'startup',
  AGENCY = 'agency',
  CONSULTING = 'consulting',
  FREELANCE = 'freelance',
  OTHER = 'other',
}

export enum OrganizationSize {
  STARTUP = '1-10 employees',
  SMALL = '11-50 employees',
  MEDIUM = '51-200 employees',
  LARGE = '201-1000 employees',
  ENTERPRISE = '1001+ employees',
}

export enum WorkScheduleType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  FLEXIBLE = 'flexible',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  CONTRACT = 'contract',
  SEASONAL = 'seasonal',
  OTHER = 'other',
}

export enum WorkingDay {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum OvertimePolicy {
  NO_OVERTIME = 'no_overtime',
  OCCASIONAL_OVERTIME = 'occasional_overtime',
  FREQUENT_OVERTIME = 'frequent_overtime',
  AS_NEEDED = 'as_needed',
  FLEXIBLE = 'flexible',
  OTHER = 'other',
}

@Entity('organizations')
@Index(['userId'])
@Index(['organizationType'])
@Index(['industryId'])
@Index(['country'])
@Index(['organizationSize'])
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @Column({ nullable: true })
  name?: string;

  @Column('text', { nullable: true })
  abbreviation?: string;

  @Column('text', { array: true, default: [] })
  formerNames?: string[];

  @Column({
    type: 'enum',
    enum: OrganizationType,
  })
  organizationType: OrganizationType;

  @ManyToOne(() => Industry, { nullable: true })
  @JoinColumn({ name: 'industryId' })
  industry?: Industry;

  @Column('uuid')
  industryId: string;

  @Column('text', { array: true, default: [] })
  subIndustries?: string[];

  @Column({
    type: 'enum',
    enum: OrganizationSize,
  })
  organizationSize: OrganizationSize;

  @Column('integer', { nullable: true })
  employeeCount?: number;

  @Column('varchar', { length: 100 })
  country: string;

  @Column('varchar', { length: 100, nullable: true })
  stateProvince?: string;

  @Column('varchar', { length: 100, nullable: true })
  city?: string;

  @Column('text', { nullable: true })
  headquartersAddress?: string;

  @Column('varchar', { length: 10, nullable: true })
  postalCode?: string;

  @Column('varchar', { length: 50, nullable: true })
  timezone?: string;

  @Column('text', { array: true, default: [] })
  workingDays: WorkingDay[];

  @Column('varchar', { length: 50, nullable: true })
  workingHours?: string;

  @Column({
    type: 'enum',
    enum: OvertimePolicy,
    default: OvertimePolicy.NO_OVERTIME,
  })
  overtimePolicy: OvertimePolicy;

  @Column('text', { array: true, default: [] })
  workScheduleTypes: WorkScheduleType[];

  @Column('varchar', { length: 500, nullable: true })
  tagline?: string;

  @Column('text', { nullable: true })
  shortDescription?: string;

  @Column('text', { nullable: true })
  longDescription?: string;

  @Column('text', { nullable: true })
  mission?: string;

  @Column('text', { nullable: true })
  vision?: string;

  @Column('text', { array: true, default: [] })
  coreValues: string[];

  @OneToMany(() => OrganizationReview, (review) => review.organization)
  reviews: OrganizationReview[];

  @Column('jsonb', { nullable: true })
  productsServices?: {
    primary: string[];
    secondary: string[];
    targetMarkets: string[];
    specializations: string[];
  };

  @Column('jsonb', { nullable: true })
  requiredSkills?: {
    hardSkills: string[];
    softSkills: string[];
    certifications: string[];
    languages: string[];
    experienceLevels: string[];
    educationRequirements: string[];
  };

  @Column('jsonb', { nullable: true })
  benefits?: {
    compensation: string[];
    healthWellness: string[];
    timeOff: string[];
    professionalDevelopment: string[];
    workLifeBalance: string[];
    additionalPerks: string[];
    retirementBenefits: string[];
  };

  @Column('jsonb', { nullable: true })
  culture?: {
    highlights: string[];
    workEnvironment: string[];
    teamStructure: string[];
    communicationStyle: string[];
    decisionMaking: string[];
    diversityInclusion: string[];
  };

  @ManyToOne(() => File, { nullable: true })
  @JoinColumn({ name: 'logoFileId' })
  logoFile?: File;

  @Column('uuid', { nullable: true })
  logoFileId?: string;

  @ManyToOne(() => File, { nullable: true })
  @JoinColumn({ name: 'bannerFileId' })
  bannerFile?: File;

  @Column('uuid', { nullable: true })
  bannerFileId?: string;

  @ManyToMany(() => File)
  @JoinTable({
    name: 'organization_files',
    joinColumn: { name: 'organizationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'fileId', referencedColumnName: 'id' },
  })
  files: File[];

  @Column('varchar', { length: 1000, nullable: true })
  website?: string;

  // Contact Information
  @Column('varchar', { length: 255, nullable: true })
  contactEmail?: string;

  @Column('varchar', { length: 50, nullable: true })
  contactPhone?: string;

  @Column('varchar', { length: 255, nullable: true })
  hrEmail?: string;

  @Column('varchar', { length: 50, nullable: true })
  hrPhone?: string;

  // Social Media
  @Column('jsonb', { nullable: true })
  socialMedia?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    glassdoor?: string;
    indeed?: string;
    others?: string[];
  };

  // Business Information
  @Column('varchar', { length: 100, nullable: true })
  registrationNumber?: string;

  @Column('varchar', { length: 100, nullable: true })
  taxId?: string;

  @Column('date', { nullable: true })
  foundedDate?: Date;

  @Column('varchar', { length: 100, nullable: true })
  fiscalYearEnd?: string;

  // Additional Info
  @Column('text', { array: true, default: [] })
  keywords: string[];

  @Column('text', { array: true, default: [] })
  awardsRecognition: string[];

  @Column('jsonb', { nullable: true })
  certifications?: {
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    certificateUrl?: string;
  }[];

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('boolean', { default: false })
  isHiring: boolean;

  @Column('boolean', { default: true })
  isPublic: boolean;

  @Column('boolean', { default: false })
  isVerified: boolean;

  @OneToMany(() => OrganizationLocation, (location) => location.organization, {
    cascade: true,
  })
  locations: OrganizationLocation[];

  @OneToMany(
    () => OrganizationMembership,
    (membership) => membership.organization,
  )
  memberships: OrganizationMembership[];

  @OneToMany(() => OrganizationRole, (role) => role.organization)
  roles: OrganizationRole[];

  @OneToMany(
    () => OrganizationInvitation,
    (invitation) => invitation.organization,
  )
  invitations: OrganizationInvitation[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  softDelete(): void {
    this.deletedAt = new Date();
    this.isActive = false;
  }

  restore(): void {
    this.deletedAt = undefined;
    this.isActive = true;
  }

  verify(): void {
    this.isVerified = true;
  }

  unverify(): void {
    this.isVerified = false;
  }

  getMembers(): OrganizationMembership[] {
    return (
      this.memberships?.filter((m) => m.status === MembershipStatus.ACTIVE) ||
      []
    );
  }

  getActiveInvitations(): OrganizationInvitation[] {
    return (
      this.invitations?.filter((i) => i.status === InvitationStatus.PENDING) ||
      []
    );
  }
}

@Entity('organization_locations')
export class OrganizationLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 255 })
  country: string;

  @Column('varchar', { length: 100, nullable: true })
  stateProvince?: string;

  @Column('varchar', { length: 100 })
  city: string;

  @Column('text', { nullable: true })
  address?: string;

  @ManyToOne(() => Organization, (org) => org.locations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  organizationId: string;
}
