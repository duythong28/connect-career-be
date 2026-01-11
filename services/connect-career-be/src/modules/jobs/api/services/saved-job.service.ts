import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedJob } from '../../domain/entities/saved-job.entity';
import { FavoriteJob } from '../../domain/entities/favorite-job.entity';
import { Job } from '../../domain/entities/job.entity';
import { Application } from 'src/modules/applications/domain/entities/application.entity';
import { PaginatedResult } from 'src/shared/domain/interfaces/base.repository';
import {
  JobInteraction,
  JobInteractionType,
} from 'src/modules/recommendations/domain/entities/job-interaction.entity';

@Injectable()
export class SavedJobService {
  constructor(
    @InjectRepository(SavedJob)
    private readonly savedJobRepository: Repository<SavedJob>,
    @InjectRepository(FavoriteJob)
    private readonly favoriteJobRepository: Repository<FavoriteJob>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(JobInteraction)
    private readonly jobInteractionRepository: Repository<JobInteraction>,
  ) {}

  // ==================== SAVED JOBS ====================

  async saveJob(
    userId: string,
    jobId: string,
    notes?: string,
    folderName?: string,
  ): Promise<SavedJob> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const existing = await this.savedJobRepository.findOne({
      where: { userId, jobId },
    });

    if (existing) {
      throw new BadRequestException('Job already saved');
    }

    const savedJob = this.savedJobRepository.create({
      userId,
      jobId,
      notes,
      folderName,
    });

    const saved = await this.savedJobRepository.save(savedJob);

    // Update savedByUserIds array in Job entity
    if (!job.savedByUserIds) {
      job.savedByUserIds = [];
    }
    if (!job.savedByUserIds.includes(userId)) {
      job.savedByUserIds.push(userId);
      await this.jobRepository.save(job);
    }

    const interaction = this.jobInteractionRepository.create({
      userId,
      jobId,
      type: JobInteractionType.SAVE,
      weight: 2.0,
    });
    await this.jobInteractionRepository.save(interaction);

    return saved;
  }

  async unsaveJob(userId: string, jobId: string): Promise<void> {
    const result = await this.savedJobRepository.delete({ userId, jobId });
    if (result.affected === 0) {
      throw new NotFoundException('Saved job not found');
    }

    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (job && job.savedByUserIds) {
      job.savedByUserIds = job.savedByUserIds.filter((id) => id !== userId);
      await this.jobRepository.save(job);
    }
  }

  async updateSavedJob(
    userId: string,
    savedJobId: string,
    notes?: string,
    folderName?: string,
  ): Promise<SavedJob> {
    const savedJob = await this.savedJobRepository.findOne({
      where: { id: savedJobId, userId },
    });

    if (!savedJob) {
      throw new NotFoundException('Saved job not found');
    }

    if (notes !== undefined) savedJob.notes = notes;
    if (folderName !== undefined) savedJob.folderName = folderName;

    return this.savedJobRepository.save(savedJob);
  }

  async getSavedJobs(
    userId: string,
    page: number = 1,
    limit: number = 20,
    folderName?: string,
  ): Promise<PaginatedResult<SavedJob>> {
    const query = this.savedJobRepository
      .createQueryBuilder('savedJob')
      .leftJoinAndSelect('savedJob.job', 'job')
      .leftJoinAndSelect('job.organization', 'organization')
      .leftJoinAndSelect('organization.logoFile', 'logoFile')
      .leftJoinAndSelect('organization.industry', 'industry')
      .where('savedJob.userId = :userId', { userId });

    if (folderName) {
      query.andWhere('savedJob.folderName = :folderName', { folderName });
    }

    query.orderBy('savedJob.savedAt', 'DESC');

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSavedJobFolders(userId: string): Promise<string[]> {
    const results = await this.savedJobRepository
      .createQueryBuilder('savedJob')
      .select('DISTINCT savedJob.folderName', 'folderName')
      .where('savedJob.userId = :userId', { userId })
      .andWhere('savedJob.folderName IS NOT NULL')
      .getRawMany();

    return results.map((r) => r.folderName).filter(Boolean);
  }

  async isSaved(userId: string, jobId: string): Promise<boolean> {
    const count = await this.savedJobRepository.count({
      where: { userId, jobId },
    });
    return count > 0;
  }

  // ==================== FAVORITE JOBS ====================

  async favoriteJob(userId: string, jobId: string): Promise<FavoriteJob> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const existing = await this.favoriteJobRepository.findOne({
      where: { userId, jobId },
    });

    if (existing) {
      throw new BadRequestException('Job already favorited');
    }

    const favoriteJob = this.favoriteJobRepository.create({
      userId,
      jobId,
    });

    const interaction = this.jobInteractionRepository.create({
      userId,
      jobId,
      type: JobInteractionType.FAVORITE,
      weight: 3.0,
    });
    await this.jobInteractionRepository.save(interaction);

    return this.favoriteJobRepository.save(favoriteJob);
  }

  async unfavoriteJob(userId: string, jobId: string): Promise<void> {
    const result = await this.favoriteJobRepository.delete({ userId, jobId });
    if (result.affected === 0) {
      throw new NotFoundException('Favorite job not found');
    }
  }

  async getFavoriteJobs(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<FavoriteJob>> {
    const query = this.favoriteJobRepository
      .createQueryBuilder('favoriteJob')
      .leftJoinAndSelect('favoriteJob.job', 'job')
      .leftJoinAndSelect('job.organization', 'organization')
      .where('favoriteJob.userId = :userId', { userId })
      .orderBy('favoriteJob.favoritedAt', 'DESC');

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async isFavorited(userId: string, jobId: string): Promise<boolean> {
    const count = await this.favoriteJobRepository.count({
      where: { userId, jobId },
    });
    return count > 0;
  }

  // ==================== COMBINED STATUS ====================

  async getJobInteractionStatus(userId: string, jobId: string) {
    const [isSaved, isFavorited, application] = await Promise.all([
      this.isSaved(userId, jobId),
      this.isFavorited(userId, jobId),
      this.applicationRepository.findOne({
        where: { candidateId: userId, jobId },
        select: ['id', 'status', 'appliedDate'],
      }),
    ]);

    return {
      jobId,
      isSaved,
      isFavorited,
      hasApplied: !!application,
      application: application || null,
    };
  }

  async getUserJobStats(userId: string) {
    const [totalSaved, totalFavorited, totalApplied, savedByFolder] =
      await Promise.all([
        this.savedJobRepository.count({ where: { userId } }),
        this.favoriteJobRepository.count({ where: { userId } }),
        this.applicationRepository.count({ where: { candidateId: userId } }),
        this.savedJobRepository
          .createQueryBuilder('savedJob')
          .select('savedJob.folderName', 'folderName')
          .addSelect('COUNT(*)', 'count')
          .where('savedJob.userId = :userId', { userId })
          .groupBy('savedJob.folderName')
          .getRawMany()
          .then((results) =>
            results.reduce(
              (acc, curr) => {
                const folderName = curr.folderName || 'Uncategorized';
                acc[folderName] = parseInt(curr.count);
                return acc;
              },
              {} as Record<string, number>,
            ),
          ),
      ]);

    return {
      totalSaved,
      totalFavorited,
      totalApplied,
      savedByFolder,
    };
  }
}
