import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { CV } from 'src/modules/cv-maker/domain/entities/cv.entity';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { ApplicationCreatedEvent } from 'src/modules/applications/domain/events/application-created.event';
import { Application } from 'src/modules/applications/domain/entities/application.entity';
import { ApplicationService } from 'src/modules/applications/api/services/application.service';

@Injectable()
@EventsHandler(ApplicationCreatedEvent)
export class ApplicationLLMEvaluationHandler
  implements IEventHandler<ApplicationCreatedEvent>
{
  private readonly logger = new Logger(ApplicationLLMEvaluationHandler.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(CV)
    private readonly cvRepository: Repository<CV>,
    private readonly aiService: AIService,
    private readonly applicationService: ApplicationService,
  ) {}

  async handle(event: ApplicationCreatedEvent): Promise<void> {
    this.logger.log(
      `Evaluating application ${event.applicationId} with LLM for job requirements match`,
    );

    try {
      // Load application with relations
      const application = await this.applicationRepository.findOne({
        where: { id: event.applicationId },
        relations: ['job', 'cv'],
      });

      if (!application) {
        this.logger.warn(
          `Application ${event.applicationId} not found for LLM evaluation`,
        );
        return;
      }

      // Load job with requirements
      const job = await this.jobRepository.findOne({
        where: { id: event.jobId },
      });

      if (!job) {
        this.logger.warn(`Job ${event.jobId} not found for LLM evaluation`);
        return;
      }

      // Check if job has requirements
      if (!job.requirements || job.requirements.length === 0) {
        this.logger.log(
          `Job ${event.jobId} has no requirements, skipping LLM evaluation`,
        );
        return;
      }

      // Load CV if not already loaded
      let cv: CV | null = application.cv || null;
      if (!cv && application.cvId) {
        cv = await this.cvRepository.findOne({
          where: { id: application.cvId },
        });
      }

      // If no CV, skip evaluation
      if (!cv || !cv.content) {
        this.logger.warn(
          `No CV content found for application ${event.applicationId}, skipping LLM evaluation`,
        );
        return;
      }

      // Prepare data for LLM evaluation
      const jobRequirements = job.requirements.join('\n- ');

      // Create LLM prompt
      const prompt = `You are an expert recruiter evaluating a job application. Analyze whether the candidate's CV meets the job requirements.

JOB REQUIREMENTS:
${jobRequirements}

CANDIDATE CV:
${cv.content}

Evaluate if the candidate's CV demonstrates that they meet the job requirements. Consider:
1. Required skills and competencies mentioned in the CV
2. Experience level and relevance shown in the CV
3. Education requirements mentioned in the CV
4. Overall fit for the position based on CV content

Respond in JSON format:
{
  "meetsRequirements": true/false,
  "explanation": "Detailed explanation of why the candidate does or does not meet the requirements based on CV content",
  "missingRequirements": ["list of missing requirements if any"],
  "matchedRequirements": ["list of matched requirements"]
}

Be strict but fair. Only return true if the CV clearly demonstrates that the candidate meets the essential requirements.`;

      // Call LLM
      const llmResponse = await this.aiService.generate({
        prompt,
        temperature: 0.3, // Lower temperature for more consistent evaluation
        maxOutputTokens: 2048,
      });

      // Parse LLM response
      let evaluationResult: {
        meetsRequirements: boolean;
        explanation: string;
        missingRequirements?: string[];
        matchedRequirements?: string[];
      };

      try {
        // Try to parse JSON from response
        const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          evaluationResult = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, assume it doesn't meet requirements
          this.logger.warn(
            `LLM response for application ${event.applicationId} is not valid JSON, defaulting to rejection`,
          );
          evaluationResult = {
            meetsRequirements: false,
            explanation:
              'Unable to parse LLM evaluation. Application requires manual review.',
          };
        }
      } catch (parseError) {
        this.logger.error(
          `Failed to parse LLM response for application ${event.applicationId}: ${parseError.message}`,
        );
        // Default to not meeting requirements if parsing fails
        evaluationResult = {
          meetsRequirements: false,
          explanation:
            'Error parsing LLM evaluation. Application requires manual review.',
        };
      }

      // If candidate doesn't meet requirements, reject the application
      if (!evaluationResult.meetsRequirements) {
        const rejectionReason = 'LLM Evaluation: CV does not meet job requirements';
        const rejectionFeedback = `LLM Evaluation Result:\n\n${evaluationResult.explanation}\n\n${
          evaluationResult.missingRequirements?.length
            ? `Missing Requirements:\n${evaluationResult.missingRequirements.map((req) => `- ${req}`).join('\n')}\n\n`
            : ''
        }${
          evaluationResult.matchedRequirements?.length
            ? `Matched Requirements:\n${evaluationResult.matchedRequirements.map((req) => `- ${req}`).join('\n')}`
            : ''
        }`;

        // Reject application using the application service
        // Use system user ID or the recruiter ID if available
        const rejectedBy = event.recruiterId || 'system';

        await this.applicationService.rejectApplication(
          event.applicationId,
          rejectionReason,
          rejectionFeedback,
          rejectedBy,
        );

        this.logger.log(
          `Application ${event.applicationId} rejected by LLM evaluation. Reason: ${evaluationResult.explanation}`,
        );
      } else {
        this.logger.log(
          `Application ${event.applicationId} passed LLM evaluation and meets job requirements`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in LLM evaluation for application ${event.applicationId}: ${error.message}`,
        error.stack,
      );
      // Don't throw error - we don't want to break the application creation flow
      // The application will remain in its current state if LLM evaluation fails
    }
  }
}