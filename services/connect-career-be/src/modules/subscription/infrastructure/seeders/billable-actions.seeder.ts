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
      {
        actionCode: 'MOCK_AI_INTERVIEW', 
        actionName: 'AI Mock Interview',
        description: 'Create and conduct an AI-powered mock interview session',
        category: ActionCategory.CANDIDATE,
        cost: 0.05, // Adjust cost as needed
        currency: 'USD',
        isActive: true,
        metadata: {
          requiresProfile: 'candidate',
        },
      },
    ];
  }
}
