import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CurrencyConversionService {
  private readonly logger = new Logger(CurrencyConversionService.name);
  private readonly exchangeRateCache: Map<string, { rate: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(private readonly configService: ConfigService) {}

  /**
   * Convert amount from source currency to target currency
   * @param amount Amount to convert
   * @param fromCurrency Source currency code (e.g., 'VND')
   * @param toCurrency Target currency code (e.g., 'USD')
   * @returns Converted amount
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * exchangeRate;

    this.logger.log(
      `Converted ${amount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency} (rate: ${exchangeRate})`,
    );

    return Number(convertedAmount.toFixed(2));
  }

  /**
   * Get exchange rate from cache or API
   */
  private async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = this.exchangeRateCache.get(cacheKey);

    // Return cached rate if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Using cached exchange rate for ${cacheKey}: ${cached.rate}`);
      return cached.rate;
    }

    try {
      // Option 1: Use free API (ExchangeRate-API or similar)
      const rate = await this.fetchExchangeRateFromAPI(fromCurrency, toCurrency);
      
      // Cache the rate
      this.exchangeRateCache.set(cacheKey, {
        rate,
        timestamp: Date.now(),
      });

      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate: ${error.message}`);
      
      // Fallback to hardcoded rate if API fails
      const fallbackRate = this.getFallbackRate(fromCurrency, toCurrency);
      if (fallbackRate) {
        this.logger.warn(`Using fallback exchange rate for ${cacheKey}: ${fallbackRate}`);
        return fallbackRate;
      }

      throw new Error(
        `Failed to get exchange rate from ${fromCurrency} to ${toCurrency}`,
      );
    }
  }


  private async fetchExchangeRateFromAPI(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    try {
      const response = await axios.get(
        `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
        { timeout: 5000 },
      );

      const rate = response.data.rates[toCurrency];
      if (!rate) {
        throw new Error(`Currency ${toCurrency} not found in exchange rates`);
      }

      return rate;
    } catch (error) {
      this.logger.warn(`Primary exchange rate API failed, trying alternative...`);
      
      if (fromCurrency === 'VND' && toCurrency === 'USD') {
        return 1 / 24000; // Convert VND to USD
      }
      if (fromCurrency === 'USD' && toCurrency === 'VND') {
        return 24000; // Convert USD to VND
      }

      throw error;
    }
  }

  /**
   * Get fallback exchange rate (hardcoded, should be updated regularly)
   */
  private getFallbackRate(
    fromCurrency: string,
    toCurrency: string,
  ): number | null {
    // Hardcoded rates (update these regularly)
    const rates: Record<string, number> = {
      VND_USD: 1 / 24000, // 1 VND = 0.00004167 USD
      USD_VND: 24000, // 1 USD = 24,000 VND
    };

    const key = `${fromCurrency}_${toCurrency}`;
    return rates[key] || null;
  }

  /**
   * Clear exchange rate cache
   */
  clearCache(): void {
    this.exchangeRateCache.clear();
    this.logger.log('Exchange rate cache cleared');
  }
}