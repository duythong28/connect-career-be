import { Inject, Injectable } from "@nestjs/common";
import { Job, JobStatus } from "src/modules/jobs/domain/entities/job.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, MoreThanOrEqual, LessThanOrEqual } from "typeorm";
import { Organization } from "src/modules/profile/domain/entities/organization.entity";
import * as distributedCacheInterface from "src/shared/infrastructure/cache/interfaces/distributed-cache.interface";

export interface JobOpportunityGrowthItem {
    key: string;
    value: string;
}

export interface WorkMarketStatistics {
    quantity_job_recruitment: number;
    quantity_job_recruitment_yesterday: number;
    quantity_job_new_today: number;
    quantity_company_recruitment: number;
    time_scan: string;
}

@Injectable()
export class JobStatisticService {
    private readonly CACHE_KEY_PREFIX = 'job-opportunity-growth:';
    private readonly CACHE_KEY_PREFIX_WORK_MARKET = 'work-market:';
    private readonly CACHE_TTL = 60 * 60; // 1 hour
    private readonly CACHE_TTL_WORK_MARKET = 5 * 60; // 5 minutes (frequent updates)

    constructor(
        @InjectRepository(Job)
        private readonly jobRepository: Repository<Job>,
        @InjectRepository(Organization)
        private readonly organizationRepository: Repository<Organization>,
        @Inject('IDistributedCache')
        private readonly cache: distributedCacheInterface.IDistributedCache,
    ) {}

    private generateCacheKey(startDate?: Date, endDate?: Date): string {
        if (startDate && endDate) {
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            return `${this.CACHE_KEY_PREFIX}${startDateStr}:${endDateStr}`;
        }
        return `${this.CACHE_KEY_PREFIX}all`;
    }

    private generateWorkMarketCacheKey(): string {
        const today = new Date().toISOString().split('T')[0];
        return `${this.CACHE_KEY_PREFIX_WORK_MARKET}${today}`;
    }

    private formatTimeScan(date: Date): string {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${hours}:${minutes} ${day}/${month}/${year}`;
    }

    /**
     * Get work market statistics
     * Returns comprehensive job market metrics
     */
    async getWorkMarketStatistics(): Promise<WorkMarketStatistics> {
        const cacheKey = this.generateWorkMarketCacheKey();
        const now = new Date();

        // Try to get from cache first
        const cachedResult = await this.cache.get<WorkMarketStatistics>(cacheKey);
        if (cachedResult) {
            // Update time_scan to current time even if cached
            return {
                ...cachedResult,
                time_scan: this.formatTimeScan(now),
            };
        }

        // Calculate today's date boundaries
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // Calculate yesterday's date boundaries
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        
        const yesterdayEnd = new Date(todayEnd);
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

        // Execute all queries in parallel for better performance
        const [
            quantityJobRecruitment,
            quantityJobRecruitmentYesterday,
            quantityCompanyRecruitment,
        ] = await Promise.all([
            // Total active jobs (not deleted)
            this.jobRepository.count({
                where: {
                    status: JobStatus.ACTIVE,
                    deletedAt: IsNull(),
                },
            }),

            // Active jobs count from yesterday (end of yesterday)
            this.jobRepository
                .createQueryBuilder('job')
                .where('job.status = :status', { status: JobStatus.ACTIVE })
                .andWhere('job.deletedAt IS NULL')
                .andWhere('job.createdAt <= :yesterdayEnd', { yesterdayEnd: yesterdayEnd })
                .getCount(),

            // New jobs created today
            this.jobRepository.count({
                where: {
                    status: JobStatus.ACTIVE,
                    deletedAt: IsNull(),
                    createdAt: MoreThanOrEqual(todayStart) && LessThanOrEqual(todayEnd),
                },
            }),

            // Number of distinct companies with active jobs
            this.jobRepository
                .createQueryBuilder('job')
                .leftJoin('job.organization', 'organization')
                .select('COUNT(DISTINCT organization.id)', 'count')
                .where('job.status = :status', { status: JobStatus.ACTIVE })
                .andWhere('job.deletedAt IS NULL')
                .andWhere('organization.id IS NOT NULL')
                .getRawOne()
                .then((result: { count: string }) => parseInt(result.count || '0', 10)),
        ]);

        const quantityJobNewToday = await this.jobRepository
            .createQueryBuilder('job')
            .where('job.status = :status', { status: JobStatus.ACTIVE })
            .andWhere('job.deletedAt IS NULL')
            .andWhere('DATE(job.createdAt) = DATE(:today)', { today: now })
            .getCount();

        const statistics: WorkMarketStatistics = {
            quantity_job_recruitment: quantityJobRecruitment,
            quantity_job_recruitment_yesterday: quantityJobRecruitmentYesterday,
            quantity_job_new_today: quantityJobNewToday,
            quantity_company_recruitment: quantityCompanyRecruitment,
            time_scan: this.formatTimeScan(now),
        };

        // Cache the results
        await this.cache.set(cacheKey, statistics, {
            ttl: this.CACHE_TTL_WORK_MARKET,
        });

        return statistics;
    }

    /**
     * Get job opportunity growth statistics
     * Returns count of active jobs created per day
     */
    async getJobOpportunityGrowth(
        startDate?: Date,
        endDate?: Date,
    ): Promise<JobOpportunityGrowthItem[]> {
        const cacheKey = this.generateCacheKey(startDate, endDate);

        // Try to get from cache first
        const cachedResult = await this.cache.get<JobOpportunityGrowthItem[]>(cacheKey);
        if (cachedResult && cachedResult.length > 0) {
            return cachedResult;
        }

        // Build query to count active jobs per day
        const queryBuilder = this.jobRepository
            .createQueryBuilder('job')
            .select(
                "TO_CHAR(DATE_TRUNC('day', job.createdAt), 'DD/MM/YYYY')",
                'date',
            )
            .addSelect('COUNT(job.id)', 'count')
            .where('job.status = :status', { status: JobStatus.ACTIVE })
            .andWhere('job.deletedAt IS NULL')
            .groupBy("DATE_TRUNC('day', job.createdAt)")
            .orderBy("DATE_TRUNC('day', job.createdAt)", 'ASC');

        // Add date range filter if provided
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            queryBuilder.andWhere('job.createdAt >= :startDate', { startDate: start });
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            queryBuilder.andWhere('job.createdAt <= :endDate', { endDate: end });
        }

        const results = await queryBuilder.getRawMany();

        // Format results to match the required structure
        const statistics: JobOpportunityGrowthItem[] = results.map((result) => ({
            key: result.date as string,
            value: result.count as string,
        }));

        // Cache the results
        await this.cache.set(cacheKey, statistics, {
            ttl: this.CACHE_TTL,
        });

        return statistics;
    }

    /**
     * Invalidate cache for job opportunity growth
     */
    async invalidateCache(startDate?: Date, endDate?: Date): Promise<void> {
        const cacheKey = this.generateCacheKey(startDate, endDate);
        await this.cache.remove(cacheKey);
    }

    /**
     * Invalidate cache for work market statistics
     */
    async invalidateWorkMarketCache(): Promise<void> {
        const cacheKey = this.generateWorkMarketCacheKey();
        await this.cache.remove(cacheKey);
    }
}