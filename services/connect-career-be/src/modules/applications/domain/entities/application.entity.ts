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
  explanation?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
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
    job: Job,
    cv?: CV,
    candidateProfile?: CandidateProfile,
  ): void {
    if (!cv || !cv.content) {
      const breakdown: MatchingScoreBreakdown = {
        skillsMatch: 0,
        experienceMatch: 0,
        educationMatch: 0,
        locationMatch: 0,
        overallScore: 0,
      };
      this.matchingScore = 0;
      this.matchingDetails = breakdown;
      this.isAutoScored = true;
      this.lastScoredAt = new Date();
      return;
    }
    const cvContent = cv.content;
    const jobRequirements = (job.requirements || []).map((r) =>
      r.toLowerCase().trim(),
    );

    const cvSkills = this.extractSkillsFromCV(cvContent);

    const candidateExperienceYears = this.calculateYearsOfExperience(
      cvContent.workExperience || [],
    );
    const requiredExperienceYears = this.extractRequiredExperience(
      job.requirements || [],
    );
    const breakdown: MatchingScoreBreakdown = {
      skillsMatch: this.calculateSkillsMatch(jobRequirements, cvSkills),
      experienceMatch: this.calculateExperienceMatch(
        requiredExperienceYears,
        candidateExperienceYears,
      ),
      educationMatch: this.calculateEducationMatch(job, cv),
      locationMatch: this.calculateLocationMatch(job, cv.content),
      overallScore: 0,
      details: {
        matchedSkills: this.getMatchedSkills(jobRequirements, cvSkills),
        missingSkills: this.getMissingSkills(jobRequirements, cvSkills),
        yearsExperience: candidateExperienceYears,
        requiredExperience: requiredExperienceYears,
        educationLevel: this.getHighestEducationLevel(
          cvContent.education || [],
        ),
        requiredEducation: '',
      },
    };

    breakdown.overallScore =
      breakdown.skillsMatch * 0.4 +
      breakdown.experienceMatch * 0.3 +
      breakdown.educationMatch * 0.15 +
      breakdown.locationMatch * 0.15;

    this.matchingScore = Math.round(breakdown.overallScore * 100) / 100;
    this.matchingDetails = breakdown;
    this.isAutoScored = true;
    this.lastScoredAt = new Date();
  }

  private extractSkillsFromCV(cvContent: Record<string, any>): string[] {
    if (!cvContent.skills) return [];

    if (Array.isArray(cvContent.skills)) {
      return cvContent.skills.map((s: string) => s.toLowerCase().trim());
    }

    if (typeof cvContent.skills === 'object') {
      const allSkills: string[] = [];
      return allSkills.map((s: string) => s.toLowerCase().trim());
    }

    return [];
  }

  private calculateYearsOfExperience(
    workExperience: Array<{
      startDate: string;
      endDate?: string;
      current?: boolean;
    }>,
  ): number {
    if (!workExperience || workExperience.length === 0) return 0;

    let totalMonths = 0;
    const now = new Date();

    for (const exp of workExperience) {
      if (!exp.startDate) continue;

      const startDate = this.parseDate(exp.startDate);
      if (!startDate) continue;

      const endDate =
        exp.current || !exp.endDate || exp.endDate === 'Present'
          ? now
          : this.parseDate(exp.endDate);

      if (!endDate) continue;

      const months = this.getMonthsDifference(startDate, endDate);
      totalMonths += months;
    }

    return Math.round((totalMonths / 12) * 10) / 10; // Round to 1 decimal
  }

  private extractRequiredExperience(requirements: string[]): number {
    if (!requirements || requirements.length === 0) return 0;

    const text = requirements.join(' ').toLowerCase();

    const patterns = [
      /(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/i,
      /minimum\s*(\d+)\s*years?/i,
      /at\s*least\s*(\d+)\s*years?/i,
      /(\d+)\s*-\s*(\d+)\s*years?\s*experience/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const years = parseInt(match[1] || match[2] || '0', 10);
        if (years > 0 && years < 50) {
          return years;
        }
      }
    }

    return 0;
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
      // Handle "YYYY-MM" format
      if (/^\d{4}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr + '-01');
      }

      // Handle "YYYY-MM-DD" format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr);
      }

      // Try standard date parsing
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      return null;
    }

    return null;
  }

  private getMonthsDifference(start: Date, end: Date): number {
    const yearsDiff = end.getFullYear() - start.getFullYear();
    const monthsDiff = end.getMonth() - start.getMonth();
    return yearsDiff * 12 + monthsDiff;
  }

  private getMatchedSkills(required: string[], candidate: string[]): string[] {
    const matched: string[] = [];
    for (const skill of required) {
      if (
        candidate.some((cs) => {
          return cs.includes(skill) || skill.includes(cs);
        })
      ) {
        matched.push(skill);
      }
    }
    return matched;
  }

  private getMissingSkills(required: string[], candidate: string[]): string[] {
    return required.filter(
      (skill) =>
        !candidate.some((cs) => cs.includes(skill) || skill.includes(cs)),
    );
  }

  private getHighestEducationLevel(
    education: Array<{ degree?: string; fieldOfStudy?: string }>,
  ): string {
    if (!education || education.length === 0) return '';

    const degrees = education
      .map((e) => e.degree || '')
      .filter((d) => d.length > 0);

    if (degrees.length === 0) return '';

    if (
      degrees.some(
        (d) =>
          d.toLowerCase().includes('phd') ||
          d.toLowerCase().includes('doctorate'),
      )
    ) {
      return 'PhD';
    }

    if (degrees.some((d) => d.toLowerCase().includes('master'))) {
      return 'Master';
    }

    if (
      degrees.some(
        (d) =>
          d.toLowerCase().includes('bachelor') ||
          d.toLowerCase().includes('bs') ||
          d.toLowerCase().includes('ba'),
      )
    ) {
      return 'Bachelor';
    }

    return degrees[0];
  }

  private calculateSkillsMatch(
    required: string[],
    candidate: string[],
  ): number {
    if (!required || required.length === 0) return 100;
    if (!candidate || candidate.length === 0) return 0;
    const matched = required.filter((skill) =>
      candidate.some((cs) => cs.includes(skill) || skill.includes(cs)),
    );
    return Math.round((matched.length / required.length) * 100);
  }

  private calculateExperienceMatch(
    required: number,
    candidate: number,
  ): number {
    if (!required) return 100;
    if (candidate >= required) return 100;
    return (candidate / required) * 100;
  }

  private calculateEducationMatch(job: Job, cvContent: CV): number {
    const education = cvContent.content?.education || [];

    if (education.length === 0) {
      return 50;
    }

    const requirements = (job.requirements || []).join(' ').toLowerCase();
    const candidateEducationLevel = this.getHighestEducationLevel(education);
    const candidateEducationText = education
      .map(
        (e: { degree?: string; fieldOfStudy?: string }) =>
          `${e.degree || ''} ${e.fieldOfStudy || ''}`,
      )
      .join(' ')
      .toLowerCase();

    const degreeKeywords = [
      'bachelor',
      'master',
      'phd',
      'doctorate',
      'degree',
      'diploma',
    ];
    const hasEducationRequirement = degreeKeywords.some((keyword) =>
      requirements.includes(keyword),
    );

    if (!hasEducationRequirement) {
      return 100;
    }

    const educationLevel = candidateEducationLevel.toLowerCase();

    // PhD requirement
    if (requirements.includes('phd') || requirements.includes('doctorate')) {
      if (
        educationLevel.includes('phd') ||
        educationLevel.includes('doctorate')
      ) {
        return 100;
      }
      if (educationLevel.includes('master')) {
        return 70; // Close but not exact
      }
      return 40; // Bachelor or lower
    }

    // Master requirement
    if (requirements.includes('master')) {
      if (educationLevel.includes('master')) {
        return 100;
      }
      if (
        educationLevel.includes('phd') ||
        educationLevel.includes('doctorate')
      ) {
        return 100; // Overqualified is fine
      }
      if (educationLevel.includes('bachelor')) {
        return 60;
      }
      return 30; // Below bachelor
    }

    // Bachelor requirement
    if (requirements.includes('bachelor') || requirements.includes('degree')) {
      if (
        educationLevel.includes('bachelor') ||
        candidateEducationText.includes('degree')
      ) {
        return 100;
      }
      if (
        educationLevel.includes('master') ||
        educationLevel.includes('phd') ||
        educationLevel.includes('doctorate')
      ) {
        return 100; // Overqualified
      }
      if (
        educationLevel.includes('diploma') ||
        candidateEducationText.includes('diploma')
      ) {
        return 70; // Diploma is close
      }
      return 40; // Below bachelor
    }

    // Generic degree requirement
    if (requirements.includes('degree') && !requirements.includes('bachelor')) {
      if (
        candidateEducationText.includes('degree') ||
        candidateEducationLevel
      ) {
        return 100;
      }
      return 50;
    }

    // No specific requirement or other cases
    return 80; // Give benefit of the doubt
  }

  private calculateLocationMatch(
    job: Job,
    cvContent: { personalInfo?: { address?: string } },
  ): number {
    // If job has no location requirement, return full score
    if (!job.location || job.location.trim() === '') {
      return 100;
    }

    const jobLocation = job.location.toLowerCase().trim();
    const cvAddress = (cvContent?.personalInfo?.address || '')
      .toLowerCase()
      .trim();

    // If CV has no address info, return partial score
    if (!cvAddress) {
      return 50;
    }

    // Check for remote work keywords
    const remoteKeywords = [
      'remote',
      'work from home',
      'wfh',
      'anywhere',
      'distributed',
    ];
    const isJobRemote = remoteKeywords.some((keyword) =>
      jobLocation.includes(keyword),
    );
    const isCVRemote = remoteKeywords.some((keyword) =>
      cvAddress.includes(keyword),
    );

    // If either is remote-friendly, return full score
    if (isJobRemote || isCVRemote) {
      return 100;
    }

    // Exact match or one contains the other
    if (cvAddress === jobLocation) {
      return 100;
    }

    if (cvAddress.includes(jobLocation) || jobLocation.includes(cvAddress)) {
      return 100;
    }

    // Extract city names for comparison
    const jobCity = this.extractCity(jobLocation);
    const cvCity = this.extractCity(cvAddress);

    // Same city match
    if (jobCity && cvCity && jobCity === cvCity) {
      return 90;
    }

    // Extract country/region
    const jobCountry = this.extractCountry(jobLocation);
    const cvCountry = this.extractCountry(cvAddress);

    // Same country match
    if (jobCountry && cvCountry && jobCountry === cvCountry) {
      return 70;
    }

    // Check for same region (e.g., both in Vietnam)
    const vietnamKeywords = [
      'vietnam',
      'viet nam',
      'vn',
      'ho chi minh',
      'hanoi',
      'hcm',
      'hà nội',
    ];
    const isJobVietnam = vietnamKeywords.some((k) => jobLocation.includes(k));
    const isCVVietnam = vietnamKeywords.some((k) => cvAddress.includes(k));

    if (isJobVietnam && isCVVietnam) {
      return 80;
    }

    // Different locations
    return 30;
  }

  private extractCity(location: string): string | null {
    if (!location) return null;

    // Common patterns: "City, Country" or "City" or "City State"
    const parts = location.split(',').map((p) => p.trim());

    // First part is usually the city
    if (parts.length > 0) {
      const city = parts[0].toLowerCase();

      // Remove common prefixes/suffixes
      const cleanCity = city
        .replace(/^(city of|town of|district of)\s+/i, '')
        .trim();

      return cleanCity || null;
    }

    return null;
  }

  private extractCountry(location: string): string | null {
    if (!location) return null;

    const locationLower = location.toLowerCase();

    // Common country keywords
    const countries = [
      'vietnam',
      'viet nam',
      'united states',
      'usa',
      'us',
      'united kingdom',
      'uk',
      'singapore',
      'sg',
      'japan',
      'jp',
      'china',
      'cn',
      'korea',
      'kr',
      'thailand',
      'th',
      'philippines',
      'ph',
      'indonesia',
      'id',
      'malaysia',
      'my',
      'australia',
      'au',
      'canada',
      'ca',
      'india',
      'in',
    ];

    for (const country of countries) {
      if (locationLower.includes(country)) {
        return country.toLowerCase();
      }
    }

    // Try to extract from last part (usually country in "City, Country" format)
    const parts = location.split(',').map((p) => p.trim());
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1].toLowerCase();
      for (const country of countries) {
        if (lastPart.includes(country)) {
          return country.toLowerCase();
        }
      }
    }

    return null;
  }

  private extractRequiredEducation(requirements: string[]): string {
    if (!requirements || requirements.length === 0) return '';

    const text = requirements.join(' ').toLowerCase();

    if (text.includes('phd') || text.includes('doctorate')) {
      return 'PhD';
    }
    if (text.includes('master')) {
      return 'Master';
    }
    if (text.includes('bachelor')) {
      return 'Bachelor';
    }
    if (text.includes('degree')) {
      return 'Degree';
    }

    return '';
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
