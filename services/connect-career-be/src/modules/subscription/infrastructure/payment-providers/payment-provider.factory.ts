import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { IPaymentProvider } from './payment-provider.interface';
import { MoMoProvider } from './momo.provider';
import { ZaloPayProvider } from './zalopay.provider';
import { StripeProvider } from './stripe.provider';
import { PaymentMethod } from '../../domain/entities/payment-transaction.entity';

export enum BasePaymentProviderCode {
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

export interface AvailableProvider {
  code: string;
  name: string;
  supportedMethods: readonly PaymentMethod[];
  supportedCurrencies: readonly string[];
  supportedRegions?: readonly string[];
}

@Injectable()
export class PaymentProviderFactory {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly providers: Map<string, IPaymentProvider> = new Map();

  constructor(
    private readonly momoProvider: MoMoProvider,
    private readonly stripeProvider: StripeProvider,
    private readonly zalopayProvider: ZaloPayProvider,
  ) {
    this.registerProvider(this.momoProvider);
    this.registerProvider(this.stripeProvider);
    this.registerProvider(this.zalopayProvider);
  }

  private registerProvider(provider: IPaymentProvider): void {
    const code = provider.providerCode.toLowerCase();
    if (this.providers.has(code)) {
      this.logger.debug(
        `Provider with code '${code}' is already registered. Overwriting...`,
      );
    }
    this.providers.set(code, provider);
  }

  getProvider(providerCode: string): IPaymentProvider {
    const code = providerCode.toLowerCase();
    const provider = this.providers.get(code);

    if (!provider) {
      const availableProviders = Array.from(this.providers.keys()).join(', ');
      throw new BadRequestException(
        `Payment provider '${providerCode}' is not supported. Available providers: ${availableProviders}`,
      );
    }

    return provider;
  }

  getProviderOrNull(providerCode: string): IPaymentProvider | null {
    try {
      return this.getProvider(providerCode);
    } catch {
      return null;
    }
  }

  hasProvider(providerCode: string): boolean {
    return this.providers.has(providerCode.toLowerCase());
  }

  getAvailableProviderCodes(): string[] {
    return Array.from(this.providers.keys());
  }

  getAllProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }

  getAvailableProviders(): AvailableProvider[] {
    return Array.from(this.providers.values()).map((provider) => ({
      code: provider.providerCode,
      name: provider.name,
      supportedMethods: provider.supportedMethods,
      supportedCurrencies: provider.supportedCurrencies,
      supportedRegions: provider.supportedRegions,
    }));
  }

  getProvidersByCurrency(currency: string): IPaymentProvider[] {
    const normalizedCurrency = currency.toUpperCase();
    return Array.from(this.providers.values()).filter((provider) =>
      provider.supportedCurrencies.includes(normalizedCurrency),
    );
  }

  getProvidersByPaymentMethod(
    paymentMethod: PaymentMethod,
  ): IPaymentProvider[] {
    return Array.from(this.providers.values()).filter((provider) =>
      provider.supportedMethods.includes(paymentMethod),
    );
  }

  getProvidersByRegion(region: string): IPaymentProvider[] {
    const normalizedRegion = region.toUpperCase();
    return Array.from(this.providers.values()).filter(
      (provider) =>
        !provider.supportedRegions ||
        provider.supportedRegions.includes(normalizedRegion),
    );
  }

  getProvidersByCriteria(
    currency?: string,
    paymentMethod?: PaymentMethod,
    region?: string,
  ): IPaymentProvider[] {
    let filteredProviders = Array.from(this.providers.values());

    if (currency) {
      const normalizedCurrency = currency.toUpperCase();
      filteredProviders = filteredProviders.filter((provider) =>
        provider.supportedCurrencies.includes(normalizedCurrency),
      );
    }

    if (paymentMethod) {
      filteredProviders = filteredProviders.filter((provider) =>
        provider.supportedMethods.includes(paymentMethod),
      );
    }

    if (region) {
      const normalizedRegion = region.toUpperCase();
      filteredProviders = filteredProviders.filter(
        (provider) =>
          !provider.supportedRegions ||
          provider.supportedRegions.includes(normalizedRegion),
      );
    }

    return filteredProviders;
  }

  validateProviderCurrency(providerCode: string, currency: string): boolean {
    const provider = this.getProviderOrNull(providerCode);
    if (!provider) {
      return false;
    }

    return provider.supportedCurrencies.includes(currency.toUpperCase());
  }

  validateProviderPaymentMethod(
    providerCode: string,
    paymentMethod: PaymentMethod,
  ): boolean {
    const provider = this.getProviderOrNull(providerCode);
    if (!provider) {
      return false;
    }

    return provider.supportedMethods.includes(paymentMethod);
  }

  validateProviderRegion(providerCode: string, region: string): boolean {
    const provider = this.getProviderOrNull(providerCode);
    if (!provider) {
      return false;
    }

    if (!provider.supportedRegions) {
      return true; // Provider supports all regions
    }

    return provider.supportedRegions.includes(region.toUpperCase());
  }

  getProviderName(providerCode: string): string {
    const provider = this.getProvider(providerCode);
    return provider.name;
  }
}
