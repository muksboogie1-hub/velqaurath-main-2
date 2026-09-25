/**
 * VELQOARATH — FINANCE CALENDAR LIVE FUNDAMENTAL PROVIDER
 *
 * Implements IFundamentalDataProvider for real-time macroeconomic event tracking.
 * Connects directly to the documented Finance Calendar API:
 * Base URL: https://www.financecalendar.com/wp-json/fc/v1
 *
 * GUARANTEES:
 * - Real documented API base (no invented key requirement).
 * - Honest lifecycle states: NOT_CONFIGURED, CONNECTING, CONNECTED, DEGRADED, ERROR, DISCONNECTED.
 * - Normalized observations and events with full provenance and analytical separation.
 * - Never converts expectation/forecast into fact.
 * - Never fabricates missing actual values.
 * - Overlap protection with in-flight mutex.
 * - Preserves last successful live dataset on refresh failure with DEGRADED/STALE reporting.
 * - Never silently falls back to benchmark dataset.
 */

import {
  IFundamentalDataProvider,
  FundamentalProviderStatus
} from './IFundamentalDataProvider';
import {
  FundamentalObservation,
  FundamentalCategory,
  CentralBankProfile,
  FundamentalProviderLifecycle,
  FundamentalDataStatus,
  FactInterpretationBundle
} from '../../types/fundamentals';
import { EconomicEvent, EconomicObservation } from '../../types';
import {
  buildCentralBankProfile,
  getAllCoreCentralBankProfiles
} from '../centralBank/centralBankProfiles';
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
  'SPAIN': 'EUR',
  'UNITED KINGDOM': 'GBP',
  'UK': 'GBP',
  'BRITAIN': 'GBP',
  'GREAT BRITAIN': 'GBP',
  'JAPAN': 'JPY',
  'SWITZERLAND': 'CHF',
  'SWISS': 'CHF',
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

export function detectCurrencyFromEvent(item: any): string | null {
  if (item.currency) {
    const c = normalizeCountryToCurrency(String(item.currency));
    if (c) return c;
  }
  if (item.country) {
    const c = normalizeCountryToCurrency(String(item.country));
    if (c) return c;
  }
  const text = `${item.title || ''} ${item.name || ''} ${item.url || ''}`.toUpperCase();
  if (
    text.includes('US ') ||
    text.includes('USA') ||
    text.includes('FOMC') ||
    text.includes('FED ') ||
    text.includes('NFP') ||
    text.includes('NONFARM') ||
    text.includes('JOLTS') ||
    text.includes('ISM') ||
    text.includes('JOBLESS') ||
    text.includes('MICHIGAN') ||
    text.includes('BEIGE BOOK')
  ) {
    return 'USD';
  }
  if (
    text.includes('EUROZONE') ||
    text.includes('GERMANY') ||
    text.includes('FRANCE') ||
    text.includes('ITALY') ||
    text.includes('ECB') ||
    text.includes('IFO') ||
    text.includes('ZEW') ||
    text.includes('EURO ')
  ) {
    return 'EUR';
  }
  if (
    text.includes('UK ') ||
    text.includes('BRITAIN') ||
    text.includes('UNITED KINGDOM') ||
    text.includes('BOE') ||
    text.includes('BANK OF ENGLAND') ||
    text.includes('ONS')
  ) {
    return 'GBP';
  }
  if (text.includes('JAPAN') || text.includes('BOJ') || text.includes('BANK OF JAPAN') || text.includes('TOKYO')) {
    return 'JPY';
  }
  if (text.includes('SWISS') || text.includes('SWITZERLAND') || text.includes('SNB')) {
    return 'CHF';
  }
  if (text.includes('CANADA') || text.includes('BOC') || text.includes('BANK OF CANADA') || text.includes('STATSCAN')) {
    return 'CAD';
  }
  if (text.includes('AUSTRALIA') || text.includes('RBA') || text.includes('RESERVE BANK OF AUSTRALIA')) {
    return 'AUD';
  }
  if (text.includes('NEW ZEALAND') || text.includes('RBNZ') || text.includes('RESERVE BANK OF NEW ZEALAND')) {
    return 'NZD';
  }
  return null;
}

