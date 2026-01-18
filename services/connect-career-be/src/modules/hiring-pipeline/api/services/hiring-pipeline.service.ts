import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HiringPipeline } from '../../domain/entities/hiring-pipeline.entity';
import {
  PipelineStage,
  PipelineStageType,
} from '../../domain/entities/pipeline-stage.entity';
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
  UpdatePipelineComprehensiveDto,
  CreatePipelineComprehensiveDto,
  PipelineResponse,
} from '../dtos/hiring-pipeline.dto';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';

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
    private readonly aiService: AIService,
  ) { }

  async createPipeline(
    createPipelineDto: CreatePipelineDto,
  ): Promise<HiringPipeline | null> {
    const { name, organizationId, description } = createPipelineDto;

    // Check if organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const existingPipeline = await this.pipelineRepository.findOne({
      where: { name, organizationId },
    });

    if (existingPipeline) {
      throw new ConflictException(
        'Pipeline with this name already exists for this organization',
      );
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
  ): Promise<{
    pipelines: HiringPipeline[];
    total: number;
    page: number;
    limit: number;
  }> {
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
    const pipelines = await this.pipelineRepository
      .createQueryBuilder('pipeline')
      .leftJoinAndSelect('pipeline.jobs', 'jobs')
      .leftJoinAndSelect('pipeline.stages', 'stages')
      .leftJoinAndSelect('pipeline.transitions', 'transitions')
      .where('pipeline.organizationId = :organizationId', { organizationId })
      .andWhere('pipeline.active = :active', { active: true })
      .orderBy('pipeline.createdAt', 'ASC')
      .addOrderBy('stages.order', 'ASC')
      .getMany();

    return pipelines;
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
      relations: [
        'hiringPipeline',
        'hiringPipeline.stages',
        'hiringPipeline.transitions',
      ],
    });

    return job?.hiringPipeline || null;
  }

  async updatePipeline(
    id: string,
    updatePipelineDto: UpdatePipelineDto,
  ): Promise<HiringPipeline | null> {
    const pipeline = await this.findPipelineById(id);
    const { name, description, active } = updatePipelineDto;

    if (name && name !== pipeline.name) {
      const existingPipeline = await this.pipelineRepository.findOne({
        where: { name, organizationId: pipeline.organizationId },
      });

      if (existingPipeline) {
        throw new ConflictException(
          'Pipeline with this name already exists for this organization',
        );
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
    await this.findPipelineById(id);
    await this.jobRepository
      .createQueryBuilder()
      .update()
      .set({ hiringPipelineId: null as unknown as string })
      .where('hiringPipelineId = :pipelineId', { pipelineId: id })
      .execute();

    await this.stageRepository.delete({ pipelineId: id });
    await this.transitionRepository.delete({ pipelineId: id });
    await this.pipelineRepository.delete(id);
  }

  // Job-Pipeline Management
  async assignJobToPipeline(
    pipelineId: string,
    assignDto: AssignJobToPipelineDto,
  ): Promise<HiringPipeline> {
    const pipeline = await this.findPipelineById(pipelineId);
    const job = await this.jobRepository.findOne({
      where: { id: assignDto.jobId },
      relations: ['hiringPipeline'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check if job belongs to the same organization
    if (job.organizationId !== pipeline.organizationId) {
      throw new BadRequestException(
        'Job does not belong to the pipeline organization',
      );
    }

    // Check if job already has a pipeline
    if (job.hiringPipeline) {
      throw new ConflictException('Job already has a hiring pipeline');
    }

    // Assign job to pipeline
    await this.jobRepository.update(assignDto.jobId, {
      hiringPipelineId: pipelineId,
    });

    return this.findPipelineById(pipelineId);
  }

  async removeJobFromPipeline(
    pipelineId: string,
    jobId: string,
  ): Promise<HiringPipeline> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId, hiringPipelineId: pipelineId },
    });

    if (!job) {
      throw new NotFoundException(
        'Job not found or not assigned to this pipeline',
      );
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

  async createStage(
    pipelineId: string,
    createStageDto: CreateStageDto,
  ): Promise<PipelineStage> {
    const pipeline = await this.findPipelineById(pipelineId);

    // Check for key conflicts
    const existingStage = await this.stageRepository.findOne({
      where: { pipelineId, key: createStageDto.key },
    });

    if (existingStage) {
      throw new ConflictException(
        'Stage with this key already exists in this pipeline',
      );
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

  async updateStage(
    id: string,
    updateStageDto: UpdateStageDto,
  ): Promise<PipelineStage | null> {
    const stage = await this.findStageById(id);

    // Check for key conflicts if key is being updated
    if (updateStageDto.key && updateStageDto.key !== stage.key) {
      const existingStage = await this.stageRepository.findOne({
        where: { pipelineId: stage.pipelineId, key: updateStageDto.key },
      });

      if (existingStage) {
        throw new ConflictException(
          'Stage with this key already exists in this pipeline',
        );
      }
    }

    await this.stageRepository.update(id, updateStageDto);
    return this.stageRepository.findOne({ where: { id } });
  }

  async deleteStage(id: string): Promise<void> {
    const stage = await this.findStageById(id);

    // Check if stage is referenced in transitions
    const transitions = await this.transitionRepository.find({
      where: [{ fromStageKey: stage.key }, { toStageKey: stage.key }],
    });

    if (transitions.length > 0) {
      throw new BadRequestException(
        'Cannot delete stage referenced in transitions',
      );
    }

    await this.stageRepository.delete(id);
  }

  async reorderStages(
    pipelineId: string,
    reorderStagesDto: ReorderStagesDto,
  ): Promise<void> {
    const pipeline = await this.findPipelineById(pipelineId);

    // Validate that all stage IDs belong to this pipeline
    const stages = await this.stageRepository.findBy({
      id: In(reorderStagesDto.stageIdsInOrder),
      pipelineId,
    });

    if (stages.length !== reorderStagesDto.stageIdsInOrder.length) {
      throw new BadRequestException('Invalid stage IDs provided');
    }

    // Update order for each stage
    for (let i = 0; i < reorderStagesDto.stageIdsInOrder.length; i++) {
      await this.stageRepository.update(reorderStagesDto.stageIdsInOrder[i], {
        order: i + 1,
      });
    }
  }

  // Transition Management
  async createTransition(
    pipelineId: string,
    createTransitionDto: CreateTransitionDto,
  ): Promise<PipelineTransition> {
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

  async findTransitionsByPipelineId(
    pipelineId: string,
  ): Promise<PipelineTransition[]> {
    return this.transitionRepository.find({
      where: { pipelineId },
    });
  }

  async findTransitionById(id: string): Promise<PipelineTransition> {
    const transition = await this.transitionRepository.findOne({
      where: { id },
    });
    if (!transition) {
      throw new NotFoundException('Transition not found');
    }
    return transition;
  }

  async updateTransition(
    id: string,
    updateTransitionDto: UpdateTransitionDto,
  ): Promise<PipelineTransition | null> {
    const transition = await this.findTransitionById(id);

    // Validate stage keys if being updated
    if (updateTransitionDto.fromStageKey || updateTransitionDto.toStageKey) {
      const fromStageKey =
        updateTransitionDto.fromStageKey || transition.fromStageKey;
      const toStageKey =
        updateTransitionDto.toStageKey || transition.toStageKey;

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
      if (
        fromStageKey !== transition.fromStageKey ||
        toStageKey !== transition.toStageKey
      ) {
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
      pipeline.transitions.forEach((transition) => {
        connectedStages.add(transition.fromStageKey);
        connectedStages.add(transition.toStageKey);
      });

      const orphanedStages = pipeline.stages.filter(
        (stage) => !connectedStages.has(stage.key),
      );
      if (orphanedStages.length > 0) {
        warnings.push(
          `Orphaned stages found: ${orphanedStages.map((s) => s.name).join(', ')}`,
        );
      }
    }

    // Check for unreachable stages
    if (pipeline.stages && pipeline.transitions) {
      const reachableStages = new Set<string>();
      const firstStage = pipeline.stages.find((s) => s.order === 1);
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

  async updatePipelineComprehensive(
    id: string,
    updatePipelineDto: UpdatePipelineComprehensiveDto,
  ): Promise<HiringPipeline | null> {
    return await this.pipelineRepository.manager.transaction(
      async (manager) => {
        const { name, description, active, stages, transitions } =
          updatePipelineDto;

        const existingPipeline = await manager.findOne(HiringPipeline, {
          where: { id },
          relations: ['organization'],
        });
        if (!existingPipeline) {
          throw new NotFoundException('Pipeline not found');
        }

        if (name || description !== undefined || active !== undefined) {
          if (name && name !== existingPipeline.name) {
            const nameConflict = await manager.findOne(HiringPipeline, {
              where: { name, organizationId: existingPipeline.organizationId },
            });
            if (nameConflict) {
              throw new ConflictException(
                'Pipeline with this name already exists for this organization',
              );
            }
          }

          await manager.update(HiringPipeline, id, {
            name,
            description,
            active,
          });
        }

        if (stages && stages.length > 0) {
          await manager.delete(PipelineStage, { pipelineId: id });

          for (const stageData of stages) {
            const stage = manager.create(PipelineStage, {
              pipelineId: id,
              key: stageData.key,
              name: stageData.name,
              type: stageData.type,
              order: stageData.order,
              terminal: stageData.terminal || false,
            });
            await manager.save(stage);
          }
        }

        if (transitions && transitions.length >= 0) {
          await manager.delete(PipelineTransition, { pipelineId: id });

          if (transitions.length > 0) {
            const allStages = await manager.find(PipelineStage, {
              where: { pipelineId: id },
            });
            const existingStageKeys = new Set(allStages.map((s) => s.key));

            for (const transitionData of transitions) {
              if (!existingStageKeys.has(transitionData.fromStageKey)) {
                throw new BadRequestException(
                  `Stage key '${transitionData.fromStageKey}' does not exist`,
                );
              }
              if (!existingStageKeys.has(transitionData.toStageKey)) {
                throw new BadRequestException(
                  `Stage key '${transitionData.toStageKey}' does not exist`,
                );
              }

              const transition = manager.create(PipelineTransition, {
                pipelineId: id,
                fromStageKey: transitionData.fromStageKey,
                toStageKey: transitionData.toStageKey,
                actionName: transitionData.actionName,
                allowedRoles: transitionData.allowedRoles,
              });
              await manager.save(transition);
            }
          }
        }

        return manager.findOne(HiringPipeline, {
          where: { id },
          relations: ['stages', 'transitions', 'organization'],
        });
      },
    );
  }

  async createPipelineComprehensive(
    createPipelineDto: CreatePipelineComprehensiveDto,
  ): Promise<HiringPipeline | null> {
    return await this.pipelineRepository.manager.transaction(
      async (manager) => {
        const {
          name,
          organizationId,
          description,
          active,
          stages,
          transitions,
        } = createPipelineDto;

        const organization = await manager.findOne(Organization, {
          where: { id: organizationId },
        });
        if (!organization) {
          throw new NotFoundException('Organization not found');
        }

        const existingPipeline = await manager.findOne(HiringPipeline, {
          where: { name, organizationId },
        });
        if (existingPipeline) {
          throw new ConflictException(
            'Pipeline with this name already exists for this organization',
          );
        }

        const pipeline = manager.create(HiringPipeline, {
          name,
          organizationId,
          description,
          active: active !== undefined ? active : true,
        });
        const savedPipeline = await manager.save(pipeline);

        const createdStages: PipelineStage[] = [];
        for (const stageData of stages) {
          const stage = manager.create(PipelineStage, {
            pipelineId: savedPipeline.id,
            key: stageData.key,
            name: stageData.name,
            type: stageData.type,
            order: stageData.order,
            terminal: stageData.terminal || false,
          });
          const savedStage = await manager.save(stage);
          createdStages.push(savedStage);
        }

        if (transitions && transitions.length > 0) {
          const existingStageKeys = new Set(createdStages.map((s) => s.key));

          for (const transitionData of transitions) {
            if (!existingStageKeys.has(transitionData.fromStageKey)) {
              throw new BadRequestException(
                `Stage key '${transitionData.fromStageKey}' does not exist`,
              );
            }
            if (!existingStageKeys.has(transitionData.toStageKey)) {
              throw new BadRequestException(
                `Stage key '${transitionData.toStageKey}' does not exist`,
              );
            }

            const transition = manager.create(PipelineTransition, {
              pipelineId: savedPipeline.id,
              fromStageKey: transitionData.fromStageKey,
              toStageKey: transitionData.toStageKey,
              actionName: transitionData.actionName,
              allowedRoles: transitionData.allowedRoles,
            });
            await manager.save(transition);
          }
        }

        // Return complete pipeline with relations
        return manager.findOne(HiringPipeline, {
          where: { id: savedPipeline.id },
          relations: ['stages', 'transitions', 'organization'],
        });
      },
    );
  }
  async generatePipelineDataWithAI(
    organizationId: string,
    userInput: string | undefined,
    allowedRoles: string[] = ['recruiter', 'admin'],
    jobTitle?: string,
    jobDescription?: string,
  ): Promise<PipelineResponse> {
    // Build context string for AI
    let contextInfo = '';
    if (jobTitle) {
      contextInfo += `\nJob Title: ${jobTitle}`;
    }
    if (jobDescription) {
      contextInfo += `\nJob Description: ${jobDescription}`;
    }

    // Generate pipeline ID (timestamp) - use same timestamp for consistency
    const pipelineId = Date.now().toString();
    const now = new Date().toISOString();

    // Build user requirements section
    let userRequirementsSection = '';
    if (userInput) {
      userRequirementsSection = `\n\nUser requirements: ${userInput}`;
    } else if (jobTitle || jobDescription) {
      userRequirementsSection = `\n\nGenerate a hiring pipeline based on the job information provided.`;
    } else {
      userRequirementsSection = `\n\nGenerate a standard hiring pipeline with typical stages.`;
    }

    const prompt = `You are an expert HR and recruitment system designer. Generate a complete hiring pipeline structure based on the user's requirements.${contextInfo}
    
  The pipeline must include:
  1. A name for the pipeline${jobTitle ? ` (consider the job title: ${jobTitle})` : ''}
  2. Stages array with the following structure:
     - Each stage must have: key, name, type, order, terminal, pipelineId
     - Stage types can be: "screening", "interview", "offer", "hired", "rejected"
     - Standard stages should include: 
       * "applied" (sourcing, order 10, terminal false) - DO NOT include "id" field for this stage
       * "hired" (hired, terminal true, order 50) - DO NOT include "id" field for this stage
       * "rejected" (rejected, terminal true, order 60) - DO NOT include "id" field for this stage
     - Custom stages (any stage that is NOT "applied", "hired", or "rejected") should have:
       * Unique keys like "stage_${pipelineId}_1", "stage_${pipelineId}_2" etc.
       * An "id" field with a unique timestamp-based value like "${pipelineId}_1", "${pipelineId}_2"
       * Appropriate order numbers (20, 30, 40, etc.)
     - Terminal stages (hired, rejected) should have terminal: true
     - ALL stages must include pipelineId: "${pipelineId}"
     ${jobDescription ? `- Consider the job requirements and create relevant interview stages (e.g., technical assessment, coding challenge, system design interview for technical roles)` : ''}
  
  3. Transitions array connecting stages:
     - Each transition MUST have: id, pipelineId, fromStageKey, toStageKey, actionName, allowedRoles
     - id should be a unique timestamp-based value like "${pipelineId}_1", "${pipelineId}_2", etc.
     - pipelineId should be "${pipelineId}" for all transitions
     - allowedRoles should be: ${JSON.stringify(allowedRoles)}
     - Create logical transitions between stages (e.g., applied -> screening -> interview -> offer -> hired)
     - Include rejection paths from any stage to "rejected"
  
  IMPORTANT: Return ONLY valid JSON in this exact format, this is just AN EXAMPLE, you can change the name and stages and transitions to fit the job title and description (no markdown, no code blocks, just pure JSON):
  {
    "id": "${pipelineId}",
    "name": "${jobTitle} pipeline",
    "organizationId": "${organizationId}",
    "stages": [
      {
        "key": "applied",
        "name": "Applied",
        "type": "sourcing",
        "order": 10,
        "terminal": false,
        "pipelineId": "${pipelineId}"
      },
      {
        "id": "${pipelineId}_1",
        "key": "stage_${pipelineId}_1",
        "name": "Phone Screening",
        "type": "screening",
        "order": 20,
        "terminal": false,
        "pipelineId": "${pipelineId}"
      },
      {
        "id": "${pipelineId}_2",
        "key": "stage_${pipelineId}_2",
        "name": "Technical Interview",
        "type": "interview",
        "order": 30,
        "terminal": false,
        "pipelineId": "${pipelineId}"
      },
      {
        "id": "${pipelineId}_3",
        "key": "stage_${pipelineId}_3",
        "name": "Offer Stage",
        "type": "offer",
        "order": 40,
        "terminal": false,
        "pipelineId": "${pipelineId}"
      },
      {
        "key": "hired",
        "name": "Hired",
        "order": 50,
        "terminal": true,
        "type": "hired",
        "pipelineId": "${pipelineId}"
      },
      {
        "key": "rejected",
        "name": "Rejected",
        "order": 60,
        "terminal": true,
        "type": "rejected",
        "pipelineId": "${pipelineId}"
      }
    ],
    "transitions": [
      {
        "id": "${pipelineId}_1",
        "pipelineId": "${pipelineId}",
        "fromStageKey": "applied",
        "toStageKey": "stage_${pipelineId}_1",
        "actionName": "Move to phone screening",
        "allowedRoles": ${JSON.stringify(allowedRoles)}
      },
      {
        "id": "${pipelineId}_2",
        "pipelineId": "${pipelineId}",
        "fromStageKey": "stage_${pipelineId}_1",
        "toStageKey": "stage_${pipelineId}_2",
        "actionName": "Move to interview",
        "allowedRoles": ${JSON.stringify(allowedRoles)}
      },
      {
        "id": "${pipelineId}_3",
        "pipelineId": "${pipelineId}",
        "fromStageKey": "stage_${pipelineId}_2",
        "toStageKey": "stage_${pipelineId}_3",
        "actionName": "Move to offer",
        "allowedRoles": ${JSON.stringify(allowedRoles)}
      },
      {
        "id": "${pipelineId}_4",
        "pipelineId": "${pipelineId}",
        "fromStageKey": "stage_${pipelineId}_3",
        "toStageKey": "hired",
        "actionName": "Move to hire",
        "allowedRoles": ${JSON.stringify(allowedRoles)}
      },
      {
        "id": "${pipelineId}_5",
        "pipelineId": "${pipelineId}",
        "fromStageKey": "applied",
        "toStageKey": "rejected",
        "actionName": "Move to rejected",
        "allowedRoles": ${JSON.stringify(allowedRoles)}
      }
    ],
    "createdAt": "${now}",
    "updatedAt": "${now}"
  }
  ${userRequirementsSection}${contextInfo ? `\n\nAdditional Context:${contextInfo}` : ''}
  
  CRITICAL RULES:
  - Return ONLY the JSON object, no markdown, no code blocks, no explanations
  - Use "${pipelineId}" as the root "id" and for all "pipelineId" fields
  - Custom stages (NOT "applied", "hired", "rejected") MUST have an "id" field
  - Standard stages ("applied", "hired", "rejected") MUST NOT have an "id" field
  - ALL transitions MUST have an "id" field
  - Use unique sequential IDs for stages and transitions (e.g., "${pipelineId}_1", "${pipelineId}_2", etc.)
  - Include createdAt and updatedAt as ISO 8601 strings: "${now}"
  
  Generate a complete, logical hiring pipeline. ${jobTitle || jobDescription ? 'Use the job title and description to create relevant stages (e.g., for technical roles, include coding challenges, system design interviews, etc.). ' : ''}Include at least 3-5 custom stages between "applied" and terminal stages. Ensure all stages are connected with appropriate transitions. Make sure to include rejection paths from multiple stages to "rejected".`;

    try {
      const aiResponse = await this.aiService.generate({
        prompt,
        temperature: 0.7,
        maxOutputTokens: 8096,
      });

      // Parse AI response - handle markdown code blocks if present
      let jsonString = aiResponse.content.trim();

      // Remove markdown code blocks if present
      jsonString = jsonString
        .replace(/\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Try to extract JSON if wrapped in text
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      const aiGeneratedData = JSON.parse(jsonString);

      // Return directly as PipelineResponse (AI should return exact format)
      const result: PipelineResponse = {
        id: aiGeneratedData.id || pipelineId,
        name: aiGeneratedData.name || 'AI Generated Pipeline',
        organizationId: aiGeneratedData.organizationId || organizationId,
        stages: aiGeneratedData.stages || [],
        transitions: aiGeneratedData.transitions || [],
        createdAt: aiGeneratedData.createdAt || now,
        updatedAt: aiGeneratedData.updatedAt || now,
      };

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate pipeline with AI: ${error.message}`,
      );
    }
  }
}
