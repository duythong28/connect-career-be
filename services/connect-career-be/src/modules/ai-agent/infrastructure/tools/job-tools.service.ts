import { Injectable } from '@nestjs/common';
import { ITool } from '../../domain/interfaces/tool.interface';
import { JobService } from 'src/modules/jobs/api/services/job.service';
import { JobSearchDto } from 'src/modules/jobs/api/dtos/search-job.dto';
import { JobStatus } from 'src/modules/jobs/domain/entities/job.entity';

@Injectable()
export class JobToolsService {
  constructor(private readonly jobService: JobService) {}

  getSearchJobsTool(): ITool {
    return {
      name: 'search_jobs',
      description:
        'Search for jobs based on criteria like title, location, skills, etc.',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'Search query for job title or keywords',
          required: false,
        },
        {
          name: 'location',
          type: 'string',
          description: 'Job location',
          required: false,
        },
        {
          name: 'skills',
          type: 'array',
          description: 'Required skills (array of strings)',
          required: false,
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Maximum number of results',
          required: false,
          default: 10,
        },
        {
          name: 'pageNumber',
          type: 'number',
          description: 'Page number for pagination',
          required: false,
          default: 1,
        },
      ],
      execute: async (params: Record<string, any>) => {
        try {
          const {
            query,
            location,
            skills,
            limit = 10,
            pageNumber = 1,
          } = params;

          // Build search DTO
          const searchDto: any = {
            searchTerm: query,
            location,
            keywords: Array.isArray(skills) ? skills : skills ? [skills] : undefined,
            pageNumber,
            pageSize: limit,
            status: JobStatus.ACTIVE,
            sortBy: 'postedDate',
            sortOrder: 'DESC',
          };

          // Execute search
          const result = await this.jobService.searchJobs(searchDto);

          // Format jobs for response
          const jobs = result.data.map((job) => ({
            id: job.id,
            title: job.title,
            company: job.organization?.name || job.companyName,
            location: job.location,
            country: job.countryCode,
            type: job.type,
            seniorityLevel: job.seniorityLevel,
            summary: job.summary,
            description: job.description?.substring(0, 500),
            salaryRange: job.salaryDetails
              ? {
                  min: job.salaryDetails.minAmount,
                  max: job.salaryDetails.maxAmount,
                  currency: job.salaryDetails.currency,
                }
              : null,
            postedDate: job.postedDate,
            organizationId: job.organizationId,
            organizationLogo: job.organization?.logoFile?.url,
          }));

          return {
            success: true,
            jobs,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            jobs: [],
            total: 0,
          };
        }
      },
    };
  }

  getFilterJobsTool(): ITool {
    return {
      name: 'filter_jobs',
      description: 'Filter jobs by salary range, job type, company, etc.',
      parameters: [
        {
          name: 'salaryMin',
          type: 'number',
          description: 'Minimum salary',
          required: false,
        },
        {
          name: 'salaryMax',
          type: 'number',
          description: 'Maximum salary',
          required: false,
        },
        {
          name: 'jobType',
          type: 'string',
          description: 'Job type (full-time, part-time, contract, etc.)',
          required: false,
        },
        {
          name: 'companyId',
          type: 'string',
          description: 'Company/Organization ID',
          required: false,
        },
        {
          name: 'companyName',
          type: 'string',
          description: 'Company name',
          required: false,
        },
        {
          name: 'seniorityLevel',
          type: 'string',
          description: 'Seniority level (junior, mid, senior, etc.)',
          required: false,
        },
        {
          name: 'location',
          type: 'string',
          description: 'Job location',
          required: false,
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Maximum number of results',
          required: false,
          default: 10,
        },
        {
          name: 'pageNumber',
          type: 'number',
          description: 'Page number for pagination',
          required: false,
          default: 1,
        },
      ],
      execute: async (params: Record<string, any>) => {
        try {
          const {
            salaryMin,
            salaryMax,
            jobType,
            companyId,
            companyName,
            seniorityLevel,
            location,
            limit = 10,
            pageNumber = 1,
          } = params;

          // Build search DTO with filters
          const searchDto: any = {
            minSalary: salaryMin,
            maxSalary: salaryMax,
            type: jobType as any,
            organizationId: companyId,
            companyName,
            seniorityLevel: seniorityLevel, 
            location,
            pageNumber,
            pageSize: limit,
            status: JobStatus.ACTIVE,
            sortBy: 'postedDate',
            sortOrder: 'DESC',
          };

          // Execute search with filters
          const result = await this.jobService.searchJobs(searchDto);

          // Format jobs for response
          const jobs = result.data.map((job) => ({
            id: job.id,
            title: job.title,
            company: job.organization?.name || job.companyName,
            location: job.location,
            country: job.countryCode,
            type: job.type,
            seniorityLevel: job.seniorityLevel,
            summary: job.summary,
            salaryRange: job.salaryDetails
              ? {
                  min: job.salaryDetails.minAmount,
                  max: job.salaryDetails.maxAmount,
                  currency: job.salaryDetails.currency,
                }
              : null,
            postedDate: job.postedDate,
            organizationId: job.organizationId,
            organizationLogo: job.organization?.logoFile?.url,
          }));

          return {
            success: true,
            jobs,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            jobs: [],
            total: 0,
            filters: params,
          };
        }
      },
    };
  }

  getAllTools(): ITool[] {
    return [this.getSearchJobsTool(), this.getFilterJobsTool()];
  }
}