export function detectCategoryFromEvent(item: any): FundamentalCategory | null {
  const cat = String(item.category || '').toLowerCase();
  const text = `${item.title || ''} ${item.name || ''}`.toUpperCase();

  if (
    cat.includes('central-bank') ||
    cat.includes('monetary') ||
    text.includes('RATE DECISION') ||
    text.includes('FOMC') ||
    text.includes('ECB') ||
    text.includes('BOE') ||
    text.includes('BOJ') ||
    text.includes('SNB') ||
    text.includes('RBA') ||
    text.includes('RBNZ') ||
    text.includes('BOC')
  ) {
    return 'CENTRAL_BANK_MONETARY_POLICY';
  }
  if (
    text.includes('CPI') ||
    text.includes('INFLATION') ||
    text.includes('PCE') ||
    text.includes('PPI') ||
    text.includes('PRICE INDEX')
  ) {
    return 'INFLATION';
  }
  if (
    text.includes('JOB') ||
    text.includes('EMPLOYMENT') ||
    text.includes('PAYROLL') ||
    text.includes('UNEMPLOYMENT') ||
    text.includes('NFP') ||
    text.includes('JOLTS') ||
    text.includes('LABOR') ||
    text.includes('WAGES') ||
    text.includes('CLAIMS')
  ) {
    return 'EMPLOYMENT';
  }
  if (
    text.includes('GDP') ||
    text.includes('PMI') ||
    text.includes('MANUFACTURING') ||
    text.includes('RETAIL SALES') ||
    text.includes('BUSINESS CLIMATE') ||
    text.includes('IFO') ||
    text.includes('MICHIGAN') ||
    text.includes('SENTIMENT') ||
    text.includes('PRODUCTION') ||
    text.includes('HOME SALES') ||
    text.includes('HOUSING STARTS')
  ) {
    return 'GROWTH';
  }
  if (text.includes('FISCAL') || text.includes('BUDGET') || text.includes('DEBT') || text.includes('DEFICIT') || text.includes('TREASURY')) {
    return 'FISCAL_GOVERNMENT';
  }
  if (text.includes('TRADE') || text.includes('CURRENT ACCOUNT') || text.includes('EXPORTS') || text.includes('IMPORTS')) {
    return 'TRADE_EXTERNAL_BALANCE';
  }
  if (text.includes('COMMODITY') || text.includes('OIL') || text.includes('ENERGY') || text.includes('GOLD') || text.includes('DAIRY') || text.includes('TERMS OF TRADE')) {
    return 'COMMODITY_EXPOSURE_TERMS_OF_TRADE';
  }
  if (text.includes('SHOCK') || text.includes('CRISIS') || text.includes('WAR') || text.includes('GEOPOLITICAL') || text.includes('TARIFF')) {
    return 'MAJOR_ECONOMIC_SHOCKS';
  }
  if (text.includes('YIELD') || text.includes('BOND') || text.includes('AUCTION') || text.includes('INTEREST RATE') || text.includes('10-YEAR') || text.includes('2-YEAR')) {
    return 'INTEREST_RATES';
  }
  if (text.includes('EXPECTATION') || text.includes('FUTURES') || text.includes('SURVEY') || text.includes('CONSENSUS')) {
    return 'MARKET_EXPECTATIONS';
  }
  return null;
}

export function parseMacroNumericValue(val: any): { num: number | null; unit: string } {
  if (val === null || val === undefined) return { num: null, unit: '%' };
  if (typeof val === 'number') {
    return { num: Number.isFinite(val) ? val : null, unit: '%' };
  }
  const s = String(val).trim();
  if (
    !s ||
    s.toLowerCase() === 'null' ||
    s.toLowerCase() === 'pending' ||
    s.toLowerCase() === 'none' ||
    s === '—' ||
    s === '-'
  ) {
    return { num: null, unit: '%' };
  }

  let unit = '%';
  if (s.includes('%')) unit = '%';
  else if (/k\b|thousand/i.test(s)) unit = 'k';
  else if (/m\b|million/i.test(s)) unit = 'M';
  else if (/b\b|billion/i.test(s)) unit = 'B';
  else if (/pts|points|index/i.test(s)) unit = 'pts';

  const match = s.replace(/,/g, '').match(/[-+]?\d*\.?\d+/);
  if (match) {
    const num = parseFloat(match[0]);
    if (!Number.isNaN(num)) {
      return { num, unit };
    }
  }
  return { num: null, unit };
}

export interface FinanceCalendarProviderOptions {
  enabled?: boolean;
  configured?: boolean;
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  staleThresholdMs?: number;
}

export class FinanceCalendarProvider implements IFundamentalDataProvider {
  public readonly name = 'Finance Calendar Provider';
  public readonly mode = 'LIVE' as const;

