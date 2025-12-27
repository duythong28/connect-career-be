// services/connect-career-be/src/modules/subscription/infrastructure/seeders/usage-ledger.seeder.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageLedger } from '../../domain/entities/usage-ledger.entity';
import { BillableAction } from '../../domain/entities/billable-action.entity';
import { UserWallet } from '../../domain/entities/user-wallet.entity';
import { User } from 'src/modules/identity/domain/entities';

@Injectable()
export class UsageLedgerSeeder {
  private readonly logger = new Logger(UsageLedgerSeeder.name);

  constructor(
    @InjectRepository(UsageLedger)
    private readonly usageLedgerRepository: Repository<UsageLedger>,
    @InjectRepository(BillableAction)
    private readonly billableActionRepository: Repository<BillableAction>,
    @InjectRepository(UserWallet)
    private readonly walletRepository: Repository<UserWallet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('🚀 Starting usage ledger seeding...');

    try {
      // Get existing users
      const users = await this.userRepository.find({
        where: { email: 'lmtoan311@gmail.com' },
      });

      if (users.length === 0) {
        this.logger.warn('No users found. Please seed users first.');
        return;
      }

      // Get existing billable actions
      const billableActions = await this.billableActionRepository.find({
        where: { isActive: true },
      });

      if (billableActions.length === 0) {
        this.logger.warn(
          'No billable actions found. Please seed billable actions first.',
        );
        return;
      }

      this.logger.log(
        `Found ${users.length} users and ${billableActions.length} billable actions`,
      );

      // Ensure wallets exist for all users
      await this.ensureWalletsExist(users);

      // Create fake transactions
      const transactionsPerUser = 10; // Number of transactions per user
      let totalTransactions = 0;

      for (const user of users) {
        const wallet = await this.walletRepository.findOne({
          where: { userId: user.id },
        });

        if (!wallet) {
          this.logger.warn(`No wallet found for user ${user.id}, skipping...`);
          continue;
        }

        // Give user some initial balance
        const initialBalance = this.getRandomBalance(50, 500);
        wallet.creditBalance = initialBalance;
        await this.walletRepository.save(wallet);

        // Generate transactions for this user
        const transactions = await this.generateTransactionsForUser(
          user,
          wallet,
          billableActions,
          transactionsPerUser,
        );

        totalTransactions += transactions.length;
        this.logger.log(
          `✅ Created ${transactions.length} transactions for user ${user.email}`,
        );
      }

      this.logger.log(
        `✅ Usage ledger seeding completed. Created ${totalTransactions} total transactions`,
      );
    } catch (error) {
      this.logger.error('Failed to seed usage ledger', error);
      throw error;
    }
  }

  private async ensureWalletsExist(users: User[]): Promise<void> {
    for (const user of users) {
      let wallet = await this.walletRepository.findOne({
        where: { userId: user.id },
      });

      if (!wallet) {
        wallet = this.walletRepository.create({
          userId: user.id,
          creditBalance: 0,
          currency: 'USD',
        });
        await this.walletRepository.save(wallet);
        this.logger.log(`Created wallet for user ${user.email}`);
      }
    }
  }

  private async generateTransactionsForUser(
    user: User,
    wallet: UserWallet,
    billableActions: BillableAction[],
    count: number,
  ): Promise<UsageLedger[]> {
    const transactions: UsageLedger[] = [];
    let currentBalance = parseFloat(String(wallet.creditBalance)) || 0;

    // Generate transactions over the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < count; i++) {
      // Random action (filter by category if needed)
      const availableActions = this.getAvailableActionsForUser(
        billableActions,
        user,
      );
      if (availableActions.length === 0) continue;

      const action =
        availableActions[Math.floor(Math.random() * availableActions.length)];
      const actionCost = parseFloat(String(action.cost)) || 0;

      // Skip if user doesn't have enough balance
      if (currentBalance < actionCost) {
        // Give user more balance occasionally
        if (Math.random() > 0.7) {
          const topUp = this.getRandomBalance(20, 100);
          currentBalance += topUp;
          wallet.creditBalance = currentBalance;
          await this.walletRepository.save(wallet);
        } else {
          continue; // Skip this transaction
        }
      }

      // Random timestamp within last 30 days
      const randomTime =
        thirtyDaysAgo.getTime() +
        Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
      const timestamp = new Date(randomTime);

      const balanceBefore = currentBalance;
      currentBalance -= actionCost;
      const balanceAfter = currentBalance;

      // Create usage ledger entry
      const usageLedger = this.usageLedgerRepository.create({
        userId: user.id,
        actionId: action.id,
        amountDeducted: actionCost,
        currency: action.currency || 'USD',
        balanceBefore,
        balanceAfter,
        timestamp,
        metadata: this.generateMetadata(action, user),
        relatedEntityId: this.generateRelatedEntityId(action),
        relatedEntityType: this.getRelatedEntityType(action),
      });

      const saved = await this.usageLedgerRepository.save(usageLedger);
      transactions.push(saved);

      // Update wallet balance
      wallet.creditBalance = currentBalance;
      await this.walletRepository.save(wallet);
    }

