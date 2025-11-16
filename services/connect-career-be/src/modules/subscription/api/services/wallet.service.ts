import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserWallet } from '../../domain/entities/user-wallet.entity';
import { Repository } from 'typeorm';
import { UsageLedger } from '../../domain/entities/usage-ledger.entity';
import { BillableAction } from '../../domain/entities/billable-action.entity';
import {
  TransactionStatus,
  TransactionType,
  WalletTransaction,
} from '../../domain/entities/wallet-transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(UserWallet)
    private readonly walletRepository: Repository<UserWallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(UsageLedger)
    private readonly usageLedgerRepository: Repository<UsageLedger>,
    @InjectRepository(BillableAction)
    private readonly billableActionRepository: Repository<BillableAction>,
  ) {}
  async getOrCreateWallet(userId: string): Promise<UserWallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        creditBalance: 0,
        currency: 'USD',
      });
      await this.walletRepository.save(wallet);
    }
    return wallet;
  }

  async getWalletBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.creditBalance;
  }

  async checkBalance(userId: string, amount: number): Promise<boolean> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.hasSufficientBalance(amount);
  }

  async checkBalanceForAction(
    userId: string,
    actionCode: string,
  ): Promise<boolean> {
    const action = await this.billableActionRepository.findOne({
      where: { actionCode, isActive: true },
    });

    if (!action) {
      return false;
    }

    if (action.cost === 0) {
      return true;
    }

    return this.checkBalance(userId, action.cost);
  }

  async deductForAction(
    userId: string,
    actionCode: string,
    context: {
      candidateProfileId?: string;
      recruiterProfileId?: string;
      organizationId?: string;
      relatedEntityId?: string;
      relatedEntityType?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const action = await this.billableActionRepository.findOne({
      where: { actionCode, isActive: true },
    });

    if (!action) {
      return {
        success: false,
        newBalance: 0,
        error: `Action ${actionCode} not found or inactive`,
      };
    }
    const wallet = await this.getOrCreateWallet(userId);

    // Convert to numbers to prevent string concatenation
    const currentBalance = parseFloat(String(wallet.creditBalance)) || 0;
    const actionCost = parseFloat(String(action.cost)) || 0;

    if (currentBalance < actionCost) {
      return {
        success: false,
        newBalance: currentBalance,
        error: 'Insufficient balance',
      };
    }

    const balanceBefore = currentBalance;
    wallet.creditBalance = balanceBefore - actionCost;
    const balanceAfter = wallet.creditBalance;

    await this.walletRepository.save(wallet);

    const usage = this.usageLedgerRepository.create({
      userId,
      actionId: action.id,
      amountDeducted: actionCost,
      currency: action.currency,
      balanceBefore,
      balanceAfter,
      userProfileId: context.candidateProfileId || context.recruiterProfileId,
      organizationId: context.organizationId,
      relatedEntityId: context.relatedEntityId,
      relatedEntityType: context.relatedEntityType,
      metadata: context.metadata,
    });

    await this.usageLedgerRepository.save(usage);

    const transaction = this.walletTransactionRepository.create({
      walletId: wallet.id,
      userId,
      type: TransactionType.DEBIT,
      amount: actionCost,
      currency: action.currency,
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.COMPLETED,
      description: `Charged for ${action.actionName}`,
      relatedUsageLedgerId: usage.id,
      metadata: {
        actionCode,
        actionName: action.actionName,
        ...context.metadata,
      },
    });

    await this.walletTransactionRepository.save(transaction);
    return { success: true, newBalance: balanceAfter };
  }

  async creditWallet(
    walletId: string,
    amount: number,
    description?: string,
    metadata?: Record<string, any>,
  ): Promise<WalletTransaction> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const balanceBefore = parseFloat(String(wallet.creditBalance)) || 0;
    const creditAmount = parseFloat(String(amount)) || 0;
    if (isNaN(creditAmount) || creditAmount <= 0) {
      throw new Error(`Invalid credit amount: ${amount}`);
    }
    wallet.creditBalance = balanceBefore + creditAmount;
    const balanceAfter = wallet.creditBalance;

    await this.walletRepository.save(wallet);

    const transaction = this.walletTransactionRepository.create({
      walletId: wallet.id,
      userId: wallet.userId,
      type: TransactionType.CREDIT,
      amount,
      currency: wallet.currency,
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.COMPLETED,
      description: description || 'Wallet credit',
      metadata,
    });

    return this.walletTransactionRepository.save(transaction);
  }

  async getActionCost(actionCode: string): Promise<number> {
    const action = await this.billableActionRepository.findOne({
      where: { actionCode, isActive: true },
    });
    if (!action) {
      throw new NotFoundException('Action not found');
    }
    return action.cost;
  }

  async getActionName(actionCode: string): Promise<string> {
    const action = await this.billableActionRepository.findOne({
      where: { actionCode, isActive: true },
    });
    if (!action) {
      throw new NotFoundException('Action not found');
    }
    return action.actionName;
  }
}
