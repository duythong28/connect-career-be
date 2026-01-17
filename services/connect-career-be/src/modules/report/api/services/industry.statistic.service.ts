import { Inject, Injectable } from "@nestjs/common";
import { Job, JobStatus } from "src/modules/jobs/domain/entities/job.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as distributedCacheInterface from "src/shared/infrastructure/cache/interfaces/distributed-cache.interface";

export interface IndustryStatisticItem {
    key: string;
    value: string;
}

export interface IndustryNameStatisticItem {
    key: string;
    value: number;
    time_scan: string;
}
    
@Injectable()
export class IndustryStatisticService { 
    private readonly CACHE_KEY_PREFIX = 'industry-statistic:';
    private readonly CACHE_KEY_PREFIX_BY_NAME = 'industry-statistic-by-name:';
    private readonly CACHE_TTL = 60 * 60 * 24; // 24 hours

    constructor(
        @InjectRepository(Job)
        private readonly jobRepository: Repository<Job>,
        @Inject('IDistributedCache')
        private readonly cache: distributedCacheInterface.IDistributedCache,
    ) {}

    private generateCacheKey(
        startDate?: Date,
        endDate?: Date,
        industryId?: string,
    ): string {
        if (startDate && endDate) {
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            const industryPart = industryId ? `:${industryId}` : '';
            return `${this.CACHE_KEY_PREFIX}${startDateStr}:${endDateStr}${industryPart}`;
        }
        return `${this.CACHE_KEY_PREFIX}all${industryId ? `:${industryId}` : ''}`;
    }

    private generateCacheKeyByName(): string {
        return `${this.CACHE_KEY_PREFIX_BY_NAME}all`;
    }

    /**
     * Get statistics grouped by industry name
     * Returns count of active jobs per industry
     * Optionally filters by date range and specific industry
     */
    async getIndustryStatistics(
        startDate?: Date,
        endDate?: Date,
        industryId?: string,
    ): Promise<IndustryStatisticItem[]>
    {
        const cacheKey = this.generateCacheKey(startDate, endDate, industryId);

        const cachedResult = await this.cache.get<IndustryStatisticItem[]>(cacheKey);
        if (cachedResult && cachedResult.length > 0) {
            return cachedResult;
        }

        // Build query to count jobs by industry name
        const queryBuilder = this.jobRepository
            .createQueryBuilder('job')
            .leftJoin('job.organization', 'organization')
            .leftJoin('organization.industry', 'industry')
            .select('industry.name', 'industryName')
            .addSelect('COUNT(job.id)', 'count')
            .where('job.status = :status', { status: JobStatus.ACTIVE })
            .andWhere('job.deletedAt IS NULL')
            .andWhere('organization.industryId IS NOT NULL')
            .andWhere('industry.isActive = :isActive', { isActive: true })
            .groupBy('industry.name')
            .orderBy('COUNT(job.id)', 'DESC');

        // Filter by date range if provided
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

        // Filter by specific industry if provided
        if (industryId) {
            queryBuilder.andWhere('organization.industryId = :industryId', {
                industryId,
            });
        }

        const results = await queryBuilder.getRawMany();

        // Format results to match the required structure
        const statistics: IndustryStatisticItem[] = results.map((result) => ({
            key: result.industryName as string,
            value: result.count as string,
        }));

        // Cache the results
        await this.cache.set(cacheKey, statistics, {
            ttl: this.CACHE_TTL,
        });

        return statistics;
    }

    /**
     * Get statistics grouped by industry name (without date filtering)
     * Returns count of active jobs per industry
     * This is a convenience method that calls getIndustryStatistics without date params
     */
    async getIndustryStatisticsByName(): Promise<IndustryNameStatisticItem[]> {
        const cacheKey = this.generateCacheKeyByName();
        const timeScan = new Date().toISOString();

        // Try to get from cache first
        const cachedResult = await this.cache.get<IndustryNameStatisticItem[]>(cacheKey);
        if (cachedResult && cachedResult.length > 0) {
            // Update time_scan to current time even if cached
            return cachedResult.map(item => ({
                ...item,
                time_scan: timeScan,
            }));
        }

        // Get statistics without date filter
        const statistics = await this.getIndustryStatistics();

        // Format to include time_scan
        const statisticsWithTime: IndustryNameStatisticItem[] = statistics.map((item) => ({
            key: item.key,
            value: parseInt(item.value, 10),
            time_scan: timeScan,
        }));

        // Cache the results
        await this.cache.set(cacheKey, statisticsWithTime, {
            ttl: this.CACHE_TTL,
        });

        return statisticsWithTime;
    }

    /**
     * Invalidate cache for industry statistics
     * Useful when jobs are created/updated/deleted
     */
    async invalidateCache(
        startDate?: Date,
        endDate?: Date,
        industryId?: string,
    ): Promise<void> {
        const cacheKey = this.generateCacheKey(startDate, endDate, industryId);
        await this.cache.remove(cacheKey);
    }

    /**
     * Invalidate cache for industry statistics by name
     */
    async invalidateCacheByName(): Promise<void> {
        const cacheKey = this.generateCacheKeyByName();
        await this.cache.remove(cacheKey);
    }

    /**
     * Invalidate all industry statistics cache
     * Use with caution - this will clear all cached statistics
     */
    async invalidateAllCache(): Promise<void> {
        // Invalidate both caches
        await this.invalidateCacheByName();
    }
}