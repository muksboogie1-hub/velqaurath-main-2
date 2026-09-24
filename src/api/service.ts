import { globalStore } from '../data/store';
import { evaluateCurrencyState } from '../engines/currency/currencyEngine';
import { evaluatePairIntelligence } from '../engines/pair/pairEngine';
import { getPairSessionRelevance, calculateWatchWindow } from '../engines/session/sessionEngine';
import { getActiveSessionOverview, MARKET_SESSIONS } from '../data/sessions';
import { ECONOMIC_INDICATORS } from '../data/indicators';
import { marketDataService } from '../marketData/service/marketDataService';
import { analyzeObservationExpectations } from '../engines/expectations/expectationsEngine';
import { fundamentalService } from '../fundamentals/service/fundamentalService';
import { evaluateCurrencyFundamentalIntelligence } from '../fundamentals/engine/currencyIntelligenceEngine';
import { buildCentralBankProfile, getAllCoreCentralBankProfiles } from '../fundamentals/centralBank/centralBankProfiles';
import { FUNDAMENTAL_CATEGORIES } from '../types/fundamentals';
import { refreshScheduler, SchedulerStatus } from '../services/refreshScheduler';
import {
  Currency,
  CurrencyState,
  CurrencyPair,
  PairIntelligence,
  EconomicIndicator,
  EconomicObservation,
  CentralBankPolicy,
  EconomicEvent,
  MarketSession,
  DashboardPayload,
  ProviderStatus,
  MarketQuote,
  MarketCoverageReport,
  StrengthThresholds
} from '../types';

export class VelqoarathApiService {
  // Currencies
  public static getCurrencies(): Currency[] {
    return globalStore.getState().currencies;
  }

  public static getCurrencyByCode(code: string): Currency | null {
    const curr = globalStore
      .getState()
      .currencies.find((c) => c.code.toUpperCase() === code.toUpperCase());
    return curr || null;
  }

  public static getCurrencyState(code: string): CurrencyState | null {
    const state = globalStore.getState();
    const currency = state.currencies.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (!currency) return null;

    const cb =
      state.centralBanks.find(
        (b) => b.associatedCurrency.toUpperCase() === currency.code.toUpperCase()
      ) || {
        id: `cb-${currency.code.toLowerCase()}`,
        institution: `Central Bank of ${currency.name}`,
        associatedCurrency: currency.code,
        currentPolicyRate: null,
        previousPolicyRate: null,
        latestDecisionDate: null,
        nextKnownDecisionDate: null,
        stance: 'UNAVAILABLE' as const,
        stanceEvidence: [],
        guidanceSummary: null,
        majorRisks: [],
        sourceMetadata: {
          sourceName: 'Primary Central Bank',
          sourceUrl: '',
          lastUpdated: state.lastUpdated,
          status: state.isDataFeedConnected ? ('CONNECTED' as const) : ('NOT_CONNECTED' as const)
        }
      };

    const marketStrengths =
      state.marketStrengths.size > 0
        ? state.marketStrengths
        : marketDataService.getCachedCurrencyStrengths(state.thresholds);

    const marketStrengthResult = marketStrengths.get(currency.code.toUpperCase()) ?? null;

    return evaluateCurrencyState(
      currency,
      state.observations,
      cb,
      state.thresholds,
      state.isDataFeedConnected,
      marketStrengthResult
    );
  }

  public static getAllCurrencyStates(): CurrencyState[] {
    const currencies = globalStore.getState().currencies;
    return currencies
      .map((c) => this.getCurrencyState(c.code))
      .filter((s): s is CurrencyState => s !== null);
  }

  // Pairs
  public static getPairs(): CurrencyPair[] {
    return globalStore.getState().pairs;
  }

  public static getPairBySymbol(symbol: string): CurrencyPair | null {
    const clean = symbol.replace(/[-_]/g, '/').toUpperCase();
    return globalStore.getState().pairs.find((p) => p.symbol === clean) || null;
  }

