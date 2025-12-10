import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BillableAction,
  ActionCategory,
} from '../../domain/entities/billable-action.entity';

@Injectable()
export class BillableActionsSeeder {
  private readonly logger = new Logger(BillableActionsSeeder.name);

  constructor(
    @InjectRepository(BillableAction)
    private readonly billableActionRepository: Repository<BillableAction>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('🚀 Starting billable actions seeding...');

    try {
      const defaultActions = this.getDefaultBillableActions();

      for (const actionData of defaultActions) {
        const existing = await this.billableActionRepository.findOne({
          where: { actionCode: actionData.actionCode },
        });

        if (existing) {
          this.logger.log(
            `Action ${actionData.actionCode} already exists, skipping...`,
          );
          continue;
        }

        const action = this.billableActionRepository.create(actionData);
        await this.billableActionRepository.save(action);
        this.logger.log(`✅ Created billable action: ${actionData.actionCode}`);
      }

      this.logger.log('✅ Billable actions seeding completed successfully');
    } catch (error) {
      this.logger.error('Failed to seed billable actions', error);
      throw error;
    }
  }

  private getDefaultBillableActions(): Partial<BillableAction>[] {
    return [
      // Recruiter Actions
      {
        actionCode: 'POST_JOB',
        actionName: 'Post Job',
        description: 'Post a new job listing',
        category: ActionCategory.RECRUITER,
        cost: 0.05,
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'recruiter',
        },
      },
      {
        actionCode: 'FEATURE_JOB',
        actionName: 'Feature Job',
        description: 'Feature a job post for better visibility',
        category: ActionCategory.RECRUITER,
        cost: 0.05,
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'recruiter',
          maxPerPeriod: 1,
          period: 'daily',
        },
      },
      {
        actionCode: 'VIEW_CANDIDATE_CONTACT',
        actionName: 'View Candidate Contact',
        description: 'View candidate contact information',
        category: ActionCategory.RECRUITER,
        cost: 0.01,
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'recruiter',
        },
      },
      {
        actionCode: 'SEND_INMAIL',
        actionName: 'Send InMail',
        description: 'Send InMail message to candidate',
        category: ActionCategory.RECRUITER,
        cost: 0.001,
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'recruiter',
        },
      },
      {
        actionCode: 'AI_CANDIDATE_MATCHING',
        actionName: 'AI Candidate Matching',
        description: 'Use AI to find matching candidates',
        category: ActionCategory.RECRUITER,
        cost: 0.02,
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'recruiter',
        },
      },
      {
        actionCode: 'ADVANCED_SEARCH',
        actionName: 'Advanced Candidate Search',
        description: 'Use advanced filters for candidate search',
        category: ActionCategory.RECRUITER,
        cost: 0.005,
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'recruiter',
        },
      },
      {
        actionCode: 'EXPORT_CANDIDATES',
        actionName: 'Export Candidate List',
        description: 'Export candidate list to CSV/Excel',
        category: ActionCategory.RECRUITER,
        cost: 0.01,
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'recruiter',
        },
      },
      // Candidate Actions
      {
        actionCode: 'BOOST_APPLICATION',
        actionName: 'Boost Application',
        description: 'Boost application to top of recruiter list for 24h',
        category: ActionCategory.CANDIDATE,
        cost: 0.02,
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'candidate',
        },
      },
      {
        actionCode: 'AI_CV_ENHANCEMENT',
        actionName: 'AI CV Enhancement',
        description: 'Use AI to enhance your CV/resume',
        category: ActionCategory.CANDIDATE,
        cost: 0.03,
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'candidate',
        },
      },
    ];
  }
}
