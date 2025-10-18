import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HiringPipeline } from '../../domain/entities/hiring-pipeline.entity';
import { PipelineStage, PipelineStageType } from '../../domain/entities/pipeline-stage.entity';
import { PipelineTransition } from '../../domain/entities/pipeline-transition.entity';
import { Job, JobSeniorityLevel, JobSource, JobStatus, JobType } from 'src/modules/jobs/domain/entities/job.entity';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';

@Injectable()
export class HiringPipelineSeeder {
  private readonly logger = new Logger(HiringPipelineSeeder.name);

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

  async seed(): Promise<void> {
    this.logger.log('🚀 Starting hiring pipeline seeding...');

    try {
      // Create sample organizations and jobs first
      const { organization, job } = await this.createSampleData();

      // Create the senior backend engineer pipeline
      await this.createSeniorBackendEngineerPipeline(organization!.id);

      // Create additional sample pipelines
      await this.createFrontendEngineerPipeline(organization!.id);
      await this.createProductManagerPipeline(organization!.id);
      await this.createDataScientistPipeline(organization!.id);

      this.logger.log('✅ Hiring pipeline seeding completed successfully');
    } catch (error) {
      this.logger.error('Failed to seed hiring pipelines', error);
      throw error;
    }
  }

  private async createSampleData(): Promise<{ organization: Organization | null; job: Job | null }> {
    // Create or find a sample organization
    const organization = await this.organizationRepository.findOne({
      where: { name: 'Cloud Thinker' },
    });

    // Create or find a sample job
    let job = await this.jobRepository.findOne({
      where: { 
        title: 'Senior Backend Engineer',
        organizationId: organization?.id 
      },
    });

    if (!job) {
      job = this.jobRepository.create({
        title: 'Senior Backend Engineer',
        organizationId: organization?.id,
        userId: organization?.userId,
        location: 'San Francisco, CA (Remote)',
        description: 'We are looking for a Senior Backend Engineer to join our team and help build scalable, high-performance systems.',
        summary: 'Senior Backend Engineer position with focus on system design and architecture',
        type: JobType.FULL_TIME,
        seniorityLevel: JobSeniorityLevel.MID_SENIOR,
        jobFunction: 'Engineering',
        salary: '$120,000 - $180,000',
        salaryDetails: {
          currency: 'USD',
          minAmount: 120000,
          maxAmount: 180000,
          paymentPeriod: 'yearly',
        },
        status: JobStatus.ACTIVE,
        source: JobSource.INTERNAL,
        keywords: ['backend', 'nodejs', 'typescript', 'postgresql', 'aws'],
        applications: 0,
        views: 0,
        postedDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      job = await this.jobRepository.save(job);
      this.logger.log(`Created job: ${job.title}`);
    }

    return { organization, job };
  }

  private async createSeniorBackendEngineerPipeline(organizationId: string): Promise<void> {    
    // Create the pipeline
    const pipeline = this.pipelineRepository.create({
      organizationId: organizationId,
      name: 'Senior Backend Engineer Pipeline',
      active: true,
      description: 'Standard pipeline for Senior Backend Engineer (L5+). Focuses on system design, leadership, and deep technical expertise.',
    });

    await this.pipelineRepository.save(pipeline);
    this.logger.log('Created Senior Backend Engineer pipeline');

    // Create stages
    const stages = [
      {
        pipelineId: pipeline.id,
        key: 'applied',
        name: 'Applied / Sourced',
        type: PipelineStageType.SOURCING,
        order: 10,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'recruiter_screen',
        name: 'Recruiter Screen',
        type: PipelineStageType.SCREENING,
        order: 20,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'tech_screen',
        name: 'Technical Phone Screen (Coding)',
        type: PipelineStageType.INTERVIEW,
        order: 30,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'onsite_loop',
        name: 'On-site Interview Loop',
        type: PipelineStageType.INTERVIEW,
        order: 40,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'debrief',
        name: 'Pending Decision (Debrief)',
        type: PipelineStageType.CUSTOM,
        order: 50,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'offer',
        name: 'Offer',
        type: PipelineStageType.OFFER,
        order: 60,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'hired',
        name: 'Hired',
        type: PipelineStageType.HIRED,
        order: 70,
        terminal: true,
      },
      {
        pipelineId: pipeline.id,
        key: 'rejected',
        name: 'Rejected',
        type: PipelineStageType.REJECTED,
        order: 80,
        terminal: true,
      },
      {
        pipelineId: pipeline.id,
        key: 'on_hold',
        name: 'On Hold',
        type: PipelineStageType.ON_HOLD,
        order: 90,
        terminal: true,
      },
    ];

    for (const stageData of stages) {
      const stage = this.stageRepository.create(stageData);
      await this.stageRepository.save(stage);
    }
    this.logger.log('Created pipeline stages');

    // Create transitions
    const transitions = [
      // Happy Path
      {
        pipelineId: pipeline.id,
        fromStageKey: 'applied',
        toStageKey: 'recruiter_screen',
        actionName: 'Schedule Screen',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'recruiter_screen',
        toStageKey: 'tech_screen',
        actionName: 'Pass to Tech Screen',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'tech_screen',
        toStageKey: 'onsite_loop',
        actionName: 'Schedule On-site',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'onsite_loop',
        toStageKey: 'debrief',
        actionName: 'Collect Feedback',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'debrief',
        toStageKey: 'offer',
        actionName: 'Make Offer',
        allowedRoles: ['hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'offer',
        toStageKey: 'hired',
        actionName: 'Offer Accepted',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      // Rejection / Off-ramps
      {
        pipelineId: pipeline.id,
        fromStageKey: 'applied',
        toStageKey: 'rejected',
        actionName: 'Reject Application',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'recruiter_screen',
        toStageKey: 'rejected',
        actionName: 'Reject (Recruiter Screen)',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'tech_screen',
        toStageKey: 'rejected',
        actionName: 'Reject (Tech Screen)',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'onsite_loop',
        toStageKey: 'rejected',
        actionName: 'Reject (On-site)',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'debrief',
        toStageKey: 'rejected',
        actionName: 'Reject (Debrief)',
        allowedRoles: ['hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'offer',
        toStageKey: 'rejected',
        actionName: 'Offer Declined',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
    ];

    for (const transitionData of transitions) {
      const transition = this.transitionRepository.create(transitionData);
      await this.transitionRepository.save(transition);
    }
    this.logger.log('Created pipeline transitions');
  }

  private async createFrontendEngineerPipeline(organizationId: string): Promise<void> {
    const pipeline = this.pipelineRepository.create({
      organizationId: organizationId,
      name: 'Frontend Engineer Pipeline',
      active: true,
      description: 'Pipeline for Frontend Engineers focusing on React, TypeScript, and user experience.',
    });

    await this.pipelineRepository.save(pipeline);

    // Create stages
    const stages = [
      {
        pipelineId: pipeline.id,
        key: 'applied',
        name: 'Applied',
        type: PipelineStageType.SOURCING,
        order: 10,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'portfolio_review',
        name: 'Portfolio Review',
        type: PipelineStageType.SCREENING,
        order: 20,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'technical_interview',
        name: 'Technical Interview',
        type: PipelineStageType.INTERVIEW,
        order: 30,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'design_review',
        name: 'Design & UX Review',
        type: PipelineStageType.INTERVIEW,
        order: 40,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'offer',
        name: 'Offer',
        type: PipelineStageType.OFFER,
        order: 50,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'hired',
        name: 'Hired',
        type: PipelineStageType.HIRED,
        order: 60,
        terminal: true,
      },
      {
        pipelineId: pipeline.id,
        key: 'rejected',
        name: 'Rejected',
        type: PipelineStageType.REJECTED,
        order: 70,
        terminal: true,
      },
    ];

    for (const stageData of stages) {
      const stage = this.stageRepository.create(stageData);
      await this.stageRepository.save(stage);
    }

    // Create transitions
    const transitions = [
      {
        pipelineId: pipeline.id,
        fromStageKey: 'applied',
        toStageKey: 'portfolio_review',
        actionName: 'Review Portfolio',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'portfolio_review',
        toStageKey: 'technical_interview',
        actionName: 'Schedule Technical Interview',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'technical_interview',
        toStageKey: 'design_review',
        actionName: 'Schedule Design Review',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'design_review',
        toStageKey: 'offer',
        actionName: 'Make Offer',
        allowedRoles: ['hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'offer',
        toStageKey: 'hired',
        actionName: 'Offer Accepted',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      // Rejections
      {
        pipelineId: pipeline.id,
        fromStageKey: 'applied',
        toStageKey: 'rejected',
        actionName: 'Reject Application',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'portfolio_review',
        toStageKey: 'rejected',
        actionName: 'Reject (Portfolio)',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'technical_interview',
        toStageKey: 'rejected',
        actionName: 'Reject (Technical)',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'design_review',
        toStageKey: 'rejected',
        actionName: 'Reject (Design)',
        allowedRoles: ['hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'offer',
        toStageKey: 'rejected',
        actionName: 'Offer Declined',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
    ];

    for (const transitionData of transitions) {
      const transition = this.transitionRepository.create(transitionData);
      await this.transitionRepository.save(transition);
    }

    this.logger.log('Created Frontend Engineer pipeline');
  }

  private async createProductManagerPipeline(organizationId: string): Promise<void> {
    const pipeline = this.pipelineRepository.create({
      organizationId: organizationId,
      name: 'Product Manager Pipeline',
      active: true,
      description: 'Pipeline for Product Managers focusing on strategy, user research, and cross-functional collaboration.',
    });

    await this.pipelineRepository.save(pipeline);

    // Create stages
    const stages = [
      {
        pipelineId: pipeline.id,
        key: 'applied',
        name: 'Applied',
        type: PipelineStageType.SOURCING,
        order: 10,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'resume_screen',
        name: 'Resume Screen',
        type: PipelineStageType.SCREENING,
        order: 20,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'phone_screen',
        name: 'Phone Screen',
        type: PipelineStageType.SCREENING,
        order: 30,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'product_case',
        name: 'Product Case Study',
        type: PipelineStageType.INTERVIEW,
        order: 40,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'stakeholder_interview',
        name: 'Stakeholder Interview',
        type: PipelineStageType.INTERVIEW,
        order: 50,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'offer',
        name: 'Offer',
        type: PipelineStageType.OFFER,
        order: 60,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'hired',
        name: 'Hired',
        type: PipelineStageType.HIRED,
        order: 70,
        terminal: true,
      },
      {
        pipelineId: pipeline.id,
        key: 'rejected',
        name: 'Rejected',
        type: PipelineStageType.REJECTED,
        order: 80,
        terminal: true,
      },
    ];

    for (const stageData of stages) {
      const stage = this.stageRepository.create(stageData);
      await this.stageRepository.save(stage);
    }

    // Create transitions
    const transitions = [
      {
        pipelineId: pipeline.id,
        fromStageKey: 'applied',
        toStageKey: 'resume_screen',
        actionName: 'Screen Resume',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'resume_screen',
        toStageKey: 'phone_screen',
        actionName: 'Schedule Phone Screen',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'phone_screen',
        toStageKey: 'product_case',
        actionName: 'Schedule Case Study',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'product_case',
        toStageKey: 'stakeholder_interview',
        actionName: 'Schedule Stakeholder Interview',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'stakeholder_interview',
        toStageKey: 'offer',
        actionName: 'Make Offer',
        allowedRoles: ['hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'offer',
        toStageKey: 'hired',
        actionName: 'Offer Accepted',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      // Rejections
      {
        pipelineId: pipeline.id,
        fromStageKey: 'applied',
        toStageKey: 'rejected',
        actionName: 'Reject Application',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'resume_screen',
        toStageKey: 'rejected',
        actionName: 'Reject (Resume)',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'phone_screen',
        toStageKey: 'rejected',
        actionName: 'Reject (Phone Screen)',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'product_case',
        toStageKey: 'rejected',
        actionName: 'Reject (Case Study)',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'stakeholder_interview',
        toStageKey: 'rejected',
        actionName: 'Reject (Stakeholder)',
        allowedRoles: ['hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'offer',
        toStageKey: 'rejected',
        actionName: 'Offer Declined',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
    ];

    for (const transitionData of transitions) {
      const transition = this.transitionRepository.create(transitionData);
      await this.transitionRepository.save(transition);
    }

    this.logger.log('Created Product Manager pipeline');
  }

  private async createDataScientistPipeline(organizationId: string): Promise<void> {
    const pipeline = this.pipelineRepository.create({
      organizationId: organizationId,
      name: 'Data Scientist Pipeline',
      active: true,
      description: 'Pipeline for Data Scientists focusing on machine learning, statistics, and data analysis.',
    });

    await this.pipelineRepository.save(pipeline);

    // Create stages
    const stages = [
      {
        pipelineId: pipeline.id,
        key: 'applied',
        name: 'Applied',
        type: PipelineStageType.SOURCING,
        order: 10,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'cv_screen',
        name: 'CV Screen',
        type: PipelineStageType.SCREENING,
        order: 20,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'technical_phone',
        name: 'Technical Phone Screen',
        type: PipelineStageType.INTERVIEW,
        order: 30,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'take_home',
        name: 'Take-home Assignment',
        type: PipelineStageType.INTERVIEW,
        order: 40,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'onsite_presentation',
        name: 'On-site Presentation',
        type: PipelineStageType.INTERVIEW,
        order: 50,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'offer',
        name: 'Offer',
        type: PipelineStageType.OFFER,
        order: 60,
        terminal: false,
      },
      {
        pipelineId: pipeline.id,
        key: 'hired',
        name: 'Hired',
        type: PipelineStageType.HIRED,
        order: 70,
        terminal: true,
      },
      {
        pipelineId: pipeline.id,
        key: 'rejected',
        name: 'Rejected',
        type: PipelineStageType.REJECTED,
        order: 80,
        terminal: true,
      },
    ];

    for (const stageData of stages) {
      const stage = this.stageRepository.create(stageData);
      await this.stageRepository.save(stage);
    }

    // Create transitions
    const transitions = [
      {
        pipelineId: pipeline.id,
        fromStageKey: 'applied',
        toStageKey: 'cv_screen',
        actionName: 'Screen CV',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'cv_screen',
        toStageKey: 'technical_phone',
        actionName: 'Schedule Technical Phone Screen',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'technical_phone',
        toStageKey: 'take_home',
        actionName: 'Send Take-home Assignment',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'take_home',
        toStageKey: 'onsite_presentation',
        actionName: 'Schedule On-site Presentation',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'onsite_presentation',
        toStageKey: 'offer',
        actionName: 'Make Offer',
        allowedRoles: ['hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'offer',
        toStageKey: 'hired',
        actionName: 'Offer Accepted',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      // Rejections
      {
        pipelineId: pipeline.id,
        fromStageKey: 'applied',
        toStageKey: 'rejected',
        actionName: 'Reject Application',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'cv_screen',
        toStageKey: 'rejected',
        actionName: 'Reject (CV)',
        allowedRoles: ['recruiter', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'technical_phone',
        toStageKey: 'rejected',
        actionName: 'Reject (Technical Phone)',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'take_home',
        toStageKey: 'rejected',
        actionName: 'Reject (Take-home)',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'onsite_presentation',
        toStageKey: 'rejected',
        actionName: 'Reject (Presentation)',
        allowedRoles: ['hiring_manager', 'admin'],
      },
      {
        pipelineId: pipeline.id,
        fromStageKey: 'offer',
        toStageKey: 'rejected',
        actionName: 'Offer Declined',
        allowedRoles: ['recruiter', 'hiring_manager', 'admin'],
      },
    ];

    for (const transitionData of transitions) {
      const transition = this.transitionRepository.create(transitionData);
      await this.transitionRepository.save(transition);
    }

    this.logger.log('Created Data Scientist pipeline');
  }
}