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
import { User } from '../identity/domain/entities';
import { MoMoPaymentController } from './api/controllers/momo.controller';
import { StripePaymentController } from './api/controllers/stripe.controller';
import { ZaloPayPaymentController } from './api/controllers/zalopay.controller';
import { WalletBackofficeController } from './api/controllers/wallet-backoffice.controller';
import { RefundBackofficeController } from './api/controllers/refund-backoffice.controller';
import { RefundBackofficeService } from './api/services/refund-backoffice.service';
import { WalletBackofficeService } from './api/services/wallet-backoffice.service';
import { Refund } from './domain/entities/refund.entity';
import { IdentityModule } from '../identity/identity.module';
import { BillableActionsSeeder } from './infrastructure/seeders/billable-actions.seeder';
import { BillableActionsService } from './api/services/billable-action.service';
import { BillableActionsController } from './api/controllers/billable-action.controller';
import { CurrencyConversionService } from './api/services/currency-conversion.service';
import { UsageLedgerSeeder } from './infrastructure/seeders/usage-ledger.seeder';
import { CandidateProfile } from '../profile/domain/entities/candidate-profile.entity';
import { OrganizationMembership } from '../profile/domain/entities/organization-memberships.entity';
import { WalletBalanceGuard } from './api/guards/wallet-balance.guard';
import { WalletDeductionInterceptor } from './api/interceptors/wallet-deduction.interceptor';
import { PublicController } from './api/controllers/public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserWallet,
      User,
      WalletTransaction,
      UsageLedger,
      BillableAction,
      PaymentTransaction,
      PaymentMethod,
      Refund,
      CandidateProfile,
      OrganizationMembership,
    ]),
    IdentityModule,
  ],
  controllers: [
    WalletController,
    PublicController,
    MoMoPaymentController,
    StripePaymentController,
    ZaloPayPaymentController,
    WalletBackofficeController,
    RefundBackofficeController,
    BillableActionsController,
  ],
  providers: [
    WalletService,
    PaymentService,
    PaymentProviderFactory,
    MoMoProvider,
    ZaloPayProvider,
    StripeProvider,
    WalletBackofficeService,
    RefundBackofficeService,
    BillableActionsService,
    BillableActionsSeeder,
    UsageLedgerSeeder,
    CurrencyConversionService,
    WalletBalanceGuard,
    WalletDeductionInterceptor,
  ],
  exports: [
    WalletService,
    PaymentService,
    BillableActionsService,
    WalletBalanceGuard,
    WalletDeductionInterceptor,
  ],
})
export class WalletModule {}
