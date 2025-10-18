import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Application,
  ApplicationStatus,
} from '../../domain/entities/application.entity';
import { HiringPipeline } from '../../../hiring-pipeline/domain/entities/hiring-pipeline.entity';
import { PipelineStage } from '../../../hiring-pipeline/domain/entities/pipeline-stage.entity';
import { ChangeApplicationStageDto } from '../dtos/application-detail.dto';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';

@Injectable()
export class ApplicationStatusService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(HiringPipeline)
    private readonly pipelineRepository: Repository<HiringPipeline>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async changeApplicationStage(
    applicationId: string,
    changeDto: ChangeApplicationStageDto,
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Get the job's active hiring pipeline
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const job = await this.jobRepository.findOne({
      where: { id: application.jobId },
      relations: ['hiringPipeline'],
    });
    const pipeline = job?.hiringPipeline;

    if (!pipeline) {
      throw new BadRequestException(
        'No active hiring pipeline found for this job',
      );
    }

    const targetStage = pipeline.stages.find(
      (stage) => stage.key === changeDto.stageKey,
    );
    if (!targetStage) {
      throw new BadRequestException(
        `Stage '${changeDto.stageKey}' not found in the hiring pipeline`,
      );
    }

    const currentStage = await this.getCurrentApplicationStage(
      application,
      pipeline,
    );

    // Validate stage transition
    if (currentStage) {
      await this.validateStageTransition(
        pipeline,
        currentStage.key,
        changeDto.stageKey,
      );
    }

    // Map stage to application status
    const newStatus = this.mapStageToApplicationStatus(targetStage);

    application.status = newStatus;
    application.lastStatusChange = new Date();
    application.daysInCurrentStatus = 0;

    // Add to status history
    const statusHistory = application.statusHistory || [];
    statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: changeDto.changedBy,
      reason: changeDto.notes,
      stageKey: targetStage.key,
      stageName: targetStage.name,
    });
    application.statusHistory = statusHistory;

    // Update calculated fields
    application.updateCalculatedFields();

    return this.applicationRepository.save(application);
  }

  async getAvailableNextStages(
    applicationId: string,
  ): Promise<PipelineStage[]> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const pipeline = await this.pipelineRepository.findOne({
      where: { jobs: { id: application.jobId } },
      relations: ['stages', 'transitions'],
    });

    if (!pipeline) {
      return [];
    }

    const currentStage = await this.getCurrentApplicationStage(
      application,
      pipeline,
    );
    if (!currentStage) {
      return pipeline.stages.filter((stage) => stage.order === 1); // Return first stage
    }

    // Find stages that can be transitioned to from current stage
    const availableTransitions = pipeline.transitions.filter(
      (t) => t.fromStageKey === currentStage.key,
    );

    const nextStageKeys = availableTransitions.map((t) => t.toStageKey);
    return pipeline.stages.filter((stage) => nextStageKeys.includes(stage.key));
  }

  private async getCurrentApplicationStage(
    application: Application,
    pipeline: HiringPipeline,
  ): Promise<PipelineStage | null> {
    return (
      pipeline.stages.find(
        (stage) =>
          this.mapStageToApplicationStatus(stage) === application.status,
      ) || null
    );
  }

  private mapStageToApplicationStatus(stage: PipelineStage): ApplicationStatus {
    switch (stage.type) {
      case 'sourcing':
        return ApplicationStatus.LEAD;
      case 'screening':
        return ApplicationStatus.SCREENING;
      case 'interview':
        return ApplicationStatus.INTERVIEW_SCHEDULED;
      case 'offer':
        return ApplicationStatus.OFFER_PENDING;
      case 'hired':
        return ApplicationStatus.HIRED;
      case 'rejected':
        return ApplicationStatus.REJECTED;
      case 'on-hold':
        return ApplicationStatus.ON_HOLD;
      default:
        if (stage.key.includes('review')) return ApplicationStatus.UNDER_REVIEW;
        if (stage.key.includes('shortlist'))
          return ApplicationStatus.SHORTLISTED;
        if (stage.key.includes('reference'))
          return ApplicationStatus.REFERENCE_CHECK;
        return ApplicationStatus.UNDER_REVIEW;
    }
  }

  private async validateStageTransition(
    pipeline: HiringPipeline,
    fromStageKey: string,
    toStageKey: string,
  ): Promise<void> {
    // Check if transition exists in pipeline
    const transition = pipeline.transitions.find(
      (t) => t.fromStageKey === fromStageKey && t.toStageKey === toStageKey,
    );

    if (!transition) {
      throw new BadRequestException(
        `Invalid stage transition from '${fromStageKey}' to '${toStageKey}' in the hiring pipeline`,
      );
    }
  }
}
