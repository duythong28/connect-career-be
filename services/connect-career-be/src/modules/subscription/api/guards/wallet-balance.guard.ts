import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { Reflector } from '@nestjs/core';
import { CurrentUserPayload } from 'src/modules/identity/api/decorators';

export class WalletBalanceGuard implements CanActivate {
  constructor(
    private readonly walletService: WalletService,
    private reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actionCode = this.reflector.get<string>(
      'billableAction',
      context.getHandler(),
    );

    if (!actionCode) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = (request.user as CurrentUserPayload)?.sub;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const hasBalance = await this.walletService.checkBalanceForAction(
      userId,
      actionCode,
    );

    if (!hasBalance) {
      const balance = await this.walletService.getWalletBalance(userId);
      const cost = await this.walletService.getActionCost(actionCode);

      throw new ForbiddenException({
        message: 'Insufficient wallet balance',
        actionCode,
        requiredAmount: cost,
        currentBalance: balance,
        shortfall: cost - balance,
      });
    }

    request.billableAction = actionCode;
    return true;
  }
}