  public isConfigured: boolean = true;
  public health: FundamentalProviderLifecycle | FundamentalDataStatus = 'DISCONNECTED';
  public lifecycleState: FundamentalProviderLifecycle = 'DISCONNECTED';
  public message: string = '';

  public lastFetchedAt: string | null = null;
  public lastSuccessfulUpdate: string | null = null;
  public lastAttemptAt: string | null = null;
  public nextRefreshAt: string | null = null;

  public apiKey?: string;

  private baseUrl: string;
  private fetchFn: typeof fetch | undefined;
  private staleThresholdMs: number;

  private observationsCache: (FundamentalObservation & EconomicObservation)[] = [];
  private calendarCache: EconomicEvent[] = [];
  private inFlightRefresh: Promise<boolean> | null = null;
  private isFixtureMode: boolean = false;

  constructor(options?: FinanceCalendarProviderOptions) {
    // Audit against ACTUAL Finance Calendar API documentation:
    // Base URL: https://www.financecalendar.com/wp-json/fc/v1
    // No API key required by default.
    this.baseUrl = options?.baseUrl !== undefined
      ? options.baseUrl
      : 'https://www.financecalendar.com/wp-json/fc/v1';

    this.fetchFn =
      options?.fetchFn ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
    this.staleThresholdMs = options?.staleThresholdMs ?? 30 * 60 * 1000; // 30 minutes

    if (options?.apiKey) {
      this.apiKey = options.apiKey;
    }

    // Provider is NOT_CONFIGURED only if explicitly disabled or baseUrl is empty
    if (
      options?.enabled === false ||
      options?.configured === false ||
      this.baseUrl.trim() === ''
    ) {
      this.isConfigured = false;
      this.health = 'NOT_CONFIGURED';
      this.lifecycleState = 'NOT_CONFIGURED';
      this.message = 'Finance Calendar provider is explicitly unconfigured or disabled.';
    } else {
      this.isConfigured = true;
      this.health = 'DISCONNECTED';
      this.lifecycleState = 'DISCONNECTED';
      this.message =
        'Finance Calendar live fundamental provider configured. Ready for live macroeconomic release tracking.';
    }
  }

  public getStatus(): FundamentalProviderStatus {
    const isStale = this.checkIfStale();
    let currentHealth: FundamentalProviderLifecycle | FundamentalDataStatus = this.lifecycleState;

    if (this.lifecycleState === 'CONNECTED' && isStale) {
      currentHealth = 'DEGRADED';
    }

    const categoriesSet = new Set<FundamentalCategory>();
    const currenciesSet = new Set<string>();

    for (const o of this.observationsCache) {
      categoriesSet.add(o.category);
      currenciesSet.add(o.currency);
    }

    // Default canonical coverage if connected
    const defaultCategories: FundamentalCategory[] = [
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
    ];

    const categoriesAvailable: FundamentalCategory[] =
      this.isConfigured && this.observationsCache.length > 0
        ? Array.from(categoriesSet)
        : [];

    const categoriesConfigured: FundamentalCategory[] = defaultCategories;

    const currenciesAvailable = this.isConfigured
      ? ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']
      : [];

    let oldestObsTime: string | null = null;
    if (this.observationsCache.length > 0) {
      const sorted = [...this.observationsCache]
        .map((o) => o.releaseDate)
        .filter(Boolean)
        .sort();
      oldestObsTime = sorted[0] || null;
    }

    return {
      providerName: this.name,
      isConfigured: this.isConfigured,
      health: currentHealth,
      lifecycleState: this.lifecycleState,
      datasetMode: 'LIVE',
      categoriesAvailable,
      categoriesConfigured,
      categoriesPopulatedCount: categoriesAvailable.length,
      categoriesConfiguredCount: categoriesConfigured.length,
      currenciesAvailable,
      lastFetchedAt: this.lastFetchedAt,
      lastSuccessfulUpdate: this.lastSuccessfulUpdate,
      lastAttemptAt: this.lastAttemptAt,
      nextRefreshAt: this.nextRefreshAt,
      freshness: !this.lastSuccessfulUpdate
        ? 'UNAVAILABLE'
        : isStale
        ? 'STALE'
        : this.lifecycleState === 'DEGRADED'
        ? 'DEGRADED'
        : 'FRESH',
      isStale,
      oldestObservationTimestamp: oldestObsTime,
      count: this.observationsCache.length,
      message: this.message
    };
  }

  public checkIfStale(): boolean {
    if (!this.lastSuccessfulUpdate) return false;
    const elapsed = Date.now() - new Date(this.lastSuccessfulUpdate).getTime();
    return elapsed > this.staleThresholdMs;
  }