  public static getPairIntelligence(symbol: string, date: Date = new Date()): PairIntelligence | null {
    const pair = this.getPairBySymbol(symbol);
    if (!pair) return null;

    const baseState = this.getCurrencyState(pair.baseCurrency);
    const quoteState = this.getCurrencyState(pair.quoteCurrency);
    if (!baseState || !quoteState) return null;

    const state = globalStore.getState();
    return evaluatePairIntelligence(
      pair,
      baseState,
      quoteState,
      state.events,
      date,
      state.isDataFeedConnected
    );
  }

  public static getAllPairIntelligences(date: Date = new Date()): PairIntelligence[] {
    const pairs = globalStore.getState().pairs;
    return pairs
      .map((p) => this.getPairIntelligence(p.symbol, date))
      .filter((pi): pi is PairIntelligence => pi !== null);
  }

  // Macro & Fundamentals
  public static getEconomicIndicators(): EconomicIndicator[] {
    return ECONOMIC_INDICATORS;
  }

  public static getEconomicObservations(): EconomicObservation[] {
    return globalStore.getState().observations;
  }

  public static getCentralBanks(): CentralBankPolicy[] {
    return getAllCoreCentralBankProfiles() as any;
  }

  public static getEconomicEvents(): EconomicEvent[] {
    return globalStore.getState().events;
  }

  public static getFundamentalsStatus() {
    const state = globalStore.getState();
    const providerStatus = fundamentalService.getStatus();
    const macroSources = state.dataSources.filter((s) => s.id !== 'src-twelvedata');
    const connectedMacroCount = macroSources.filter((s) => s.status === 'CONNECTED').length;

    return {
      status: state.isDataFeedConnected ? 'CONNECTED' : 'DISCONNECTED',
      connectedSourcesCount: connectedMacroCount,
      totalSourcesCount: macroSources.length,
      lastUpdated: state.lastUpdated,
      provider: providerStatus,
      categoriesCount: FUNDAMENTAL_CATEGORIES.length,
      categories: FUNDAMENTAL_CATEGORIES,
      coverage: {
        currenciesCount: state.currencies.length,
        centralBanksCount: 8,
        indicatorsCount: ECONOMIC_INDICATORS.length,
        observationsCount: state.observations.length,
        categoriesAvailableCount: providerStatus.categoriesAvailable.length
      },
      sources: macroSources
    };
  }

  public static getFundamentalCurrencies() {
    const state = globalStore.getState();
    return state.currencies.map((currency) => this.getFundamentalCurrency(currency.code)).filter(Boolean);
  }

  public static getFundamentalCurrency(code: string) {
    const currState = this.getCurrencyState(code);
    if (!currState) return null;

    const state = globalStore.getState();
    const observations = state.observations.filter(
      (o) => o.currency.toUpperCase() === code.toUpperCase()
    );

    const expectations = observations.map((obs) => {
      const meta = ECONOMIC_INDICATORS.find((i) => i.name === obs.indicatorName);
      return analyzeObservationExpectations(obs, meta);
    });

    const cbProfile = buildCentralBankProfile(code);
    const fundamentalIntel = evaluateCurrencyFundamentalIntelligence({
      currency: currState.currency,
      observations: observations.map((o) => ({
        id: o.id,
        currency: o.currency.toUpperCase(),
        indicatorId: o.indicatorId,
        indicatorName: o.indicatorName,
        category: (o.category as any) || 'GROWTH',
        value: o.actual,
        unit: o.unit,
        period: o.period,
        previous: o.previous,
        forecast: o.forecast,
        actual: o.actual,
        surprise: o.actual !== null && o.forecast !== null ? Math.round((o.actual - o.forecast) * 100) / 100 : null,
        surpriseType: 'IN_LINE',
        releaseDate: o.releaseDate,
        source: o.sourceName || 'Official Statistics',
        sourceUrl: o.sourceUrl,
        fetchedAt: state.lastUpdated,
        dataStatus: 'AVAILABLE',
        provenance: 'Official verified macroeconomic statistics',
        classification: 'FACT',
        statements: {
          fact: `FACT: ${o.indicatorName} printed at ${o.actual}${o.unit}.`,
          expectation: `EXPECTATION: Consensus was ${o.forecast}${o.unit}.`,
          interpretation: `INTERPRETATION: Release recorded for ${o.period}.`,
          engineAnalysis: 'ENGINE_ANALYSIS: Policy transmission assessed by macroeconomic engine.'
        }
      })),
      centralBank: cbProfile,
      marketStrength: currState.marketStrength,
      upcomingEvents: state.events,
      isDataFeedConnected: state.isDataFeedConnected
    });

    return {
      ...fundamentalIntel,
      // Legacy compatibility properties
      currency: currState.currency,
      fundamentalState: currState.fundamentalState,
      centralBank: currState.centralBank,
      overallState: currState.overallState,
      supportingEvidence: fundamentalIntel.supportingFactors,
      conflictingEvidence: fundamentalIntel.opposingFactors,
      confidenceMetadata: currState.confidenceMetadata,
      observations,
      expectations
    };
  }

