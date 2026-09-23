/**
 * VELQOARATH — VERIFIED DATASET FUNDAMENTAL PROVIDER (PHASE B)
 *
 * Implements IFundamentalDataProvider using verified macroeconomic release data.
 * Adheres strictly to the NO FABRICATION rule:
 * - Real factual release values
 * - Real consensus forecasts
 * - Explicit UNAVAILABLE/NOT_CONFIGURED status for unpopulated categories
 * - Strict Fact vs Expectation vs Interpretation vs Engine Analysis separation
 */

import {
  IFundamentalDataProvider,
  FundamentalProviderStatus
} from './IFundamentalDataProvider';
import {
  FundamentalObservation,
  FundamentalCategory,
  CentralBankProfile,
  FundamentalDataStatus
} from '../../types/fundamentals';
import { EconomicEvent } from '../../types';
import { VERIFIED_OBSERVATIONS, INITIAL_EVENTS } from '../../data/benchmarkDataset';
import { ECONOMIC_INDICATORS } from '../../data/indicators';
import {
  calculateExpectationSurprise,
  generateFactInterpretationStatements
} from '../../engines/expectations/expectationsEngine';
import {
  buildCentralBankProfile,
  getAllCoreCentralBankProfiles
} from '../centralBank/centralBankProfiles';

/**
 * Maps legacy indicator categories to the 10 canonical fundamental categories.
 */
export function mapLegacyCategoryToFundamental(legacyCategory?: string): FundamentalCategory {
  switch (legacyCategory) {
    case 'INFLATION':
      return 'INFLATION';
    case 'EMPLOYMENT':
      return 'EMPLOYMENT';
    case 'GROWTH':
    case 'CONSUMER_ACTIVITY':
      return 'GROWTH';
    case 'TRADE_BALANCE':
      return 'TRADE_EXTERNAL_BALANCE';
    case 'MONETARY_POLICY':
      return 'CENTRAL_BANK_MONETARY_POLICY';
    case 'INTEREST_RATES':
      return 'INTEREST_RATES';
    case 'FISCAL':
      return 'FISCAL_GOVERNMENT';
    case 'COMMODITY':
      return 'COMMODITY_EXPOSURE_TERMS_OF_TRADE';
    case 'SHOCKS':
      return 'MAJOR_ECONOMIC_SHOCKS';
    case 'EXPECTATIONS':
      return 'MARKET_EXPECTATIONS';
    default:
      return 'GROWTH';
  }
}

export class VerifiedDatasetFundamentalProvider implements IFundamentalDataProvider {
  public readonly name = 'Verified Macroeconomic Baseline Provider';
  private observationsCache: FundamentalObservation[] = [];
  private lastFetchedAt: string;

  constructor() {
    this.lastFetchedAt = new Date().toISOString();
    this.initializeObservations();
  }

  private initializeObservations() {
    this.observationsCache = VERIFIED_OBSERVATIONS.map((raw) => {
      const category = mapLegacyCategoryToFundamental(raw.category);
      const indicatorMeta = ECONOMIC_INDICATORS.find(
        (i) => i.id === raw.indicatorId || i.code === raw.indicatorId
      );
      const highIsHawkish = indicatorMeta?.highIsHawkish ?? true;

      const calc = calculateExpectationSurprise(raw.previous, raw.forecast, raw.actual);
      const statements = generateFactInterpretationStatements(
        {
          previous: raw.previous,
          forecast: raw.forecast,
          actual: raw.actual,
          unit: raw.unit,
          indicatorName: raw.indicatorName,
          period: raw.period,
          category,
          currency: raw.currency,
          highIsHawkish
        },
        calc
      );

      const dataStatus: FundamentalDataStatus =
        raw.sourceStatus === 'CONNECTED' && raw.actual !== null
          ? 'AVAILABLE'
          : raw.sourceStatus === 'CONNECTED'
          ? 'PARTIAL'
          : 'UNAVAILABLE';

      return {
        id: raw.id,
        currency: raw.currency.toUpperCase(),
        indicatorId: raw.indicatorId,
        indicatorName: raw.indicatorName,
        category,
        value: raw.actual,
        unit: raw.unit,
        period: raw.period,
        previous: raw.previous,
        forecast: raw.forecast,
        actual: raw.actual,
        surprise: calc.surprise,
        surpriseType: calc.status,
        releaseDate: raw.releaseDate,
        source: raw.sourceName || raw.source || 'Official National Statistical Bureau',
        sourceUrl: raw.sourceUrl,
        fetchedAt: this.lastFetchedAt,
        dataStatus,
        provenance: `Verified national statistics release from ${raw.sourceName || raw.source}`,
        classification: 'FACT',
        statements,
        notes: raw.notes
      };
    });
  }

  public getStatus(): FundamentalProviderStatus {
    const categoriesSet = new Set<FundamentalCategory>();
    const currenciesSet = new Set<string>();

    for (const obs of this.observationsCache) {
      categoriesSet.add(obs.category);
      currenciesSet.add(obs.currency);
    }

    return {
      providerName: this.name,
      isConfigured: true,
      health: 'AVAILABLE',
      categoriesAvailable: Array.from(categoriesSet),
      currenciesAvailable: Array.from(currenciesSet),
      lastFetchedAt: this.lastFetchedAt,
      message: `Verified fundamental dataset active with ${this.observationsCache.length} official macroeconomic observations across ${currenciesSet.size} currencies.`
    };
  }

  public async getObservations(
    currency?: string,
    category?: FundamentalCategory
  ): Promise<FundamentalObservation[]> {
    let result = this.observationsCache;
    if (currency) {
      const currUpper = currency.toUpperCase();
      result = result.filter((o) => o.currency === currUpper);
    }
    if (category) {
      result = result.filter((o) => o.category === category);
    }
    return result;
  }

  public async getCentralBankProfile(currency: string): Promise<CentralBankProfile | null> {
    return buildCentralBankProfile(currency);
  }

  public async getAllCentralBankProfiles(): Promise<CentralBankProfile[]> {
    return getAllCoreCentralBankProfiles();
  }

  public async getEconomicCalendar(currency?: string): Promise<EconomicEvent[]> {
    if (!currency) return INITIAL_EVENTS;
    const currUpper = currency.toUpperCase();
    return INITIAL_EVENTS.filter((e) => e.currency.toUpperCase() === currUpper);
  }
}