  /**
   * Refreshes fundamental calendar and macroeconomic releases with overlap protection.
   * Connects to Finance Calendar API, normalizes items, and retains provenance.
   */
  public async refresh(force: boolean = false): Promise<boolean> {
    if (!this.isConfigured) {
      this.health = 'NOT_CONFIGURED';
      this.lifecycleState = 'NOT_CONFIGURED';
      this.message = 'Finance Calendar live provider is not configured. Live refresh bypassed.';
      return false;
    }

    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }

    this.lastAttemptAt = new Date().toISOString();
    this.lifecycleState = 'CONNECTING';

    if (this.isFixtureMode) {
      if (this.fetchFn) {
        try {
          const resp = await this.fetchFn(this.baseUrl);
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }
        } catch (err: any) {
          if (this.observationsCache.length > 0) {
            this.lifecycleState = 'DEGRADED';
            this.health = 'DEGRADED';
            this.message = `Finance Calendar refresh failed (${err?.message || err}). Retaining last valid live dataset (${this.lastSuccessfulUpdate}).`;
          } else {
            this.lifecycleState = 'ERROR';
            this.health = 'ERROR';
            this.message = `Finance Calendar connection failed (${err?.message || err}). No live fundamental data available.`;
          }
          return false;
        }
      }
      const nowIso = new Date().toISOString();
      this.lastSuccessfulUpdate = nowIso;
      this.lastFetchedAt = nowIso;
      this.lifecycleState = 'CONNECTED';
      this.health = 'AVAILABLE';
      return true;
    }

    this.inFlightRefresh = (async () => {
      try {
        if (!this.fetchFn) {
          throw new Error('Fetch function unavailable in runtime environment');
        }

        // Fetch a date window: from 30 days ago to 30 days ahead (or direct /calendar)
        const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const toDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const url = `${this.baseUrl}/calendar?from=${fromDate}&to=${toDate}&limit=500`;

        let fetchSignal: any;
        if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout === 'function') {
          try {
            fetchSignal = (AbortSignal as any).timeout(15000);
          } catch {
            // ignore if not supported
          }
        }
        const fetchOpts = fetchSignal ? { signal: fetchSignal } : undefined;

        let response: Response;
        try {
          response = await this.fetchFn(url, fetchOpts);
        } catch (fetchErr: any) {
          // If query with params failed, attempt default endpoint
          const fallbackUrl = `${this.baseUrl}/calendar`;
          response = await this.fetchFn(fallbackUrl, fetchOpts);
        }

        if (!response.ok || response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.statusText || 'Request failed'}`);
        }

        const rawData = await response.json();
        const items: any[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.events)
          ? rawData.events
          : [];

        if (items.length === 0 && !Array.isArray(rawData)) {
          throw new Error('Finance Calendar response format unrecognized or empty');
        }

        const normalizedEvents: EconomicEvent[] = [];
        const normalizedObservations: (FundamentalObservation & EconomicObservation)[] = [];
        const nowIso = new Date().toISOString();
        const seenEventIds = new Set<string>();

        for (const item of items) {
          const currency = detectCurrencyFromEvent(item);
          if (!currency) continue;

          const baseSlug = (item.slug || item.name || item.title || item.event || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 30);
          const rawId = item.id ? String(item.id) : null;
          let eventId = rawId
            ? `fc-${rawId}`
            : baseSlug
            ? `fc-${currency.toLowerCase()}-${item.date || item.time_utc || 'evt'}-${baseSlug}`
            : `fc-${currency.toLowerCase()}-${item.date || item.time_utc || 'evt'}`;

          if (seenEventIds.has(eventId)) {
            let counter = 1;
            while (seenEventIds.has(`${eventId}-${counter}`)) {
              counter++;
            }
            eventId = `${eventId}-${counter}`;
          }
          seenEventIds.add(eventId);
          const eventName = String(item.name || item.title || item.event || 'Macroeconomic Release');
          const category = detectCategoryFromEvent(item);
          const impactRaw = String(item.impact || item.importance || 'MEDIUM').toUpperCase();
          const importance: 'HIGH' | 'MEDIUM' | 'LOW' =
            impactRaw === 'HIGH' ? 'HIGH' : impactRaw === 'LOW' ? 'LOW' : 'MEDIUM';

          const scheduledTime = item.time_utc || item.date || nowIso;
          const period = item.period || (item.date ? String(item.date).slice(0, 7) : 'Current');

          const prevParsed = parseMacroNumericValue(item.prior ?? item.previous);
          const forecastParsed = parseMacroNumericValue(item.consensus ?? item.forecast);
          const actualParsed = parseMacroNumericValue(item.actual);

          const previous = prevParsed.num;
          const forecast = forecastParsed.num;
          // STRICT NO-FABRICATION RULE: never fabricate missing actual values
          const actual = actualParsed.num;
          const unit = actualParsed.unit || forecastParsed.unit || prevParsed.unit || '%';

          const source = item.source || 'Finance Calendar';
          const sourceUrl = item.url || item.sourceUrl || 'https://www.financecalendar.com';

          const status: 'UPCOMING' | 'RELEASED' = actual !== null ? 'RELEASED' : 'UPCOMING';

          // 1. Economic Event model
          normalizedEvents.push({
            id: eventId,
            name: eventName,
            currency,
            importance,
            scheduledTime,
            previous,
            forecast,
            actual,
            unit,
            source,
            status
          });

          // 2. Fundamental Observation model (only for released facts or verified historicals with classified category)
          if (actual !== null && category !== null) {
            const surpriseCalc = calculateExpectationSurprise(previous, forecast, actual);
            const statements: FactInterpretationBundle = generateFactInterpretationStatements(
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
              sourceName: source,
              sourceUrl,
              sourceStatus: 'CONNECTED',
              fetchedAt: nowIso,
              dataStatus: 'AVAILABLE',
              provenance: `Finance Calendar Live API (${sourceUrl})`,
              classification: 'FACT',
              statements,
              notes: `Live release normalized from Finance Calendar API (${scheduledTime})`
            });
          }
        }

        if (normalizedObservations.length === 0 && normalizedEvents.length > 0) {
          // Edge case: Events exist, but released macro observations are empty
          // Retain prior observationsCache if one was already populated
          if (this.observationsCache.length > 0) {
            this.calendarCache = normalizedEvents;
            this.lastFetchedAt = nowIso;
            this.lifecycleState = 'DEGRADED';
            this.health = 'DEGRADED';
            this.message = `Finance Calendar live sync: ${normalizedEvents.length} calendar events updated, but 0 fresh macro prints returned. Retaining ${this.observationsCache.length} prior observations.`;
          } else {
            this.calendarCache = normalizedEvents;
            this.observationsCache = [];
            this.lastFetchedAt = nowIso;
            this.lifecycleState = 'DEGRADED';
            this.health = 'DEGRADED';
            this.message = `Finance Calendar live sync: ${normalizedEvents.length} calendar events parsed, but 0 released macroeconomic observations available. Awaiting released macro prints.`;
          }
          return false;
        }

        this.observationsCache = normalizedObservations;
        this.calendarCache = normalizedEvents;
        this.lastSuccessfulUpdate = nowIso;
        this.lastFetchedAt = nowIso;
        this.lifecycleState = 'CONNECTED';
        this.health = 'CONNECTED';
        this.message = `Finance Calendar live sync active: ${normalizedEvents.length} events, ${normalizedObservations.length} released macro prints parsed.`;

        return true;
      } catch (err: any) {
        // STRICT LIVE FAILURE BEHAVIOR:
        // If prior valid live cache exists: retain it, mark DEGRADED, expose stale age
        // If no prior valid cache exists: mark ERROR, do NOT substitute benchmark data
        if (this.observationsCache.length > 0) {
          this.lifecycleState = 'DEGRADED';
          this.health = 'DEGRADED';
          this.message = `Finance Calendar refresh failed (${err?.message || err}). Retaining last valid live dataset (${this.lastSuccessfulUpdate}).`;
        } else {
          this.lifecycleState = 'ERROR';
          this.health = 'ERROR';
          this.message = `Finance Calendar connection failed (${err?.message || err}). No live fundamental data available.`;
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

  /**
   * Test fixture helper to populate controlled live data without network call.
   */
  public setFixtureData(
    events: EconomicEvent[],
    observations: (FundamentalObservation & EconomicObservation)[]
  ): void {
    const nowIso = new Date().toISOString();
    this.isFixtureMode = true;
    this.calendarCache = [...events];
    this.observationsCache = [...observations];
    this.lastSuccessfulUpdate = nowIso;
    this.lastFetchedAt = nowIso;
    this.lifecycleState = 'CONNECTED';
    this.health = 'AVAILABLE';
    this.fetchFn = async () =>
      new Response(JSON.stringify({ count: events.length, events: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    this.message = `Finance Calendar fixture dataset loaded: ${events.length} events, ${observations.length} observations.`;
  }
}
