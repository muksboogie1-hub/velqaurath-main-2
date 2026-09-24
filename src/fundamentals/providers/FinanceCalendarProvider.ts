/**
 * VELQOARATH — FINANCE CALENDAR LIVE FUNDAMENTAL PROVIDER
 *
 * Implements IFundamentalDataProvider for real-time macroeconomic event tracking.
 * Adheres strictly to the NO FABRICATION rule:
 * - If FINANCE_CALENDAR_API_KEY is not configured: honestly returns NOT_CONFIGURED.
 * - Never secretly substitutes benchmark/test data and labels it live.
 * - Full normalization across 8 major currencies and 10 fundamental categories.
 * - Preserves last successful live dataset on refresh failure with DEGRADED/STALE reporting.
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
import {
  buildCentralBankProfile,
  getAllCoreCentralBankProfiles
} from '../centralBank/centralBankProfiles';
import { mapLegacyCategoryToFundamental } from './VerifiedDatasetFundamentalProvider';
import {
  calculateExpectationSurprise,
  generateFactInterpretationStatements
} from '../../engines/expectations/expectationsEngine';

export const COUNTRY_TO_CURRENCY_MAP: Record<string, string> = Object.freeze({
  'UNITED STATES': 'USD',
  'USA': 'USD',
  'US': 'USD',
  'EURO AREA': 'EUR',
  'EUROZONE': 'EUR',
  'EUROPE': 'EUR',
  'GERMANY': 'EUR',
  'FRANCE': 'EUR',
  'ITALY': 'EUR',
  'UNITED KINGDOM': 'GBP',
  'UK': 'GBP',
  'BRITAIN': 'GBP',
  'GREAT BRITAIN': 'GBP',
  'JAPAN': 'JPY',
  'SWITZERLAND': 'CHF',
  'CANADA': 'CAD',
  'AUSTRALIA': 'AUD',
  'NEW ZEALAND': 'NZD'
});

export function normalizeCountryToCurrency(countryOrCurrency: string): string | null {
  const clean = countryOrCurrency.trim().toUpperCase();
  if (['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'].includes(clean)) {
    return clean;
  }
  return COUNTRY_TO_CURRENCY_MAP[clean] ?? null;
}

export interface FinanceCalendarProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  staleThresholdMs?: number;
}

export class FinanceCalendarProvider implements IFundamentalDataProvider {
  public readonly name = 'Finance Calendar Provider';
  public apiKey: string | null = null;
  public isConfigured: boolean = false;
  public health: FundamentalDataStatus = 'NOT_CONFIGURED';
  public message: string = '';

  public lastFetchedAt: string | null = null;
  public lastSuccessfulUpdate: string | null = null;
  public lastAttemptAt: string | null = null;
  public nextRefreshAt: string | null = null;

  private baseUrl: string;
  private fetchFn: typeof fetch | undefined;
  private staleThresholdMs: number;

  private observationsCache: FundamentalObservation[] = [];
  private calendarCache: EconomicEvent[] = [];
  private inFlightRefresh: Promise<boolean> | null = null;

  constructor(options?: FinanceCalendarProviderOptions) {
    const envKey =
      typeof process !== 'undefined' && process.env
        ? process.env.FINANCE_CALENDAR_API_KEY
        : undefined;
    const resolvedKey = options?.apiKey ?? envKey ?? '';

    this.baseUrl = options?.baseUrl ?? 'https://api.financecalendar.com/v1';
    this.fetchFn =
      options?.fetchFn ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
    this.staleThresholdMs = options?.staleThresholdMs ?? 30 * 60 * 1000; // 30 minutes

    if (resolvedKey && resolvedKey.trim().length > 0) {
      this.apiKey = resolvedKey.trim();
      this.isConfigured = true;
      this.health = 'AVAILABLE';
      this.message = 'Finance Calendar API key configured. Live fundamental provider active.';
    } else {
      this.apiKey = null;
      this.isConfigured = false;
      this.health = 'NOT_CONFIGURED';
      this.message =
        'Finance Calendar API key is not configured (FINANCE_CALENDAR_API_KEY missing on server). Fundamental live provider inactive.';
    }
  }

  public getStatus(): FundamentalProviderStatus & {
    lastSuccessfulUpdate?: string | null;
    lastAttemptAt?: string | null;
    nextRefreshAt?: string | null;
    freshness?: string;
    isStale?: boolean;
  } {
    const isStale = this.checkIfStale();
    let currentHealth = this.health;

    if (this.isConfigured && isStale && this.observationsCache.length > 0) {
      currentHealth = 'STALE';
    }

    return {
      providerName: this.name,
      isConfigured: this.isConfigured,
      health: currentHealth,
      categoriesAvailable: this.isConfigured
        ? [
            'INFLATION',
            'EMPLOYMENT',
            'GROWTH',
            'CENTRAL_BANK_MONETARY_POLICY',
            'INTEREST_RATES',
            'TRADE_EXTERNAL_BALANCE',
            'FISCAL_GOVERNMENT',
            'COMMODITY_EXPOSURE_TERMS_OF_TRADE',
            'MAJOR_ECONOMIC_SHOCKS',
            'MARKET_EXPECTATIONS'
          ]
        : [],
      currenciesAvailable: this.isConfigured
        ? ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']
        : [],
      lastFetchedAt: this.lastFetchedAt,
      lastSuccessfulUpdate: this.lastSuccessfulUpdate,
      lastAttemptAt: this.lastAttemptAt,
      nextRefreshAt: this.nextRefreshAt,
      freshness: isStale ? 'STALE' : 'FRESH',
      isStale,
      message: this.message
    };
  }

  public checkIfStale(): boolean {
    if (!this.lastSuccessfulUpdate) return false;
    const elapsed = Date.now() - new Date(this.lastSuccessfulUpdate).getTime();
    return elapsed > this.staleThresholdMs;
  }

  /**
   * Refreshes fundamental calendar releases with overlap protection.
   */
  public async refresh(force: boolean = false): Promise<boolean> {
    if (!this.isConfigured || !this.apiKey) {
      this.health = 'NOT_CONFIGURED';
      this.message =
        'Finance Calendar API key is not configured. Live refresh bypassed without fabricating data.';
      return false;
    }

    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }

    this.lastAttemptAt = new Date().toISOString();

    this.inFlightRefresh = (async () => {
      try {
        if (!this.fetchFn) {
          throw new Error('Fetch function unavailable in environment');
        }

        const url = `${this.baseUrl}/calendar?apiKey=${encodeURIComponent(this.apiKey!)}`;
        const response = await this.fetchFn(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawData = await response.json();
        const items: any[] = Array.isArray(rawData) ? rawData : rawData?.events ?? [];

        const normalizedEvents: EconomicEvent[] = [];
        const normalizedObservations: FundamentalObservation[] = [];
        const nowIso = new Date().toISOString();

        for (const item of items) {
          const currency = normalizeCountryToCurrency(item.country ?? item.currency ?? '');
          if (!currency) continue;

          const eventId = String(item.id || `evt-${currency.toLowerCase()}-${Date.now()}`);
          const eventName = String(item.eventName || item.event || item.title || 'Economic Release');
          const category = mapLegacyCategoryToFundamental(item.category);
          const impact = (item.impact || item.importance || 'MEDIUM').toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW';
          const scheduledTime = item.releaseTimestamp || item.date || item.time || nowIso;
          const period = item.period || 'Current';

          const previous = typeof item.previous === 'number' ? item.previous : null;
          const forecast = typeof item.forecast === 'number' ? item.forecast : (typeof item.consensus === 'number' ? item.consensus : null);
          const actual = typeof item.actual === 'number' ? item.actual : null;
          const unit = item.unit || '%';
          const source = item.source || 'Finance Calendar';
          const sourceUrl = item.url || item.sourceUrl || 'https://financecalendar.com';

          normalizedEvents.push({
            id: eventId,
            name: eventName,
            currency,
            importance: impact,
            scheduledTime,
            previous,
            forecast,
            actual,
            unit,
            source,
            status: actual !== null ? 'RELEASED' : 'UPCOMING'
          });

          if (actual !== null) {
            const surpriseCalc = calculateExpectationSurprise(previous, forecast, actual);
            const statements = generateFactInterpretationStatements(
              {
                previous,
                forecast,
                actual,
                unit,
                indicatorName: eventName,
                period,
                category,
                currency,
                highIsHawkish: true
              },
              surpriseCalc
            );

            normalizedObservations.push({
              id: `obs-${eventId}`,
              currency,
              indicatorId: eventId,
              indicatorName: eventName,
              category,
              value: actual,
              unit,
              period,
              previous,
              forecast,
              actual,
              surprise: surpriseCalc.surprise,
              surpriseType: surpriseCalc.status,
              releaseDate: scheduledTime,
              source,
              sourceUrl,
              fetchedAt: nowIso,
              dataStatus: 'AVAILABLE',
              provenance: 'Finance Calendar Live Feed',
              classification: 'FACT',
              statements
            });
          }
        }

        this.observationsCache = normalizedObservations;
        this.calendarCache = normalizedEvents;
        this.lastSuccessfulUpdate = nowIso;
        this.lastFetchedAt = nowIso;
        this.health = 'AVAILABLE';
        this.message = `Finance Calendar live sync completed: ${normalizedEvents.length} events, ${normalizedObservations.length} releases parsed.`;
        return true;
      } catch (err: any) {
        // Preserve existing cached data on failure
        if (this.observationsCache.length > 0) {
          this.health = 'STALE';
          this.message = `Finance Calendar refresh failed (${err?.message || err}). Preserving previous live snapshot.`;
        } else {
          this.health = 'UNAVAILABLE';
          this.message = `Finance Calendar connection error: ${err?.message || err}.`;
        }
        return false;
      } finally {
        this.inFlightRefresh = null;
      }
    })();

    return this.inFlightRefresh;
  }

  public async getObservations(
    currency?: string,
    category?: FundamentalCategory
  ): Promise<FundamentalObservation[]> {
    let result = [...this.observationsCache];
    if (currency) {
      const clean = currency.trim().toUpperCase();
      result = result.filter((o) => o.currency.toUpperCase() === clean);
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
    if (currency) {
      const clean = currency.trim().toUpperCase();
      return this.calendarCache.filter((e) => e.currency.toUpperCase() === clean);
    }
    return [...this.calendarCache];
  }
}