  public static getExpectations() {
    const state = globalStore.getState();
    const observations = state.observations;
    return observations.map((obs) => {
      const meta = ECONOMIC_INDICATORS.find((i) => i.name === obs.indicatorName);
      return analyzeObservationExpectations(obs, meta);
    });
  }

  // Sessions
  public static getSessions(): MarketSession[] {
    return MARKET_SESSIONS;
  }

  public static getCurrentSessions(date: Date = new Date()) {
    const overview = getActiveSessionOverview(date);
    return {
      openSessions: overview.openSessions,
      activeOverlaps: overview.activeOverlaps,
      utcTimestamp: date.toISOString()
    };
  }

  public static getUpcomingSessions(date: Date = new Date()) {
    const overview = getActiveSessionOverview(date);
    return {
      closedSessions: overview.closedSessions,
      utcTimestamp: date.toISOString()
    };
  }

  public static getSessionIntelligence(symbol: string, date: Date = new Date()) {
    const pair = this.getPairBySymbol(symbol);
    if (!pair) return null;

    const state = globalStore.getState();
    const relevance = getPairSessionRelevance(pair.symbol);
    const watchWindow = calculateWatchWindow(pair, state.events, date, state.isDataFeedConnected);

    return {
      pairSymbol: pair.symbol,
      relevance,
      watchWindow,
      sessionStatus: getActiveSessionOverview(date)
    };
  }

  // Terminal Dashboard
  public static getDashboard(date: Date = new Date()): DashboardPayload {
    const state = globalStore.getState();
    const allStates = this.getAllCurrencyStates();
    const providerStatus = marketDataService.getStatus();

    const dataStatus = state.isDataFeedConnected ? 'CONNECTED' : 'NOT_CONNECTED';

    const dataStatusMessage = state.isDataFeedConnected
      ? providerStatus.health === 'CONNECTED'
        ? `LIVE DATA FEEDS CONNECTED: ${
            providerStatus.activeProvider || providerStatus.providerName
          } market quotes & official macroeconomic statistics active.`
        : providerStatus.health === 'NOT_CONFIGURED'
        ? 'MACRO FEEDS CONNECTED · MARKET DATA NOT CONFIGURED: Awaiting live market data feed.'
        : `MACRO FEEDS CONNECTED · MARKET DATA: ${providerStatus.message}`
      : 'DATA SOURCE NOT CONNECTED: Running in unaugmented intelligence mode. Connect verified feeds to populate.';

    const strongCurrencies = allStates.filter((s) => s.marketState === 'STRONG');
    const neutralCurrencies = allStates.filter((s) => s.marketState === 'NEUTRAL');
    const weakCurrencies = allStates.filter((s) => s.marketState === 'WEAK');

    const allIntelligences = this.getAllPairIntelligences(date);
    let topPairToWatch: PairIntelligence | null = null;

    if (allIntelligences.length > 0 && state.isDataFeedConnected) {
      const validPairsWithDelta = allIntelligences.filter(
        (p) => p.relativeStrengthDelta !== null && p.orientationDirection !== 'DATA_UNAVAILABLE'
      );
      if (validPairsWithDelta.length > 0) {
        // Prioritize pairs with highest confluence score, breaking ties by magnitude of relativeStrengthDelta
        const sorted = [...validPairsWithDelta].sort((a, b) => {
          const confA = a.confluence?.confluenceScore ?? 0;
          const confB = b.confluence?.confluenceScore ?? 0;
          if (confB !== confA) return confB - confA;
          const deltaA = Math.abs(a.relativeStrengthDelta ?? 0);
          const deltaB = Math.abs(b.relativeStrengthDelta ?? 0);
          return deltaB - deltaA;
        });
        topPairToWatch = sorted[0];
      }
    }

    const sessionOverview = getActiveSessionOverview(date);

    return {
      dataStatus,
      dataStatusMessage,
      lastUpdated: state.lastUpdated,
      currenciesCount: state.currencies.length,
      strongCurrencies,
      neutralCurrencies,
      weakCurrencies,
      allCurrencies: allStates,
      topPairToWatch,
      topPair: topPairToWatch,
      sessions: {
        activeSessions: sessionOverview.openSessions.map((s) => s.session),
        upcomingSessions: sessionOverview.closedSessions.map((s) => s.session),
        activeOverlaps: sessionOverview.activeOverlaps,
        currentTimeUtc: date.toISOString()
      },
      economicCalendar: state.events,
      dataSources: state.dataSources,
      marketProviderStatus: providerStatus
    };
  }

