import { CV } from 'src/modules/cv-maker/domain/entities/cv.entity';
import { User } from 'src/modules/identity/domain/entities';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Offer } from './offer.entity';
import { Interview, InterviewStatus } from './interview.entity';
import { PipelineStage } from 'src/modules/hiring-pipeline/domain/entities/pipeline-stage.entity';

export enum ApplicationStatus {
  LEAD = 'lead',
  NEW = 'new',
  UNDER_REVIEW = 'under-review',
  SCREENING = 'screening',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview-scheduled',
  INTERVIEW_IN_PROGRESS = 'interview-in-progress',
  INTERVIEW_COMPLETED = 'interview-completed',
  REFERENCE_CHECK = 'reference-check',
  OFFER_PENDING = 'offer-pending',
  OFFER_SENT = 'offer-sent',
  OFFER_ACCEPTED = 'offer-accepted',
  OFFER_REJECTED = 'offer_rejected',
  NEGOTIATING = 'negotiating',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  ON_HOLD = 'on-hold',
}

export enum InterviewType {
  PHONE = 'phone',
  VIDEO = 'video',
  IN_PERSON = 'in-person',
  TECHNICAL = 'technical',
  CULTURAL = 'cultural',
  OTHER = 'other',
}

export enum ApplicationSource {
  DIRECT = 'direct',
  LINKEDIN = 'linkedin',
  REFERRED = 'referred',
  JOB_BOARD = 'job-board',
  MANUAL = 'manual',
  AGENCY = 'agency',
  CAMPUS = 'campus',
  COMPANY_WEBSITE = 'company-website',
  RECRUITER = 'recruiter',
  OTHER = 'other',
}

export enum ApplicationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}
export interface ApplicationFeedback {
  rating: number;
  comment: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface MatchingScoreBreakdown {
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  locationMatch: number;
  overallScore: number;
  details?: {
    matchedSkills: string[];
    missingSkills: string[];
    yearsExperience: number;
    requiredExperience: number;
    educationLevel: string;
    requiredEducation: string;
  };
}

export interface StatusHistory {
  status: ApplicationStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
  notes?: string;
  stageKey?: string;
  stageName?: string;
}

export interface ScreeningAssessment {
  assessmentDate: Date;
  assessedBy: string;
  scores: {
    technicalSkills: number;
    communication: number;
    culturalFit: number;
    motivation: number;
    overallScore: number;
    comments: string;
  };
  questions?: Array<{
    question: string;
    answer: string;
    score: number;
  }>;
  recommendation: 'proceed' | 'reject' | 'needs_review';
  notes: string;
}

export interface CommunicationLog {
  id: string;
  type: 'email' | 'phone' | 'message' | 'meeting';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content?: string;
  sentBy?: string;
  sentTo?: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'failed' | 'read';
}

export interface RejectionDetails {
  rejectedDate: Date;
  rejectedBy: string;
  reason: string;
  feedback?: string;
  canReapply: boolean;
  reapplyAfterDays?: number;
}

export interface WithdrawalDetails {
  withdrawnDate: Date;
  reason?: string;
  feedback?: string;
}

export interface PipelineStageHistory {
  stageId: string;
  stageKey: string;
  stageName: string;
  changedAt: Date;
  changedBy: string;
  reason?: string;
  previousStageKey?: string;
  transitionAction?: string;
}
@Entity('applications')
@Index(['jobId', 'candidateId'], { unique: true })
@Index(['candidateId', 'status'])
@Index(['jobId', 'status'])
@Index(['status', 'appliedDate'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  jobId: string;

  @Column('uuid')
  @Index()
  candidateId: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.NEW,
  })
  @Index()
  status: ApplicationStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  appliedDate: Date;

  @Column('uuid', { nullable: true })
  cvId?: string;

  @Column({ type: 'text', nullable: true })
  coverLetter?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  @Index()
  matchingScore: number;

  @Column({ type: 'jsonb', nullable: true })
  feedback?: ApplicationFeedback;

