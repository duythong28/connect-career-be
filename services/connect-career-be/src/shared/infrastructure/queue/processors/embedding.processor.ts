import { HttpService } from "@nestjs/axios";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";
import { firstValueFrom } from "rxjs";

export interface JobEmbeddingData { 
    jobId: string;
    title: string; 
    description: string; 
    summary?: string; 
    location: string;
    jobFunction?: string;
    seniorityLevel?: string;
    type?: string; 
    requirements?: string[];
    keywords?: string[];
    organizationName?: string; 
    organizationShortDescription?: string;
    organizationIndustry?: string;
    organizationLongDescription?: string;
}

export interface UserEmbeddingData { 
    userId: string; 
    skills?: string[];
    languages?: string[];
    workExperiences?: Array<{
        jobTitle: string;
        description?: string;
        skills: string[];
    }>;
    educations?: Array<{
        institutionName?: string;
        fieldOfStudy?: string;
        degreeType?: string;
        coursework?: string[];
    }>;
    preferences?: {
        skillsLike?: string[];
        preferredLocations?: string[];
        preferredRoleTypes?: string[];
        industriesLike?: string[];
      };
    recentInteractions?: Array<{ jobTitle?: string }>;
}

@Processor('embedding-jobs')
export class JobEmbeddingProcessor extends WorkerHost {
    private readonly logger = new Logger(JobEmbeddingProcessor.name); 

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ){
        super();
    }

    async process(job: Job<JobEmbeddingData>): Promise<void>{
        const { jobId, ...jobData } = job.data;
        this.logger.log(`Processing job embedding for jobId: ${jobId}`);
        try {
            const aiServiceUrl =
                this.configService.get<string>('AI_RECOMMENDER_URL') ||
                'http://ai-service:8000';

            await firstValueFrom(
                this.httpService.post(`${aiServiceUrl}/api/v1/embeddings/job`, {
                jobId,
                ...jobData,
                }),
            );
            this.logger.log(`Successfully generated embedding for jobId: ${jobId}`);
        }   
        catch (error){
            this.logger.error(
                `Failed to generate embedding for jobId: ${jobId}`,
                error,
              );
              throw error;      
        }    
    }
}

@Processor('embedding-users')
export class UserEmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(UserEmbeddingProcessor.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<UserEmbeddingData>): Promise<void> {
    const { userId, ...userData } = job.data;
    this.logger.log(`Processing user embedding for userId: ${userId}`);

    try {
      const aiServiceUrl =
        this.configService.get<string>('AI_RECOMMENDER_URL') ||
        'http://ai-service:8000';

      await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/api/v1/embeddings/user`, {
          userId,
          ...userData,
        }),
      );

      this.logger.log(`Successfully generated embedding for userId: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding for userId: ${userId}`,
        error,
      );
      throw error;
    }
  }
}

@Processor('batch-embeddings')
export class BatchEmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchEmbeddingProcessor.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<{ type: 'jobs' | 'users' }>): Promise<void> {
    const { type } = job.data;
    this.logger.log(`Processing batch embedding for type: ${type}`);

    try {
      const aiServiceUrl =
        this.configService.get<string>('AI_RECOMMENDER_URL') ||
        'http://ai-service:8000';

      await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/api/v1/embeddings/batch`, {
          type,
        }),
      );

      this.logger.log(`Successfully processed batch embeddings for ${type}`);
    } catch (error) {
      this.logger.error(`Failed batch embedding for ${type}`, error);
      throw error;
    }
  }
}

@Processor('cf-training')
export class CFTrainingProcessor extends WorkerHost {
  private readonly logger = new Logger(CFTrainingProcessor.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log('Starting CF training...');

    try {
      const aiServiceUrl =
        this.configService.get<string>('AI_RECOMMENDER_URL') ||
        'http://ai-service:8000';

      await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/api/v1/cf/train`),
      );

      this.logger.log('CF training completed successfully');
    } catch (error) {
      this.logger.error('CF training failed', error);
      throw error;
    }
  }
}