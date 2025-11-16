import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserWallet } from './domain/entities/user-wallet.entity';
import { WalletTransaction } from './domain/entities/wallet-transaction.entity';
import { UsageLedger } from './domain/entities/usage-ledger.entity';
import { BillableAction } from './domain/entities/billable-action.entity';
import { WalletController } from './api/controllers/wallet.controller';
import { WalletService } from './api/services/wallet.service';
import { PaymentService } from './api/services/payment.service';
import { PaymentTransaction } from './domain/entities/payment-transaction.entity';
import { PaymentMethod } from './domain/entities/payment-method.entity';
import { PaymentProviderFactory } from './infrastructure/payment-providers/payment-provider.factory';
import { MoMoProvider } from './infrastructure/payment-providers/momo.provider';
import { ZaloPayProvider } from './infrastructure/payment-providers/zalopay.provider';
import { StripeProvider } from './infrastructure/payment-providers/stripe.provider';
import { PayPalProvider } from './infrastructure/payment-providers/paypal.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserWallet,
      WalletTransaction,
      UsageLedger,
      BillableAction,
      PaymentTransaction,
      PaymentMethod,
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, PaymentService, PaymentProviderFactory, MoMoProvider, ZaloPayProvider, StripeProvider, PayPalProvider],
  exports: [WalletService, PaymentService],
})
export class WalletModule {}