  @ManyToOne(() => Job, { eager: true })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'candidateId' })
  candidate: User;

  @ManyToOne(() => CandidateProfile, { nullable: true })
  @JoinColumn({ name: 'candidateProfileId' })
  candidateProfile?: CandidateProfile;

  @Column('uuid', { nullable: true })
  candidateProfileId?: string;

  @ManyToOne(() => CV, { nullable: true })
  @JoinColumn({ name: 'cvId' })
  cv?: CV;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: User;

  @Column('uuid', { nullable: true })
  reviewedBy?: string;

  @Column({ type: 'jsonb', nullable: true })
  matchingDetails?: MatchingScoreBreakdown;

  @Column({ type: 'boolean', default: false })
  isAutoScored: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastScoredAt?: Date;

  @OneToMany(() => Interview, (interview) => interview.application)
  interviews?: Interview[];

  @Column({ type: 'int', default: 0 })
  totalInterviews: number;

  @Column({ type: 'int', default: 0 })
  completedInterviews: number;

  @Column({ type: 'timestamp', nullable: true })
  nextInterviewDate?: Date;

  @OneToMany(() => Offer, (offer) => offer.application)
  offers?: Offer[];

  @Column('uuid', { nullable: true })
  currentOfferId?: string;

  @ManyToOne(() => Offer, { nullable: true })
  @JoinColumn({ name: 'currentOfferId' })
  currentOffer?: Offer;

  @Column({ type: 'jsonb', nullable: true })
  statusHistory?: StatusHistory[];

  @Column({ type: 'int', default: 0 })
  daysSinceApplied: number;

  @Column({ type: 'int', default: 0 })
  daysInCurrentStatus: number;

  @Column({ type: 'timestamp', nullable: true })
  lastStatusChange?: Date;

  @Column({ type: 'jsonb', nullable: true })
  screeningAssessment?: ScreeningAssessment;

  @Column({ type: 'boolean', default: false })
  passedScreening: boolean;

  @Column({ type: 'timestamp', nullable: true })
  screeningCompletedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  communicationLogs?: CommunicationLog[];

  @Column({ type: 'int', default: 0 })
  emailsSent: number;

  @Column({ type: 'int', default: 0 })
  emailsReceived: number;

  @Column({ type: 'timestamp', nullable: true })
  lastContactDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastCandidateResponseDate?: Date;

  @Column({ type: 'boolean', default: false })
  awaitingCandidateResponse: boolean;

  @Column({ type: 'jsonb', nullable: true })
  rejectionDetails?: RejectionDetails;

  @Column({ type: 'jsonb', nullable: true })
  withdrawalDetails?: WithdrawalDetails;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  currentStageKey?: string;

  @Column({ type: 'varchar', nullable: true })
  currentStageName?: string;

  // Add pipeline stage history (separate from status history)
  @Column({ type: 'jsonb', nullable: true })
  pipelineStageHistory?: PipelineStageHistory[];

  @Column({
    type: 'enum',
    enum: ApplicationSource,
    default: ApplicationSource.DIRECT,
  })
  source: ApplicationSource;

  @Column({ type: 'varchar', nullable: true })
  referralSource?: string;

  @Column({ type: 'jsonb', nullable: true })
  parsedResumeData?: {
    skills: string[];
    experience: string[];
    education: string[];
    certifications: string[];
    languages: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  candidateSnapshot?: {
    name: string;
    email: string;
    phone?: string;
    currentTitle?: string;
    currentCompany?: string;
    yearsOfExperience?: number;
    expectedSalary?: number;
    noticePeriod?: string;
    location: string;
  };
  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: false })
  isFlagged: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  flagReason?: string;

  @Column({ type: 'boolean', default: false })
  isShortlisted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  shortlistedAt?: Date;

  @Column('uuid', { nullable: true })
  assignedToUserId?: string;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt?: Date;

  @Column({ type: 'boolean', default: false })
  candidateNotified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  candidateNotifiedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  reminders?: Array<{
    id: string;
    type: string;
    dueDate: Date;
    completed: boolean;
    notes?: string;
  }>;

  // Analytics & Metrics
  @Column({ type: 'int', default: 0 })
  profileViews: number;

  @Column({ type: 'timestamp', nullable: true })
  lastViewedAt?: Date;

  @Column({ type: 'int', nullable: true })
  timeToHire?: number;

  @Column({ type: 'jsonb', nullable: true })
  stagesDuration?: {
    screening: number;
    interview: number;
    offer: number;
  };

  @Column({ type: 'boolean', default: false })
  backgroundCheckRequired: boolean;

  @Column({ type: 'boolean', default: false })
  backgroundCheckCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  backgroundCheckCompletedAt?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  backgroundCheckStatus?: string;

  @Column({ type: 'jsonb', nullable: true })
  customFields?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  isActive(): boolean {
    return ![
      ApplicationStatus.HIRED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
    ].includes(this.status);
  }

  calculateMatcingScore(
    jobRequirements: any,
    candidateProfile: CandidateProfile,
  ): void {
    const breakdown: MatchingScoreBreakdown = {
      skillsMatch: this.calculateSkillsMatch(
        jobRequirements.skills as string[],
        candidateProfile.skills,
      ),
      experienceMatch: 100,
      educationMatch: this.calculateEducationMatch(),
      locationMatch: this.calculateLocationMatch(),
      overallScore: 0,
    };

    breakdown.overallScore =
      breakdown.skillsMatch * 0.4 +
      breakdown.experienceMatch * 0.3 +
      breakdown.educationMatch * 0.15 +
      breakdown.locationMatch * 0.1;
    this.matchingScore = breakdown.overallScore;
    this.matchingDetails = breakdown;
    this.isAutoScored = true;
    this.lastScoredAt = new Date();
  }

  private calculateSkillsMatch(
    required: string[],
    candidate: string[],
  ): number {
    if (!required || required.length === 0) return 100;
    const matched = required.filter((skill) =>
      candidate.some((cs) => cs.toLowerCase().includes(skill.toLowerCase())),
    );
    return (matched.length / required.length) * 100;
  }

  private calculateExperienceMatch(
    required: number,
    candidate: number,
  ): number {
    if (!required) return 100;
    if (candidate >= required) return 100;
    return (candidate / required) * 100;
  }

  private calculateEducationMatch(): number {
    return 100;
  }

  private calculateLocationMatch(): number {
    return 100;
  }

  private calculateSalaryMatch(offered: number, expected: number): number {
    if (!expected) return 100;
    if (offered >= expected) return 100;
    return (offered / expected) * 100;
  }

  updateCalculatedFields(): void {
    const now = new Date();
    const appliedTime = new Date(this.appliedDate).getTime();
    this.daysSinceApplied = Math.floor(
      (now.getTime() - appliedTime) / (1000 * 60 * 60 * 24),
    );

    if (this.lastStatusChange) {
      const statusChangeTime = new Date(this.lastStatusChange).getTime();
      this.daysInCurrentStatus = Math.floor(
        (now.getTime() - statusChangeTime) / (1000 * 60 * 60 * 24),
      );
    }
  }

  addStatusHistory(
    newStatus: ApplicationStatus,
    changedBy: string,
    reason?: string,
  ): void {
    if (!this.statusHistory) {
      this.statusHistory = [];
    }

    this.statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy,
      reason,
    });

    this.status = newStatus;
    this.lastStatusChange = new Date();
  }

  scheduleInterview(schedule: Omit<Interview, 'id'>): void {
    if (!this.interviews) {
      this.interviews = [];
    }

    const newSchedule: Interview = {
      ...schedule,
      id: `interview_${Date.now()}`,
      status: InterviewStatus.SCHEDULED,
    };

    this.interviews.push(newSchedule);
    this.totalInterviews++;
    this.status = ApplicationStatus.INTERVIEW_SCHEDULED;

    const upcomingInterviews = this.interviews
      .filter(
        (i) =>
          i.status === InterviewStatus.SCHEDULED &&
          new Date(i.scheduledDate) > new Date(),
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledDate).getTime() -
          new Date(b.scheduledDate).getTime(),
      );

    this.nextInterviewDate = upcomingInterviews[0]?.scheduledDate;
  }

  logCommunication(communication: Omit<CommunicationLog, 'id'>): void {
    if (!this.communicationLogs) {
      this.communicationLogs = [];
    }

    this.communicationLogs.push({
      ...communication,
      id: `comm_${Date.now()}`,
    });

    this.lastContactDate = new Date();

    if (communication.direction === 'outbound') {
      this.emailsSent++;
    } else {
      this.emailsReceived++;
      this.lastCandidateResponseDate = new Date();
    }
  }

  toFrontendFormat() {
    return {
      id: this.id,
      jobId: this.jobId,
      candidateId: this.candidateId,
      status: this.status,
      appliedDate: this.appliedDate.toISOString(),
      cvId: this.cvId,
      coverLetter: this.coverLetter,
      notes: this.notes,
      matchingScore: parseFloat(this.matchingScore.toString()),
      feedback: this.feedback,
    };
  }

  addPipelineStageHistory(
    newStage: PipelineStage,
    changedBy: string,
    reason?: string,
    actionName?: string,
  ): void {
    if (!this.pipelineStageHistory) {
      this.pipelineStageHistory = [];
    }

    const currentStageKey = this.currentStageKey;

    this.pipelineStageHistory.push({
      stageId: newStage.id,
      stageKey: newStage.key,
      stageName: newStage.name,
      changedAt: new Date(),
      changedBy,
      reason,
      previousStageKey: currentStageKey,
      transitionAction: actionName,
    });

    this.currentStageKey = newStage.key;
    this.currentStageName = newStage.name;
  }
}
