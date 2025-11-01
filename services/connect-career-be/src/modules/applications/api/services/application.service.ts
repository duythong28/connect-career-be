import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Application,
  ApplicationSource,
  ApplicationStatus,
} from '../../domain/entities/application.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { User } from 'src/modules/identity/domain/entities';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';
import { PaginatedResult } from 'src/shared/domain/interfaces/base.repository';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JobStatusService } from 'src/modules/jobs/api/services/job-status.service';
import {
  Interview,
  InterviewStatus,
} from '../../domain/entities/interview.entity';
import { Offer, OfferStatus } from '../../domain/entities/offer.entity';
import { CandidateSnapshotDto } from '../dtos/application-detail.dto';
import { PipelineStageType } from 'src/modules/hiring-pipeline/domain/entities/pipeline-stage.entity';
import { CV } from 'src/modules/cv-maker/domain/entities/cv.entity';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;
  candidateId?: string;
  @IsString()
  @IsNotEmpty()
  cvId: string;
  @IsString()
  @IsOptional()
  coverLetter?: string;
  @IsString()
  notes?: string;
  @IsEnum(ApplicationSource)
  @IsOptional()
  source?: ApplicationSource;
  @IsOptional()
  @IsString()
  referralSource?: string;

  public SetCandidateId(candidateId: string) {
    this.candidateId = candidateId;
    return this;
  }
}

export interface UpdateApplicationDto {
  status?: ApplicationStatus;
  notes?: string;
  isShortlisted?: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  assignedToUserId?: string;
  priority?: number;
  candidateNotified?: boolean;
  candidateNotifiedAt?: Date;
  reminders?: Array<{
    id: string;
    type: string;
    dueDate: Date;
    completed: boolean;
    notes?: string;
  }>;
}

