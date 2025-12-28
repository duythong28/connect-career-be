import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationMatchingScoreRequestedEvent } from '../../domain/events/application-matching-score-requested.event';
import { Application } from '../../domain/entities/application.entity';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { CV } from 'src/modules/cv-maker/domain/entities/cv.entity';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface AIMatchingScoreResponse {
  overallScore: number;
  breakdown: {
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    locationMatch: number;
  };
  explanation: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  details: {
    matchedSkills: string[];
    missingSkills: string[];
    yearsExperience: number;
    requiredExperience: number;
    educationLevel: string;
    requiredEducation: string;
  };
}

@Injectable()
@EventsHandler(ApplicationMatchingScoreRequestedEvent)
export class ApplicationMatchingScoreRequestedHandler
  implements IEventHandler<ApplicationMatchingScoreRequestedEvent>
{
  private readonly logger = new Logger(
    ApplicationMatchingScoreRequestedHandler.name,
  );

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(CV)
    private readonly cvRepository: Repository<CV>,
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: ApplicationMatchingScoreRequestedEvent): Promise<void> {
    this.logger.log(
      `Processing matching score calculation for application ${event.applicationId}`,
    );
    this.logger.log('event', event);

    try {
      // Load application
      const application = await this.applicationRepository.findOne({
        where: { id: event.applicationId },
      });

      if (!application) {
        this.logger.warn(
          `Application ${event.applicationId} not found for score calculation`,
        );
        return;
      }

      // Load job
      const job = await this.jobRepository.findOne({
        where: { id: event.jobId },
      });

      if (!job) {
        this.logger.warn(`Job ${event.jobId} not found for score calculation`);
        return;
      }

      // Load CV if provided
      let cv: CV | null = null;
      if (event.cvId) {
        cv = await this.cvRepository.findOne({
          where: { id: event.cvId },
        });
      } else if (application.cvId) {
        cv = await this.cvRepository.findOne({
          where: { id: application.cvId },
        });
      }

      // Load candidate profile if provided
      let candidateProfile: CandidateProfile | null = null;
      if (event.candidateProfileId) {
        candidateProfile = await this.candidateProfileRepository.findOne({
          where: { id: event.candidateProfileId },
        });
      } else if (application.candidateProfileId) {
        candidateProfile = await this.candidateProfileRepository.findOne({
          where: { id: application.candidateProfileId },
        });
      }
      // If no CV, set score to 0
      if (!cv || !cv.content) {
        this.logger.warn(
          `No CV found for application ${event.applicationId}, setting score to 0`,
        );
        application.matchingScore = 0;
        application.matchingDetails = {
          skillsMatch: 0,
          experienceMatch: 0,
          educationMatch: 0,
          locationMatch: 0,
          overallScore: 0,
        };
        application.isAutoScored = true;
        application.lastScoredAt = new Date();
        await this.applicationRepository.save(application);
        return;
      }

      // Call AI service to calculate matching score
      const aiServiceUrl =
        this.configService.get<string>('AI_RECOMMENDER_URL') ||
        'http://ai-service:8000';

      const requestPayload = {
        applicationId: event.applicationId,
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          summary: job.summary,
          location: job.location,
          jobFunction: job.jobFunction,
          seniorityLevel: job.seniorityLevel,
          type: job.type,
          requirements: job.requirements || [],
          keywords: job.keywords || [],
        },
        cv: {
          id: cv.id,
          content: cv.content,
        },
        candidateProfile: candidateProfile
          ? {
              id: candidateProfile.id,
              skills: candidateProfile.skills || [],
              languages: candidateProfile.languages || [],
            }
          : null,
      };

      this.logger.debug(
        `Calling AI service for matching score: ${aiServiceUrl}/api/v1/matching-score/calculate`,
      );

      const response = await firstValueFrom(
        this.httpService.post<AIMatchingScoreResponse>(
          `${aiServiceUrl}/api/v1/matching-score/calculate`,
          requestPayload,
          {
            timeout: 30000, // 30 seconds timeout
          },
        ),
      );

      const aiResult = response.data;

      // Update application with AI-calculated score
      application.matchingScore =
        Math.round(aiResult.overallScore * 100 * 100) / 100; // Round to 2 decimal places
      application.matchingDetails = {
        skillsMatch:
          Math.round(aiResult.breakdown.skillsMatch * 100 * 100) / 100,
        experienceMatch:
          Math.round(aiResult.breakdown.experienceMatch * 100 * 100) / 100,
        educationMatch:
          Math.round(aiResult.breakdown.educationMatch * 100 * 100) / 100,
        locationMatch:
          Math.round(aiResult.breakdown.locationMatch * 100 * 100) / 100,
        overallScore: Math.round(aiResult.overallScore * 100 * 100) / 100,
        explanation: aiResult.explanation,
        details: aiResult.details,
      };
      application.isAutoScored = true;
      application.lastScoredAt = new Date();

      await this.applicationRepository.save(application);

      this.logger.log(
        `Successfully calculated matching score ${application.matchingScore} for application ${event.applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to calculate matching score for application ${event.applicationId}: ${error.message}`,
        error.stack,
      );

      // Fallback: Set score to 0 and mark as error
      try {
        const application = await this.applicationRepository.findOne({
          where: { id: event.applicationId },
        });
        if (application) {
          application.matchingScore = 0;
          application.isAutoScored = false;
          await this.applicationRepository.save(application);
        }
      } catch (fallbackError) {
        this.logger.error(
          `Failed to update application after error: ${fallbackError.message}`,
        );
      }
    }
  }
}
