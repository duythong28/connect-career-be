import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HiringPipeline } from '../../domain/entities/hiring-pipeline.entity';
import { PipelineStage } from '../../domain/entities/pipeline-stage.entity';
import { PipelineTransition } from '../../domain/entities/pipeline-transition.entity';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateStageDto,
  UpdateStageDto,
  ReorderStagesDto,
  CreateTransitionDto,
  UpdateTransitionDto,
  PipelineValidationResultDto,
  AssignJobToPipelineDto,
  RemoveJobFromPipelineDto,
} from '../dtos/hiring-pipeline.dto';

@Injectable()
export class HiringPipelineRecruiterService {
  constructor(
    @InjectRepository(HiringPipeline)
    private readonly pipelineRepository: Repository<HiringPipeline>,
    @InjectRepository(PipelineStage)
    private readonly stageRepository: Repository<PipelineStage>,
    @InjectRepository(PipelineTransition)
    private readonly transitionRepository: Repository<PipelineTransition>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async createPipeline(createPipelineDto: CreatePipelineDto): Promise<HiringPipeline | null> {
    const { name, organizationId, description } = createPipelineDto;

    // Check if organization exists
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const existingPipeline = await this.pipelineRepository.findOne({
      where: { name, organizationId },
    });

    if (existingPipeline) {
      throw new ConflictException('Pipeline with this name already exists for this organization');
    }

    const pipeline = this.pipelineRepository.create({
      name,
      organizationId,
      description,
      active: true,
    });

    return this.pipelineRepository.save(pipeline);
  }

  async findAllPipelines(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ pipelines: HiringPipeline[]; total: number; page: number; limit: number }> {
    const [pipelines, total] = await this.pipelineRepository.findAndCount({
      where: { organizationId },
      relations: ['jobs', 'stages', 'transitions'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      pipelines,
      total,
      page,
      limit,
    };
  }

  async findActivePipelines(organizationId: string): Promise<HiringPipeline[]> {
    return this.pipelineRepository.find({
      where: { organizationId, active: true },
      relations: ['jobs', 'stages', 'transitions'],
      order: { name: 'ASC' },
    });
  }

  async findPipelineById(id: string): Promise<HiringPipeline> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id },
      relations: ['organization', 'jobs', 'stages', 'transitions'],
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    return pipeline;
  }

  async findPipelineByJobId(jobId: string): Promise<HiringPipeline | null> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['hiringPipeline', 'hiringPipeline.stages', 'hiringPipeline.transitions'],
    });

    return job?.hiringPipeline || null;
  }

  async updatePipeline(id: string, updatePipelineDto: UpdatePipelineDto): Promise<HiringPipeline | null> {
    const pipeline = await this.findPipelineById(id);
    const { name, description, active } = updatePipelineDto;

    if (name && name !== pipeline.name) {
      const existingPipeline = await this.pipelineRepository.findOne({
        where: { name, organizationId: pipeline.organizationId },
      });

      if (existingPipeline) {
        throw new ConflictException('Pipeline with this name already exists for this organization');
      }
    }

    await this.pipelineRepository.update(id, {
      name,
      description,
      active,
    });

    return this.findPipelineById(id);
  }

  async deletePipeline(id: string): Promise<void> {
    const pipeline = await this.findPipelineById(id);
    
    await this.jobRepository.update(
      { hiringPipelineId: id },
      { hiringPipelineId: undefined }
    );
    
    await this.stageRepository.delete({ pipelineId: id });
    await this.transitionRepository.delete({ pipelineId: id });
    await this.pipelineRepository.delete(id);
  }

  // Job-Pipeline Management
  async assignJobToPipeline(pipelineId: string, assignDto: AssignJobToPipelineDto): Promise<HiringPipeline> {
    const pipeline = await this.findPipelineById(pipelineId);
    const job = await this.jobRepository.findOne({ 
      where: { id: assignDto.jobId },
      relations: ['hiringPipeline']
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check if job belongs to the same organization
    if (job.organizationId !== pipeline.organizationId) {
      throw new BadRequestException('Job does not belong to the pipeline organization');
    }

    // Check if job already has a pipeline
    if (job.hiringPipeline) {
      throw new ConflictException('Job already has a hiring pipeline');
    }

    // Assign job to pipeline
    await this.jobRepository.update(assignDto.jobId, { hiringPipelineId: pipelineId });

    return this.findPipelineById(pipelineId);
  }


  async removeJobFromPipeline(pipelineId: string, jobId: string): Promise<HiringPipeline> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId, hiringPipelineId: pipelineId },
    });

    if (!job) {
      throw new NotFoundException('Job not found or not assigned to this pipeline');
    }
    await this.jobRepository.update(jobId, { hiringPipelineId: undefined });

    return this.findPipelineById(pipelineId);
  }

  async getJobsForPipeline(pipelineId: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: { hiringPipelineId: pipelineId },
      relations: ['organization'],
    });
  }

  async createStage(pipelineId: string, createStageDto: CreateStageDto): Promise<PipelineStage> {
    const pipeline = await this.findPipelineById(pipelineId);
    
    // Check for key conflicts
    const existingStage = await this.stageRepository.findOne({
      where: { pipelineId, key: createStageDto.key },
    });

    if (existingStage) {
      throw new ConflictException('Stage with this key already exists in this pipeline');
    }

    const stage = this.stageRepository.create({
      ...createStageDto,
      pipelineId,
    });

    return this.stageRepository.save(stage);
  }

  async findStagesByPipelineId(pipelineId: string): Promise<PipelineStage[]> {
    return this.stageRepository.find({
      where: { pipelineId },
      order: { order: 'ASC' },
    });
  }

  async findStageById(id: string): Promise<PipelineStage> {
    const stage = await this.stageRepository.findOne({ where: { id } });
    if (!stage) {
      throw new NotFoundException('Stage not found');
    }
    return stage;
  }

  async updateStage(id: string, updateStageDto: UpdateStageDto): Promise<PipelineStage | null> {
    const stage = await this.findStageById(id);
    
    // Check for key conflicts if key is being updated
    if (updateStageDto.key && updateStageDto.key !== stage.key) {
      const existingStage = await this.stageRepository.findOne({
        where: { pipelineId: stage.pipelineId, key: updateStageDto.key },
      });

      if (existingStage) {
        throw new ConflictException('Stage with this key already exists in this pipeline');
      }
    }

    await this.stageRepository.update(id, updateStageDto);
    return this.stageRepository.findOne({ where: { id } });
  }

  async deleteStage(id: string): Promise<void> {
    const stage = await this.findStageById(id);
    
    // Check if stage is referenced in transitions
    const transitions = await this.transitionRepository.find({
      where: [
        { fromStageKey: stage.key },
        { toStageKey: stage.key },
      ],
    });

    if (transitions.length > 0) {
      throw new BadRequestException('Cannot delete stage referenced in transitions');
    }

    await this.stageRepository.delete(id);
  }

  async reorderStages(pipelineId: string, reorderStagesDto: ReorderStagesDto): Promise<void> {
    const pipeline = await this.findPipelineById(pipelineId);
    
    // Validate that all stage IDs belong to this pipeline
    const stages = await this.stageRepository.findBy({ 
      id: In(reorderStagesDto.stageIdsInOrder),
      pipelineId 
    });

    if (stages.length !== reorderStagesDto.stageIdsInOrder.length) {
      throw new BadRequestException('Invalid stage IDs provided');
    }

    // Update order for each stage
    for (let i = 0; i < reorderStagesDto.stageIdsInOrder.length; i++) {
      await this.stageRepository.update(reorderStagesDto.stageIdsInOrder[i], { order: i + 1 });
    }
  }

  // Transition Management
  async createTransition(pipelineId: string, createTransitionDto: CreateTransitionDto): Promise<PipelineTransition> {
    const pipeline = await this.findPipelineById(pipelineId);
    
    // Validate stage keys exist
    const fromStage = await this.stageRepository.findOne({
      where: { pipelineId, key: createTransitionDto.fromStageKey },
    });
    const toStage = await this.stageRepository.findOne({
      where: { pipelineId, key: createTransitionDto.toStageKey },
    });

    if (!fromStage || !toStage) {
      throw new BadRequestException('Invalid stage keys provided');
    }

    // Check for existing transition
    const existingTransition = await this.transitionRepository.findOne({
      where: {
        pipelineId,
        fromStageKey: createTransitionDto.fromStageKey,
        toStageKey: createTransitionDto.toStageKey,
      },
    });

    if (existingTransition) {
      throw new ConflictException('Transition already exists');
    }

    const transition = this.transitionRepository.create({
      ...createTransitionDto,
      pipelineId,
    });

    return this.transitionRepository.save(transition);
  }

  async findTransitionsByPipelineId(pipelineId: string): Promise<PipelineTransition[]> {
    return this.transitionRepository.find({
      where: { pipelineId },
    });
  }

  async findTransitionById(id: string): Promise<PipelineTransition> {
    const transition = await this.transitionRepository.findOne({ where: { id } });
    if (!transition) {
      throw new NotFoundException('Transition not found');
    }
    return transition;
  }

  async updateTransition(id: string, updateTransitionDto: UpdateTransitionDto): Promise<PipelineTransition | null> {
    const transition = await this.findTransitionById(id);
    
    // Validate stage keys if being updated
    if (updateTransitionDto.fromStageKey || updateTransitionDto.toStageKey) {
      const fromStageKey = updateTransitionDto.fromStageKey || transition.fromStageKey;
      const toStageKey = updateTransitionDto.toStageKey || transition.toStageKey;
      
      const fromStage = await this.stageRepository.findOne({
        where: { pipelineId: transition.pipelineId, key: fromStageKey },
      });
      const toStage = await this.stageRepository.findOne({
        where: { pipelineId: transition.pipelineId, key: toStageKey },
      });

      if (!fromStage || !toStage) {
        throw new BadRequestException('Invalid stage keys provided');
      }

      // Check for conflicts if keys are being changed
      if (fromStageKey !== transition.fromStageKey || toStageKey !== transition.toStageKey) {
        const existingTransition = await this.transitionRepository.findOne({
          where: {
            pipelineId: transition.pipelineId,
            fromStageKey,
            toStageKey,
          },
        });

        if (existingTransition) {
          throw new ConflictException('Transition already exists');
        }
      }
    }

    await this.transitionRepository.update(id, updateTransitionDto);
    return this.transitionRepository.findOne({ where: { id } });
  }

  async deleteTransition(id: string): Promise<void> {
    const transition = await this.findTransitionById(id);
    await this.transitionRepository.delete(id);
  }

  // Validation
  async validatePipeline(id: string): Promise<PipelineValidationResultDto> {
    const pipeline = await this.findPipelineById(id);
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check if pipeline has stages
    if (!pipeline.stages || pipeline.stages.length === 0) {
      issues.push('Pipeline has no stages');
    }

    // Check if pipeline has transitions
    if (!pipeline.transitions || pipeline.transitions.length === 0) {
      issues.push('Pipeline has no transitions');
    }

    // Check for orphaned stages (stages not connected by transitions)
    if (pipeline.stages && pipeline.transitions) {
      const connectedStages = new Set<string>();
      pipeline.transitions.forEach(transition => {
        connectedStages.add(transition.fromStageKey);
        connectedStages.add(transition.toStageKey);
      });

      const orphanedStages = pipeline.stages.filter(stage => !connectedStages.has(stage.key));
      if (orphanedStages.length > 0) {
        warnings.push(`Orphaned stages found: ${orphanedStages.map(s => s.name).join(', ')}`);
      }
    }

    // Check for unreachable stages
    if (pipeline.stages && pipeline.transitions) {
      const reachableStages = new Set<string>();
      const firstStage = pipeline.stages.find(s => s.order === 1);
      if (firstStage) {
        reachableStages.add(firstStage.key);
        // TODO: Implement BFS to find all reachable stages
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}