export interface ApplicationSearchFilters {
  candidateId?: string;
  jobId?: string;
  status?: ApplicationStatus;
  source?: string;
  stage?: PipelineStageType;
  isShortlisted?: boolean;
  isFlagged?: boolean;
  minMatchingScore?: number;
  maxMatchingScore?: number;
  appliedAfter?: Date;
  appliedBefore?: Date;
  hasInterviews?: boolean;
  hasOffers?: boolean;
  awaitingResponse?: boolean;
  search?: string;
}

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(CV)
    private readonly cvRepository: Repository<CV>,
    private readonly jobStatusService: JobStatusService,
  ) {}

  async createApplication(
    createDto: CreateApplicationDto,
  ): Promise<Application> {
    this.logger.log(
      `Creating application for job ${createDto.jobId} by candidate ${createDto.candidateId}`,
    );

    const job = await this.jobRepository.findOne({
      where: { id: createDto.jobId },
      relations: ['hiringPipeline', 'hiringPipeline.stages'],
    });
    if (!job) {
      throw new NotFoundException(`Job with id ${createDto.jobId} not found`);
    }

    const candidate = await this.userRepository.findOne({
      where: { id: createDto.candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(
        `Candidate with id ${createDto.candidateId} not found`,
      );
    }

    const existingApplication = await this.applicationRepository.findOne({
      where: { jobId: createDto.jobId, candidateId: createDto.candidateId },
    });
    if (existingApplication) {
      throw new BadRequestException(
        `Application already exists for job ${createDto.jobId} and candidate ${createDto.candidateId}`,
      );
    }
    const application = new Application();
    application.jobId = createDto.jobId;
    application.candidateId = createDto.candidateId || '';
    application.cvId = createDto.cvId;
    application.coverLetter = createDto.coverLetter;
    application.notes = createDto.notes;
    application.source = createDto.source || ApplicationSource.DIRECT;
    application.referralSource = createDto.referralSource;
    application.appliedDate = new Date();

    if (job?.hiringPipeline?.stages?.length > 0) {
      const firstStage = job.hiringPipeline.stages.sort(
        (a, b) => a.order - b.order,
      )[0];

      application.currentStageKey = firstStage.key;
      application.currentStageName = firstStage.name;

      application.pipelineStageHistory = [
        {
          stageId: firstStage.id,
          stageKey: firstStage.key,
          stageName: firstStage.name,
          changedAt: new Date(),
          changedBy: createDto.candidateId || 'system',
          reason: 'Initial application stage',
        },
      ];
    }
    const candidateProfile = await this.candidateProfileRepository.findOne({
      where: { userId: createDto.candidateId },
    });
    const cv = await this.cvRepository.findOne({
      where: { id: createDto.cvId },
    });
    application.calculateMatcingScore(job, cv ?? undefined, candidateProfile ?? undefined);
    application.updateCalculatedFields();
    return this.applicationRepository.save(application);
  }
  async getApplicationById(id: string): Promise<Application> {
    const qb = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('application.candidateProfile', 'candidateProfile')
      .leftJoinAndSelect('application.cv', 'cv')
      .leftJoinAndSelect('application.reviewer', 'reviewer')
      .leftJoinAndSelect('application.interviews', 'interviews')
      .leftJoinAndSelect('application.offers', 'offers')
      .leftJoinAndSelect('application.currentOffer', 'currentOffer')
      .where('application.id = :id', { id });

    const application = await qb.getOne();
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  async getApplicationsByCandidate(
    candidateId: string,
    filters?: Partial<ApplicationSearchFilters>,
  ): Promise<Application[]> {
    const qb = this.baseQuery();
    qb.andWhere('application.candidateId = :candidateId', { candidateId });
    this.applyFilters(qb, filters);
    qb.orderBy('application.appliedDate', 'DESC');
    return qb.getMany();
  }
  async getApplicationsByJob(
    jobId: string,
    filters?: Partial<ApplicationSearchFilters>,
  ): Promise<Application[]> {
    const qb = this.baseQuery();
    qb.andWhere('application.jobId = :jobId', { jobId });
    this.applyFilters(qb, filters);
    qb.orderBy('application.appliedDate', 'DESC');
    return qb.getMany();
  }
  async searchApplications(
    filters: ApplicationSearchFilters,
    page = 1,
    limit = 20,
    sortBy = 'appliedDate',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<PaginatedResult<Application>> {
    const qb = this.baseQuery();
    this.applyFilters(qb, filters);
    qb.orderBy(`application.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit);
    qb.take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async updateApplication(
    id: string,
    updateDto: UpdateApplicationDto,
    userId: string,
  ): Promise<Application> {
    const app = await this.getApplicationById(id);
    if (updateDto.status !== undefined) {
      app.addStatusHistory(updateDto.status, userId, 'Status updated');
    }
    if (updateDto.notes !== undefined) app.notes = updateDto.notes;
    if (updateDto.isShortlisted !== undefined) {
      app.isShortlisted = updateDto.isShortlisted;
      if (updateDto.isShortlisted) app.shortlistedAt = new Date();
    }
    if (updateDto.isFlagged !== undefined) {
      app.isFlagged = updateDto.isFlagged;
      app.flagReason = updateDto.flagReason;
    }
    if (updateDto.assignedToUserId !== undefined) {
      app.assignedToUserId = updateDto.assignedToUserId;
      app.assignedAt = new Date();
    }
    if (updateDto.priority !== undefined) app.priority = updateDto.priority;
    if (updateDto.candidateNotified !== undefined)
      app.candidateNotified = updateDto.candidateNotified;
    if (updateDto.candidateNotifiedAt !== undefined)
      app.candidateNotifiedAt = updateDto.candidateNotifiedAt;
    if (updateDto.reminders !== undefined) {
      const existing = app.reminders || [];
      const updates = updateDto.reminders || [];
      app.reminders = [
        ...existing.filter((r) => !updates.find((u) => u.id === r.id)),
        ...updates,
      ];
    }
    app.updateCalculatedFields();
    await this.applicationRepository.save(app);
    return this.getApplicationById(id);
  }

  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    userId: string,
    reason?: string,
  ): Promise<Application> {
    const app = await this.getApplicationById(id);
    app.addStatusHistory(status, userId, reason);
    app.updateCalculatedFields();
    await this.applicationRepository.save(app);
    if (status === ApplicationStatus.HIRED) {
      await this.jobStatusService.updateJobStatusBasedOnApplications(app.jobId);
    }

    return this.getApplicationById(id);
    return this.getApplicationById(id);
  }

  async shortlistApplication(id: string, userId: string): Promise<Application> {
    return this.updateApplication(id, { isShortlisted: true }, userId);
  }

  async assignApplication(
    id: string,
    assignedToUserId: string,
    userId: string,
  ): Promise<Application> {
    return this.updateApplication(id, { assignedToUserId }, userId);
  }

  async rejectApplication(
    id: string,
    reason: string,
    feedback: string,
    userId: string,
  ): Promise<Application> {
    const app = await this.getApplicationById(id);
    app.addStatusHistory(ApplicationStatus.REJECTED, userId, reason);
    app.rejectionDetails = {
      rejectedDate: new Date(),
      rejectedBy: userId,
      reason,
      feedback,
      canReapply: false,
    };
    app.updateCalculatedFields();
    await this.applicationRepository.save(app);
    return this.getApplicationById(id);
  }

  async withdrawApplication(
    id: string,
    reason: string,
    userId: string,
  ): Promise<Application> {
    const app = await this.getApplicationById(id);
    app.addStatusHistory(ApplicationStatus.WITHDRAWN, userId, reason);
    app.withdrawalDetails = { withdrawnDate: new Date(), reason };
    app.updateCalculatedFields();
    await this.applicationRepository.save(app);
    return this.getApplicationById(id);
  }
  async getApplicationStats(
    filters: Partial<ApplicationSearchFilters> = {},
  ): Promise<any> {
    const qb = this.baseQuery();
    this.applyFilters(qb, filters);
    const apps = await qb.getMany();

    const totalApplications = apps.length;
    const applicationsByStatus = apps.reduce<Record<ApplicationStatus, number>>(
      (acc, cur) => {
        acc[cur.status] = (acc[cur.status] || 0) + 1;
        return acc;
      },
      {} as any,
    );

    const averageMatchingScore = apps.length
      ? apps.reduce((sum, a) => sum + Number(a.matchingScore || 0), 0) /
        apps.length
      : 0;
    const hired = apps.filter((a) => a.status === ApplicationStatus.HIRED);
    const averageTimeToHire = hired.length
      ? hired.reduce((sum, a) => sum + (a.timeToHire || 0), 0) / hired.length
      : 0;

    const sourcesCount = apps.reduce<Record<string, number>>((acc, a) => {
      const s = a.source;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const topSources = Object.entries(sourcesCount)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalApplications,
      applicationsByStatus,
      averageMatchingScore,
      averageTimeToHire,
      topSources,
    };
  }

  async getSimilarApplications(id: string, limit = 5): Promise<Application[]> {
    const base = await this.getApplicationById(id);
    const qb = this.baseQuery()
      .andWhere('application.jobId = :jobId', { jobId: base.jobId })
      .andWhere('application.id <> :id', { id });

    // naive similarity: score within -10 of base
    const list = await qb
      .orderBy('application.matchingScore', 'DESC')
      .getMany();
    return list
      .filter((a) => Number(a.matchingScore) >= Number(base.matchingScore) - 10)
      .slice(0, limit);
  }

  async getApplicationsNeedingAttention(): Promise<Application[]> {
    const qb = this.baseQuery().andWhere(
      'application.status IN (:...statuses)',
      {
        statuses: [
          ApplicationStatus.NEW,
          ApplicationStatus.SCREENING,
          ApplicationStatus.INTERVIEW_SCHEDULED,
          ApplicationStatus.INTERVIEW_IN_PROGRESS,
          ApplicationStatus.INTERVIEW_COMPLETED,
          ApplicationStatus.REFERENCE_CHECK,
          ApplicationStatus.OFFER_PENDING,
          ApplicationStatus.OFFER_SENT,
          ApplicationStatus.OFFER_ACCEPTED,
          ApplicationStatus.OFFER_REJECTED,
          ApplicationStatus.NEGOTIATING,
          ApplicationStatus.HIRED,
          ApplicationStatus.REJECTED,
          ApplicationStatus.WITHDRAWN,
          ApplicationStatus.ON_HOLD,
        ],
      },
    );

    const list = await qb.getMany();
    return list.filter(
      (a) => (a.daysInCurrentStatus || 0) > 7 || !!a.isFlagged,
    );
  }

  async getApplicationsByStatus(
    status: ApplicationStatus,
    limit = 100,
  ): Promise<Application[]> {
    const qb = this.baseQuery()
      .andWhere('application.status = :status', { status })
      .orderBy('application.appliedDate', 'DESC')
      .take(limit);
    return qb.getMany();
  }

  async deleteApplication(id: string, userId: string): Promise<void> {
    const app = await this.getApplicationById(id);
    if (
      [ApplicationStatus.HIRED, ApplicationStatus.REJECTED].includes(app.status)
    ) {
      throw new BadRequestException(
        'Cannot delete applications that have been hired or rejected',
      );
    }
    await this.applicationRepository.delete(id);
    this.logger.log(`Application ${id} deleted by user ${userId}`);
  }

  async bulkUpdateApplications(
    ids: string[],
    updateDto: UpdateApplicationDto,
    userId: string,
  ): Promise<Application[]> {
    const updated: Application[] = [];
    for (const id of ids) {
      const app = await this.updateApplication(id, updateDto, userId);
      updated.push(app);
    }
    return updated;
  }

  private baseQuery() {
    return this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('application.candidateProfile', 'candidateProfile')
      .leftJoinAndSelect('application.cv', 'cv')
      .leftJoinAndSelect('cv.file', 'file')
      .leftJoinAndSelect('application.reviewer', 'reviewer')
      .leftJoinAndSelect('application.interviews', 'interviews')
      .leftJoinAndSelect('application.offers', 'offers')
      .leftJoinAndSelect('application.currentOffer', 'currentOffer');
  }

  private applyFilters(
    qb: ReturnType<ApplicationService['baseQuery']>,
    f: Partial<ApplicationSearchFilters> = {},
  ) {
    if (f.candidateId)
      qb.andWhere('application.candidateId = :candidateId', {
        candidateId: f.candidateId,
      });
    if (f.jobId) qb.andWhere('application.jobId = :jobId', { jobId: f.jobId });
    if (f.status)
      qb.andWhere('application.status = :status', { status: f.status });
    if (f.stage)
      qb.andWhere('application.currentStageKey = :stage', { stage: f.stage });
    if (f.source)
      qb.andWhere('application.source = :source', { source: f.source });
    if (f.isShortlisted !== undefined)
      qb.andWhere('application.isShortlisted = :isShortlisted', {
        isShortlisted: f.isShortlisted,
      });
    if (f.isFlagged !== undefined)
      qb.andWhere('application.isFlagged = :isFlagged', {
        isFlagged: f.isFlagged,
      });
    if (f.minMatchingScore !== undefined)
      qb.andWhere('application.matchingScore >= :minMatchingScore', {
        minMatchingScore: f.minMatchingScore,
      });
    if (f.maxMatchingScore !== undefined)
      qb.andWhere('application.matchingScore <= :maxMatchingScore', {
        maxMatchingScore: f.maxMatchingScore,
      });
    if (f.appliedAfter)
      qb.andWhere('application.appliedDate >= :appliedAfter', {
        appliedAfter: f.appliedAfter,
      });
    if (f.appliedBefore)
      qb.andWhere('application.appliedDate <= :appliedBefore', {
        appliedBefore: f.appliedBefore,
      });
    if (f.hasInterviews !== undefined) {
      if (f.hasInterviews) qb.andWhere('application.totalInterviews > 0');
      else qb.andWhere('application.totalInterviews = 0');
    }
    if (f.hasOffers !== undefined) {
      if (f.hasOffers) qb.andWhere('application.currentOfferId IS NOT NULL');
      else qb.andWhere('application.currentOfferId IS NULL');
    }
    if (f.awaitingResponse !== undefined)
      qb.andWhere('application.awaitingCandidateResponse = :awaiting', {
        awaiting: f.awaitingResponse,
      });
    if (f.search) {
      qb.andWhere(
        '(job.title ILIKE :search OR candidate.firstName ILIKE :search OR candidate.lastName ILIKE :search)',
        { search: `%${f.search}%` },
      );
    }
  }

  async getApplicationDetailById(id: string): Promise<Application | null> {
    return this.applicationRepository.findOne({
      where: { id },
      relations: [
        'candidate',
        'job',
        'candidateProfile',
        'cv',
        'interviews',
        'offers',
        'reviewer',
      ],
    });
  }

  async buildCandidateSnapshot(
    candidateId: string,
  ): Promise<CandidateSnapshotDto> {
    const candidate = await this.userRepository.findOne({
      where: { id: candidateId },
    });

    const candidateProfile = await this.candidateProfileRepository.findOne({
      where: { userId: candidateId },
    });

    return {
      name: candidate?.firstName + ' ' + candidate?.lastName,
      email: candidate?.email || '',
      phone: candidate?.phoneNumber,
      currentTitle: candidateProfile?.workExperiences[0]?.jobTitle,
      currentCompany: candidateProfile?.workExperiences[0]?.organization.name,
      location: candidateProfile?.address || '',
      avatarUrl: candidateProfile?.user.avatarUrl,
    };
  }

  async updateCandidateSnapshot(
    applicationId: string,
  ): Promise<Application | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const snapshot = await this.buildCandidateSnapshot(application.candidateId);

    await this.applicationRepository.update(applicationId, {
      candidateSnapshot: snapshot,
    });

    return this.applicationRepository.findOne({ where: { id: applicationId } });
  }

  async updateApplicationNotes(
    applicationId: string,
    notes: string,
    updatedBy: string,
  ): Promise<Application | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    await this.applicationRepository.update(applicationId, { notes });

    return this.applicationRepository.findOne({ where: { id: applicationId } });
  }

  async flagApplication(
    applicationId: string,
    reason: string,
    flaggedBy: string,
  ): Promise<Application | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    await this.applicationRepository.update(applicationId, {
      isFlagged: true,
      flagReason: reason,
    });

    return this.applicationRepository.findOne({ where: { id: applicationId } });
  }

  async unflagApplication(applicationId: string): Promise<Application | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    await this.applicationRepository.update(applicationId, {
      isFlagged: false,
      flagReason: undefined,
    });

    return this.applicationRepository.findOne({ where: { id: applicationId } });
  }

  async addTags(
    applicationId: string,
    tags: string[],
  ): Promise<Application | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const existingTags = application.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];

    await this.applicationRepository.update(applicationId, { tags: newTags });

    return this.applicationRepository.findOne({ where: { id: applicationId } });
  }

  async removeTags(
    applicationId: string,
    tags: string[],
  ): Promise<Application | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const existingTags = application.tags || [];
    const newTags = existingTags.filter((tag) => !tags.includes(tag));

    await this.applicationRepository.update(applicationId, { tags: newTags });

    return this.applicationRepository.findOne({ where: { id: applicationId } });
  }

  async hireCandidate(
    applicationId: string,
    hiredBy: string,
  ): Promise<Application> {
    const application = await this.getApplicationById(applicationId);

    // Update application to hired
    await this.updateApplicationStatus(
      applicationId,
      ApplicationStatus.HIRED,
      hiredBy,
      'Candidate hired',
    );

    // Close any pending offers
    if (application.currentOfferId) {
      await this.offerRepository.update(application.currentOfferId, {
        status: OfferStatus.ACCEPTED,
      });
    }

    // Cancel any pending interviews
    const pendingInterviews = await this.interviewRepository.find({
      where: {
        applicationId,
        status: InterviewStatus.SCHEDULED,
      },
    });

    for (const interview of pendingInterviews) {
      await this.interviewRepository.update(interview.id, {
        status: InterviewStatus.CANCELLED,
        cancellationReason: 'Candidate hired',
        cancelledAt: new Date(),
      });
    }

    return this.getApplicationById(applicationId);
  }
}