    return transactions;
  }

  private getAvailableActionsForUser(
    actions: BillableAction[],
    user: User,
  ): BillableAction[] {
    // For simplicity, return all active actions
    // In a real scenario, you might filter by user role/profile type
    return actions.filter((action) => action.isActive);
  }

  private generateMetadata(
    action: BillableAction,
    user: User,
  ): Record<string, any> {
    const metadata: Record<string, any> = {
      seeded: true,
      actionCode: action.actionCode,
      userName: user.email,
    };

    // Add action-specific metadata
    switch (action.actionCode) {
      case 'POST_JOB':
        metadata.jobTitle = this.getRandomJobTitle();
        metadata.location = this.getRandomLocation();
        break;
      case 'VIEW_CANDIDATE_CONTACT':
        metadata.candidateId = this.generateFakeUUID();
        metadata.viewedAt = new Date().toISOString();
        break;
      case 'SEND_INMAIL':
        metadata.recipientId = this.generateFakeUUID();
        metadata.messageLength = Math.floor(Math.random() * 500) + 50;
        break;
      case 'AI_CANDIDATE_MATCHING':
        metadata.searchCriteria = {
          skills: this.getRandomSkills(),
          experience: Math.floor(Math.random() * 10) + 1,
        };
        metadata.matchesFound = Math.floor(Math.random() * 50) + 5;
        break;
      case 'BOOST_APPLICATION':
        metadata.applicationId = this.generateFakeUUID();
        metadata.boostDuration = '24h';
        break;
      case 'AI_CV_ENHANCEMENT':
        metadata.cvId = this.generateFakeUUID();
        metadata.enhancementType = 'grammar_and_style';
        break;
    }

    return metadata;
  }

  private generateRelatedEntityId(action: BillableAction): string | undefined {
    // Generate fake UUIDs for related entities
    const shouldHaveRelatedEntity = Math.random() > 0.3; // 70% chance

    if (!shouldHaveRelatedEntity) {
      return undefined;
    }

    return this.generateFakeUUID();
  }

  private getRelatedEntityType(action: BillableAction): string | undefined {
    switch (action.actionCode) {
      case 'POST_JOB':
        return 'job';
      case 'VIEW_CANDIDATE_CONTACT':
        return 'candidate_profile';
      case 'SEND_INMAIL':
        return 'message';
      case 'BOOST_APPLICATION':
        return 'application';
      case 'AI_CV_ENHANCEMENT':
        return 'cv';
      default:
        return undefined;
    }
  }

  private getRandomBalance(min: number, max: number): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  }

  private generateFakeUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getRandomJobTitle(): string {
    const titles = [
      'Senior Software Engineer',
      'Product Manager',
      'Data Scientist',
      'UX Designer',
      'DevOps Engineer',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'QA Engineer',
      'Business Analyst',
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private getRandomLocation(): string {
    const locations = [
      'Ho Chi Minh City, Vietnam',
      'Hanoi, Vietnam',
      'Da Nang, Vietnam',
      'Remote',
      'Singapore',
      'Bangkok, Thailand',
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private getRandomSkills(): string[] {
    const allSkills = [
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'React',
      'Node.js',
      'AWS',
      'Docker',
      'Kubernetes',
      'MongoDB',
      'PostgreSQL',
      'Redis',
    ];
    const count = Math.floor(Math.random() * 5) + 2;
    const shuffled = [...allSkills].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}