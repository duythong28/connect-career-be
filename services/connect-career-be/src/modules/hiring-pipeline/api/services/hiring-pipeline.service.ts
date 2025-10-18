import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HiringPipeline } from '../../domain/entities/hiring-pipeline.entity';
import { PipelineStage } from '../../domain/entities/pipeline-stage.entity';
import { PipelineTransition } from '../../domain/entities/pipeline-transition.entity';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateStageDto,
  UpdateStageDto,
  ReorderStagesDto,
  CreateTransitionDto,
  UpdateTransitionDto,
  PipelineValidationResultDto,
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
  ) {}

  // Pipeline CRUD Operations
  async createPipeline(
    createPipelineDto: CreatePipelineDto,
  ): Promise<HiringPipeline> {
    const { name, jobId, description } = createPipelineDto;

    // Check if pipeline with same name exists for this job
    const existingPipeline = await this.pipelineRepository.findOne({
      where: { name, jobId },
    });

    if (existingPipeline) {
      throw new ConflictException(
        'Pipeline with this name already exists for this job',
      );
    }

    const pipeline = this.pipelineRepository.create({
      name,
      jobId,
      description,
      active: true,
    });

    return this.pipelineRepository.save(pipeline);
  }

  async findAllPipelines(
    jobId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: HiringPipeline[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.pipelineRepository.findAndCount({
      where: { jobId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findPipelineById(id: string): Promise<HiringPipeline> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id },
      relations: ['stages', 'transitions'],
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }
    return pipeline;
  }

  async findActivePipelines(jobId: string): Promise<HiringPipeline[]> {
    return this.pipelineRepository.find({
      where: { jobId, active: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updatePipeline(
    id: string,
    updatePipelineDto: UpdatePipelineDto,
  ): Promise<HiringPipeline | null> {
    const pipeline = await this.pipelineRepository.findOne({ where: { id } });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    // Check for name conflicts if name is being updated
    if (updatePipelineDto.name && updatePipelineDto.name !== pipeline.name) {
      const existingPipeline = await this.pipelineRepository.findOne({
        where: { name: updatePipelineDto.name, jobId: pipeline.jobId },
      });
      if (existingPipeline) {
        throw new ConflictException(
          'Pipeline with this name already exists for this job',
        );
      }
    }

    await this.pipelineRepository.update(id, updatePipelineDto);
    return this.pipelineRepository.findOne({ where: { id } });
  }

  async deletePipeline(id: string): Promise<void> {
    const pipeline = await this.pipelineRepository.findOne({ where: { id } });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    // Delete associated stages and transitions
    await this.stageRepository.delete({ pipelineId: id });
    await this.transitionRepository.delete({ pipelineId: id });
    await this.pipelineRepository.delete(id);
  }

  // Stage CRUD Operations
  async createStage(
    pipelineId: string,
    createStageDto: CreateStageDto,
  ): Promise<PipelineStage> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    // Check if stage key already exists in pipeline
    const existingStage = await this.stageRepository.findOne({
      where: { pipelineId, key: createStageDto.key },
    });
    if (existingStage) {
      throw new ConflictException(
        'Stage with this key already exists in the pipeline',
      );
    }

    const stage = this.stageRepository.create({
      ...createStageDto,
      pipelineId,
    });

    return this.stageRepository.save(stage);
  }

  async findStagesByPipelineId(pipelineId: string): Promise<PipelineStage[]> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

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
    const stage = await this.stageRepository.findOne({ where: { id } });
    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    // Check for key conflicts if key is being updated
    if (updateStageDto.key && updateStageDto.key !== stage.key) {
      const existingStage = await this.stageRepository.findOne({
        where: { pipelineId: stage.pipelineId, key: updateStageDto.key },
      });
      if (existingStage) {
        throw new ConflictException(
          'Stage with this key already exists in the pipeline',
        );
      }
    }

    await this.stageRepository.update(id, updateStageDto);
    return this.stageRepository.findOne({ where: { id } });
  }

  async deleteStage(id: string): Promise<void> {
    const stage = await this.stageRepository.findOne({ where: { id } });
    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    // Check if stage is referenced in transitions
    const transitions = await this.transitionRepository.find({
      where: { pipelineId: stage.pipelineId },
    });
    const isReferenced = transitions.some(
      (t) => t.fromStageKey === stage.key || t.toStageKey === stage.key,
    );

    if (isReferenced) {
      throw new BadRequestException(
        'Cannot delete stage that is referenced in transitions',
      );
    }

    await this.stageRepository.delete(id);
  }

  async reorderStages(
    pipelineId: string,
    reorderStagesDto: ReorderStagesDto,
  ): Promise<void> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    const { stageIdsInOrder } = reorderStagesDto;

    // Validate that all stage IDs belong to the pipeline
    const stages = await this.stageRepository.find({ where: { pipelineId } });
    const stageIds = stages.map((s) => s.id);

    for (const stageId of stageIdsInOrder) {
      if (!stageIds.includes(stageId)) {
        throw new BadRequestException(
          `Stage ${stageId} does not belong to this pipeline`,
        );
      }
    }

    // Update order for each stage
    const updatePromises = stageIdsInOrder.map((stageId, index) =>
      this.stageRepository.update(stageId, { order: index + 1 }),
    );
    await Promise.all(updatePromises);
  }

  // Transition CRUD Operations
  async createTransition(
    pipelineId: string,
    createTransitionDto: CreateTransitionDto,
  ): Promise<PipelineTransition> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    const { fromStageKey, toStageKey } = createTransitionDto;

    // Validate that both stages exist in the pipeline
    const fromStage = await this.stageRepository.findOne({
      where: { pipelineId, key: fromStageKey },
    });
    const toStage = await this.stageRepository.findOne({
      where: { pipelineId, key: toStageKey },
    });

    if (!fromStage) {
      throw new BadRequestException(
        `Source stage '${fromStageKey}' not found in pipeline`,
      );
    }
    if (!toStage) {
      throw new BadRequestException(
        `Target stage '${toStageKey}' not found in pipeline`,
      );
    }

    // Check if transition already exists
    const existingTransition = await this.transitionRepository.findOne({
      where: { pipelineId, fromStageKey, toStageKey },
    });
    if (existingTransition) {
      throw new ConflictException(
        'Transition between these stages already exists',
      );
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
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    return this.transitionRepository.find({ where: { pipelineId } });
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
    const transition = await this.transitionRepository.findOne({
      where: { id },
    });
    if (!transition) {
      throw new NotFoundException('Transition not found');
    }

    // Validate stage keys if they're being updated
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

      if (!fromStage) {
        throw new BadRequestException(
          `Source stage '${fromStageKey}' not found in pipeline`,
        );
      }
      if (!toStage) {
        throw new BadRequestException(
          `Target stage '${toStageKey}' not found in pipeline`,
        );
      }

      // Check for conflicts if stage keys are changing
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
        if (existingTransition && existingTransition.id !== id) {
          throw new ConflictException(
            'Transition between these stages already exists',
          );
        }
      }
    }

    await this.transitionRepository.update(id, updateTransitionDto);
    return this.transitionRepository.findOne({ where: { id } });
  }

  async deleteTransition(id: string): Promise<void> {
    const transition = await this.transitionRepository.findOne({
      where: { id },
    });
    if (!transition) {
      throw new NotFoundException('Transition not found');
    }

    await this.transitionRepository.delete(id);
  }

  // Pipeline Validation
  async validatePipeline(id: string): Promise<PipelineValidationResultDto> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id },
      relations: ['stages', 'transitions'],
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    const issues: string[] = [];

    // Check if pipeline has stages
    if (!pipeline.stages || pipeline.stages.length === 0) {
      issues.push('Pipeline must have at least one stage');
    }

    // Check for duplicate stage keys
    const stageKeys = pipeline.stages?.map((s) => s.key) || [];
    const duplicateKeys = stageKeys.filter(
      (key, index) => stageKeys.indexOf(key) !== index,
    );
    if (duplicateKeys.length > 0) {
      issues.push(`Duplicate stage keys found: ${duplicateKeys.join(', ')}`);
    }

    // Check for duplicate stage orders
    const stageOrders = pipeline.stages?.map((s) => s.order) || [];
    const duplicateOrders = stageOrders.filter(
      (order, index) => stageOrders.indexOf(order) !== index,
    );
    if (duplicateOrders.length > 0) {
      issues.push(
        `Duplicate stage orders found: ${duplicateOrders.join(', ')}`,
      );
    }

    // Check for terminal stages
    const terminalStages = pipeline.stages?.filter((s) => s.terminal) || [];
    if (terminalStages.length === 0) {
      issues.push('Pipeline should have at least one terminal stage');
    }

    // Check transitions reference valid stages
    if (pipeline.transitions) {
      for (const transition of pipeline.transitions) {
        const fromStageExists = pipeline.stages?.some(
          (s) => s.key === transition.fromStageKey,
        );
        const toStageExists = pipeline.stages?.some(
          (s) => s.key === transition.toStageKey,
        );

        if (!fromStageExists) {
          issues.push(
            `Transition references non-existent source stage: ${transition.fromStageKey}`,
          );
        }
        if (!toStageExists) {
          issues.push(
            `Transition references non-existent target stage: ${transition.toStageKey}`,
          );
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