  // Opportunity & Confluence Intelligence
  public static getOpportunities(date: Date = new Date()): PairIntelligence[] {
    const allIntelligences = this.getAllPairIntelligences(date);
    return allIntelligences
      .filter((p) => p.orientationDirection !== 'DATA_UNAVAILABLE')
      .sort((a, b) => {
        const confA = a.confluence?.confluenceScore ?? 0;
        const confB = b.confluence?.confluenceScore ?? 0;
        if (confB !== confA) return confB - confA;
        const deltaA = Math.abs(a.relativeStrengthDelta ?? 0);
        const deltaB = Math.abs(b.relativeStrengthDelta ?? 0);
        return deltaB - deltaA;
      });
  }

  public static getOpportunityBySymbol(symbol: string, date: Date = new Date()): PairIntelligence | null {
    return this.getPairIntelligence(symbol, date);
  }

  // Refresh Scheduler Lifecycle
  public static getSchedulerStatus(): SchedulerStatus {
    return refreshScheduler.getStatus();
  }

  public static async syncFundamentals(force: boolean = false) {
    const success = await refreshScheduler.refreshFundamentals(force);
    return {
      success,
      status: fundamentalService.getStatus()
    };
  }

  // Feed Controls
  public static toggleDataFeed(connected?: boolean) {
    globalStore.toggleDataFeed(connected);
    return {
      success: true,
      isDataFeedConnected: globalStore.getState().isDataFeedConnected
    };
  }

  public static updateThresholds(strong: number, weak: number) {
    globalStore.updateThresholds(strong, weak);
    return {
      success: true,
      thresholds: globalStore.getState().thresholds
    };
  }

  // Live Market Data Integration
  public static getMarketDataStatus(): ProviderStatus {
    return marketDataService.getStatus();
  }

  public static async getMarketQuotes(forceRefresh: boolean = false): Promise<MarketQuote[]> {
    return marketDataService.getQuotes(forceRefresh);
  }

  public static async getMarketStrengths(forceRefresh: boolean = false) {
    const state = globalStore.getState();
    const map = await marketDataService.getCurrencyStrengths(state.thresholds, forceRefresh);
    return Array.from(map.values());
  }

  public static getMarketCoverage(): MarketCoverageReport {
    return marketDataService.getCoverage();
  }

  public static async syncMarketData(forceRefresh: boolean = false) {
    const success = await refreshScheduler.refreshMarketSnapshot(forceRefresh);
    const status = marketDataService.getStatus();
    const quotes = await marketDataService.getQuotes(false);

    return {
      success,
      status,
      quotesCount: quotes.length
    };
  }
}
