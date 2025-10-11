export class CreateSubscriptionDto {
  productId: string;
  priceId: string;
  provider: string;
  providerSubscriptionId?: string;
}

export class UpgradeSubscriptionDto {
  productId: string;
  priceId: string;
  provider: string;
}

export class StartTrialDto {
  productId: string;
  priceId: string;
}

export class CheckoutDto {
  productId: string;
  priceId: string;
  provider: string;
  successUrl?: string;
  cancelUrl?: string;
}
