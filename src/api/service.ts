import { globalStore } from '../data/store';
import { evaluateCurrencyState } from '../engines/currency/currencyEngine';
import { evaluatePairIntelligence } from '../engines/pair/pairEngine';
import { getPairSessionRelevance, calculateWatchWindow } from '../engines/session/sessionEngine';
import { getActiveSessionOverview, MARKET_SESSIONS } from '../data/sessions';
import { ECONOMIC_INDICATORS } from '../data/indicators';
import { marketDataService } from '../marketData/service/marketDataService';
import { analyzeObservationExpectations } from '../engines/expectations/expectationsEngine';
import { fundamentalService } from '../fundamentals/service/fundamentalService';
import { aggregateCurrencyIntelligence } from '../fundamentals/engine/currencyIntelligenceEngine';
import { buildCentralBankProfile, getAllCoreCentralBankProfiles } from '../fundamentals/centralBank/centralBankProfiles';
import { FUNDAMENTAL_CATEGORIES } from '../types/fundamentals';
import { refreshScheduler, SchedulerStatus } from '../services/refreshScheduler';
import { evaluateCatalystIntelligence } from '../engines/catalyst/catalystEngine';
import { evaluateAllOpportunities } from '../engines/opportunity/opportunityEngine';
import { buildMarketFocus } from '../engines/focus/marketFocus';
import type { MarketFocus } from '../types/focus';
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
  CurrencyFundamentalIntelligence,
  CurrencyMarketStrength,
  ProviderStatus,
  MarketQuote,
  MarketCoverageReport,
  StrengthThresholds
} from '../types';

function projectCentralBankPolicy(
  legacy: CentralBankPolicy,
  intelligence: CurrencyFundamentalIntelligence
): CentralBankPolicy {
  const policy = intelligence.evidenceAssessment?.policy;
  const profile = intelligence.centralBankProfile;
  if (!policy) {
    return {
      ...legacy,
      currentPolicyRate: null,
      policyRate: null,
      stance: 'UNAVAILABLE',
      sourceType: 'UNAVAILABLE',
      dataSourceMode: 'UNAVAILABLE',
      freshness: 'UNAVAILABLE',
      fetchedTimestamp: null,
      contextualPolicyRate: legacy.currentPolicyRate,
      contextualStance: legacy.stance,
      contextualDecisionDate: legacy.latestDecisionDate,
      policyAvailability: 'UNAVAILABLE',
      policyProvenance: 'UNAVAILABLE',
      policyFreshness: 'UNAVAILABLE',
      sourceMetadata: {
        ...legacy.sourceMetadata,
        lastUpdated: null,
        status: 'NOT_CONNECTED'
      }
    };
  }

  const currentPolicyIsVerified =
    policy.availability === 'AVAILABLE' &&
    policy.provenance === 'LIVE' &&
    policy.currentPolicyRate !== null &&
    Number.isFinite(policy.currentPolicyRate);
  const sourceType = policy.provenance === 'LIVE' ||
    policy.provenance === 'REFERENCE' ||
    policy.provenance === 'STATIC'
    ? policy.provenance
    : 'UNAVAILABLE';

  return {
    ...legacy,
    currentPolicyRate: currentPolicyIsVerified ? policy.currentPolicyRate : null,
    policyRate: currentPolicyIsVerified ? policy.currentPolicyRate : null,
    previousPolicyRate: currentPolicyIsVerified ? legacy.previousPolicyRate : null,
    latestDecisionDate: currentPolicyIsVerified ? policy.effectiveAt : null,
    stance: currentPolicyIsVerified ? policy.currentStance : 'UNAVAILABLE',
    stanceEvidence: currentPolicyIsVerified ? legacy.stanceEvidence : [],
    guidanceSummary: currentPolicyIsVerified ? legacy.guidanceSummary : null,
    source: policy.source ?? profile.source,
    sourceUrl: profile.sourceUrl || legacy.sourceMetadata.sourceUrl,
    sourceType,
    dataSourceMode: sourceType,
    freshness: policy.freshness,
    fetchedTimestamp: currentPolicyIsVerified ? policy.fetchedAt : null,
    dataStatus: currentPolicyIsVerified ? 'AVAILABLE' : 'UNAVAILABLE',
    provenance: profile.provenance,
    contextualPolicyRate: policy.contextualPolicyRate,
    contextualStance: policy.contextualStance,
    contextualDecisionDate: currentPolicyIsVerified ? null : policy.effectiveAt,
    policyAvailability: policy.availability,
    policyProvenance: policy.provenance,
    policyFreshness: policy.freshness,
    sourceMetadata: {
      ...legacy.sourceMetadata,
      sourceName: policy.source ?? profile.source,
      sourceUrl: profile.sourceUrl || legacy.sourceMetadata.sourceUrl,
      lastUpdated: currentPolicyIsVerified ? policy.fetchedAt : null,
      status: currentPolicyIsVerified ? 'CONNECTED' : 'NOT_CONNECTED'
    }
  };
}

function projectFundamentalState(
  state: CurrencyState['fundamentalState'],
  intelligence: CurrencyFundamentalIntelligence
): CurrencyState['fundamentalState'] {
  const evidence = intelligence.evidenceAssessment;
  if (!evidence) return state;
  const projected = {
    ...state,
    fundamentalScore: intelligence.fundamentalScore,
    overallCondition: intelligence.overallCondition
  };
  if ('scoreFormula' in projected && intelligence.fundamentalScore === null) {
    projected.scoreFormula = evidence.fundamentals.reason ||
      'Unavailable: required source evidence is incomplete.';
  }
  if (!('monetaryPolicy' in projected)) return projected;

  const policyIsCurrent = evidence.policy.availability === 'AVAILABLE';
  const policyContext = evidence.policy.contextualPolicyRate !== null
    ? `${evidence.policy.contextualStance} contextual policy rate ${evidence.policy.contextualPolicyRate}%.`
    : 'Current policy evidence is unavailable.';
  return {
    ...projected,
    monetaryPolicy: {
      ...projected.monetaryPolicy,
      currentCondition: policyIsCurrent
        ? `${evidence.policy.currentStance} live policy rate ${evidence.policy.currentPolicyRate}%.`
        : policyContext,
      recentChange: policyIsCurrent
        ? projected.monetaryPolicy.recentChange
        : 'No verified current policy-rate change is available.',
      expectation: policyIsCurrent
        ? projected.monetaryPolicy.expectation
        : 'Current policy guidance is unavailable.',
      surprise: policyIsCurrent ? projected.monetaryPolicy.surprise : 'UNAVAILABLE',
      implication: evidence.policy.reason || projected.monetaryPolicy.implication,
      dataAvailable: policyIsCurrent,
      observations: []
    }
  };
}

function hasCurrentOverallEvidence(intelligence: CurrencyFundamentalIntelligence): boolean {
  const evidence = intelligence.evidenceAssessment;
  return Boolean(
    evidence &&
    evidence.market.strength !== null &&
    (evidence.market.freshness === 'FRESH' || evidence.market.freshness === 'AGING') &&
    evidence.fundamentals.availability === 'AVAILABLE' &&
    intelligence.fundamentalScore !== null &&
    (evidence.fundamentals.freshness === 'FRESH' || evidence.fundamentals.freshness === 'AGING')
  );
}

function hasCurrentMarketEvidence(
  strength: CurrencyMarketStrength | null,
  quotes: MarketQuote[],
  status: ProviderStatus
): boolean {
  const provider = status.activeProvider || status.providerName;
  const normalizedStalePairs = new Set(
    status.stalePairs.map((symbol) => symbol.replace(/[-_]/g, '/').toUpperCase())
  );
  const quoteLevelFreshness = Boolean(
    strength &&
    strength.contributors.length > 0 &&
    strength.contributors.every((contribution) => {
      const symbol = contribution.pairSymbol.replace(/[-_]/g, '/').toUpperCase();
      const quote = quotes.find(
        (candidate) => candidate.symbol.replace(/[-_]/g, '/').toUpperCase() === symbol
      );
      return Boolean(
        quote &&
        quote.source.toUpperCase() === provider.toUpperCase() &&
        quote.stale === false &&
        (quote.sourceStatus === 'CONNECTED' || quote.sourceStatus === 'DEGRADED') &&
        (typeof quote.providerTimestamp === 'string' && Number.isFinite(Date.parse(quote.providerTimestamp)) ||
          typeof quote.timestamp === 'number' && Number.isFinite(quote.timestamp)) &&
        !normalizedStalePairs.has(symbol)
      );
    })
  );
  const hasCurrentProviderFreshness =
    status.snapshotHealth === 'FRESH' ||
    status.snapshotHealth === 'AGING' ||
    (status.snapshotHealth === undefined && quoteLevelFreshness);
  if (
    !strength ||
    !Number.isFinite(strength.marketStrength) ||
    !provider ||
    !hasCurrentProviderFreshness ||
    status.health === 'DISCONNECTED' ||
    status.health === 'ERROR' ||
    strength.source.toUpperCase() !== provider.toUpperCase() ||
    strength.contributors.length === 0
  ) {
    return false;
  }
  const stalePairs = normalizedStalePairs;
  return strength.contributors.every((contribution) => {
    const symbol = contribution.pairSymbol.replace(/[-_]/g, '/').toUpperCase();
    const quote = quotes.find((candidate) =>
      candidate.symbol.replace(/[-_]/g, '/').toUpperCase() === symbol
    );
    const quoteSourceMatches = !quote || quote.source.toUpperCase() === provider.toUpperCase();
    const hasSourceTimestamp = quote
      ? (typeof quote.providerTimestamp === 'string' && Number.isFinite(Date.parse(quote.providerTimestamp))) ||
        (typeof quote.timestamp === 'number' && Number.isFinite(quote.timestamp))
      : typeof contribution.timestamp === 'number' && Number.isFinite(contribution.timestamp);
    return (
      Number.isFinite(contribution.pairReturnPercent) &&
      Number.isFinite(contribution.signedContribution) &&
      quoteSourceMatches &&
      hasSourceTimestamp &&
      !stalePairs.has(symbol) &&
      quote?.stale !== true &&
      quote?.sourceStatus !== 'STALE'
    );
  });
}

function getCurrencyMarketProviderStatus(state: ReturnType<typeof globalStore.getState>): ProviderStatus {
  const hasCoherentStoredSnapshot =
    state.marketQuotes.length > 0 &&
    state.marketProviderStatus.quotesCount === state.marketQuotes.length;
  return hasCoherentStoredSnapshot ? state.marketProviderStatus : marketDataService.getStatus();
}

function projectStoredCentralBank(legacy: CentralBankPolicy): CentralBankPolicy {
  const profile = buildCentralBankProfile(legacy.associatedCurrency);
  const sourceType = legacy.sourceType === 'REFERENCE' || legacy.sourceType === 'STATIC'
    ? legacy.sourceType
    : profile.sourceType ?? 'UNAVAILABLE';
  const contextualPolicyRate =
    sourceType === 'REFERENCE' || sourceType === 'STATIC'
      ? profile.policyRate
      : null;
  const contextualStance =
    sourceType === 'REFERENCE' || sourceType === 'STATIC'
      ? profile.stance
      : null;
  const contextualFetchedAt =
    typeof profile.fetchedTimestamp === 'string' &&
    Number.isFinite(Date.parse(profile.fetchedTimestamp))
      ? profile.fetchedTimestamp
      : null;
  const liveFetchedAt = legacy.fetchedTimestamp ?? legacy.sourceMetadata.lastUpdated;
  const isVerifiedLive =
    legacy.sourceType === 'LIVE' &&
    legacy.dataSourceMode === 'LIVE' &&
    (legacy.dataStatus === 'AVAILABLE' || legacy.dataStatus === 'LIVE') &&
    legacy.sourceMetadata.status === 'CONNECTED' &&
    legacy.currentPolicyRate !== null &&
    Number.isFinite(legacy.currentPolicyRate) &&
    (legacy.freshness === 'FRESH' || legacy.freshness === 'AGING') &&
    Boolean(legacy.source || legacy.sourceMetadata.sourceName) &&
    /^https?:\/\//i.test(legacy.sourceUrl || legacy.sourceMetadata.sourceUrl) &&
    typeof liveFetchedAt === 'string' &&
    Number.isFinite(Date.parse(liveFetchedAt)) &&
    typeof legacy.latestDecisionDate === 'string' &&
    Number.isFinite(Date.parse(legacy.latestDecisionDate));

  return {
    ...legacy,
    currentPolicyRate: isVerifiedLive ? legacy.currentPolicyRate : null,
    policyRate: isVerifiedLive ? legacy.currentPolicyRate : null,
    previousPolicyRate: isVerifiedLive ? legacy.previousPolicyRate : null,
    latestDecisionDate: isVerifiedLive ? legacy.latestDecisionDate : null,
    stance: isVerifiedLive ? legacy.stance : 'UNAVAILABLE',
    stanceEvidence: isVerifiedLive ? legacy.stanceEvidence : [],
    guidanceSummary: isVerifiedLive ? legacy.guidanceSummary : null,
    source: isVerifiedLive ? legacy.source || legacy.sourceMetadata.sourceName : profile.source,
    sourceUrl: isVerifiedLive ? legacy.sourceUrl || legacy.sourceMetadata.sourceUrl : profile.sourceUrl,
    sourceType: isVerifiedLive ? 'LIVE' : sourceType,
    dataSourceMode: isVerifiedLive ? 'LIVE' : sourceType,
    freshness: isVerifiedLive ? legacy.freshness : profile.freshness,
    fetchedTimestamp: isVerifiedLive ? liveFetchedAt : null,
    dataStatus: isVerifiedLive ? legacy.dataStatus : 'UNAVAILABLE',
    provenance: isVerifiedLive ? legacy.provenance : profile.provenance,
    contextualPolicyRate,
    contextualStance,
    contextualDecisionDate: contextualPolicyRate !== null ? profile.latestDecisionDate : null,
    contextualFetchedAt,
    policyAvailability: isVerifiedLive ? 'AVAILABLE' : contextualPolicyRate !== null ? 'REFERENCE_ONLY' : 'UNAVAILABLE',
    policyProvenance: isVerifiedLive ? 'LIVE' : sourceType,
    policyFreshness: isVerifiedLive
      ? legacy.freshness === 'FRESH' || legacy.freshness === 'AGING'
        ? legacy.freshness
        : 'UNAVAILABLE'
      : profile.freshness,
    sourceMetadata: {
      ...legacy.sourceMetadata,
      sourceName: isVerifiedLive ? legacy.source || legacy.sourceMetadata.sourceName : profile.source,
      sourceUrl: isVerifiedLive ? legacy.sourceUrl || legacy.sourceMetadata.sourceUrl : profile.sourceUrl,
      lastUpdated: isVerifiedLive ? liveFetchedAt : null,
      status: isVerifiedLive ? 'CONNECTED' : 'NOT_CONNECTED'
    }
  };
}

function projectStoredPolicyPillar(
  state: CurrencyState['fundamentalState'],
  centralBank: CentralBankPolicy
): CurrencyState['fundamentalState'] {
  if (!('monetaryPolicy' in state)) return state;
  const policyIsCurrent = centralBank.policyAvailability === 'AVAILABLE';
  const context = centralBank.contextualPolicyRate !== null && centralBank.contextualPolicyRate !== undefined
    ? `${centralBank.contextualStance} contextual policy rate ${centralBank.contextualPolicyRate}%.`
    : 'Current policy evidence is unavailable.';
  return {
    ...state,
    monetaryPolicy: {
      ...state.monetaryPolicy,
      currentCondition: policyIsCurrent
        ? `${centralBank.stance} live policy rate ${centralBank.currentPolicyRate}%.`
        : context,
      recentChange: policyIsCurrent ? state.monetaryPolicy.recentChange : 'No verified current policy-rate change is available.',
      expectation: policyIsCurrent ? state.monetaryPolicy.expectation : 'Current policy guidance is unavailable.',
      surprise: policyIsCurrent ? state.monetaryPolicy.surprise : 'UNAVAILABLE',
      implication: policyIsCurrent ? state.monetaryPolicy.implication : 'Reference policy is context only, not current live evidence.',
      dataAvailable: policyIsCurrent,
      observations: []
    }
  };
}

export class VelquarathApiService {
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

    const storedCentralBank =
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
    const cb = projectStoredCentralBank(storedCentralBank);

    const marketStrengths =
      state.marketStrengths.size > 0
        ? state.marketStrengths
        : marketDataService.getCachedCurrencyStrengths(state.thresholds);

    const marketStrengthResult = marketStrengths.get(currency.code.toUpperCase()) ?? null;
    const marketStatus = getCurrencyMarketProviderStatus(state);

    const currencyState = evaluateCurrencyState(
      currency,
      state.observations,
      cb,
      state.thresholds,
      state.isDataFeedConnected,
      marketStrengthResult
    );
    return {
      ...currencyState,
      centralBank: cb,
      fundamentalState: projectStoredPolicyPillar(currencyState.fundamentalState, cb),
      overallState: hasCurrentMarketEvidence(marketStrengthResult, state.marketQuotes, marketStatus)
        ? currencyState.marketState
        : 'DATA_UNAVAILABLE'
    };
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
      state.isDataFeedConnected,
      state.observations
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
    const schedulerStatus = refreshScheduler.getStatus();
    const macroSources = state.dataSources.filter((s) => s.id !== 'src-twelvedata');
    const connectedMacroCount = macroSources.filter((s) => s.status === 'CONNECTED').length;

    return {
      status: state.isDataFeedConnected ? 'CONNECTED' : 'DISCONNECTED',
      datasetMode: state.fundamentalDatasetMode || providerStatus.datasetMode || 'LIVE',
      providerStatus: providerStatus.health,
      lifecycleState: providerStatus.lifecycleState || providerStatus.health,
      health: providerStatus.health,
      isConfigured: providerStatus.isConfigured,
      lastSuccessfulFetch: providerStatus.lastSuccessfulUpdate || null,
      lastAttemptedFetch: providerStatus.lastAttemptAt || null,
      datasetFetchedAt: providerStatus.lastFetchedAt || null,
      oldestObservationTimestamp: providerStatus.oldestObservationTimestamp || null,
      nextScheduledRefresh: providerStatus.nextRefreshAt || schedulerStatus.fundamentals.nextRefresh || null,
      /*
       * Never report FRESH by default. An absent provider freshness value is
       * an unknown state, and claiming FRESH would fabricate liveness.
       */
      datasetFreshness: providerStatus.freshness || 'UNAVAILABLE',
      isStale: providerStatus.isStale || false,
      observationsCount: state.observations.length,
      eventsCount: state.events.length,
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
        eventsCount: state.events.length,
        categoriesAvailableCount: providerStatus.categoriesAvailable.length
      },
      sources: macroSources
    };
  }

  public static async setFundamentalMode(mode: 'LIVE' | 'BENCHMARK') {
    if (mode === 'BENCHMARK') {
      await fundamentalService.useBenchmarkProvider();
    } else {
      await fundamentalService.useLiveProvider();
    }
    return this.getFundamentalsStatus();
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
    const fundamentalIntel = this.getCurrencyIntelligence(code);
    if (!fundamentalIntel) return null;
    const fundamentalState = projectFundamentalState(currState.fundamentalState, fundamentalIntel);

    return {
      ...fundamentalIntel,
      // Legacy compatibility properties
      currency: currState.currency,
      fundamentalState,
      centralBank: projectCentralBankPolicy(currState.centralBank, fundamentalIntel),
      overallState: hasCurrentOverallEvidence(fundamentalIntel)
        ? currState.overallState
        : 'DATA_UNAVAILABLE',
      supportingEvidence: fundamentalIntel.supportingFactors,
      conflictingEvidence: fundamentalIntel.opposingFactors,
      confidenceMetadata: currState.confidenceMetadata,
      observations,
      expectations
    };
  }

  public static getCurrencyIntelligence(
    code: string,
    date: Date = new Date()
  ): CurrencyFundamentalIntelligence | null {
    return this.getCurrencyIntelligences(date).find(
      (intelligence) => intelligence.currency.code.toUpperCase() === code.toUpperCase()
    ) ?? null;
  }

  public static getCurrencyIntelligences(
    date: Date = new Date()
  ): CurrencyFundamentalIntelligence[] {
    const state = globalStore.getState();
    const strengths = state.marketStrengths.size > 0
      ? state.marketStrengths
      : marketDataService.getCachedCurrencyStrengths(state.thresholds);
    const marketProviderStatus = getCurrencyMarketProviderStatus(state);
    const pairIntelligences = this.getAllPairIntelligences(date);

    return state.currencies.map((currency) =>
      aggregateCurrencyIntelligence({
        currency,
        observations: state.observations,
        marketStrength: strengths.get(currency.code.toUpperCase()) ?? null,
        marketQuotes: state.marketQuotes,
        marketProviderStatus,
        fundamentalProviderStatus: state.fundamentalProviderStatus,
        datasetMode: state.fundamentalDatasetMode,
        centralBankProfile: buildCentralBankProfile(currency.code),
        pairIntelligences,
        upcomingEvents: state.events,
        calculatedAt: date
      })
    );
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
    const dashboard = globalStore.getDashboard(date);
    const currencyIntelligence = this.getCurrencyIntelligences(date);
    const intelligenceByCurrency = new Map(
      currencyIntelligence.map((intelligence) => [
        intelligence.currency.code.toUpperCase(),
        intelligence
      ])
    );
    const allCurrencies = dashboard.allCurrencies.map((state) => {
      const intelligence = intelligenceByCurrency.get(state.currency.code.toUpperCase());
      const evidence = intelligence?.evidenceAssessment;
      if (!evidence || !intelligence) return state;

      const hasCurrentMarketStrength =
        evidence.market.strength !== null && evidence.market.freshness !== 'STALE';
      const marketStrength = hasCurrentMarketStrength ? evidence.market.strength : null;
      const marketState = hasCurrentMarketStrength
        ? evidence.market.classification
        : 'DATA_UNAVAILABLE';
      const fundamentalState = projectFundamentalState(state.fundamentalState, intelligence);
      const hasCurrentFundamentals =
        evidence.fundamentals.score !== null &&
        (evidence.fundamentals.freshness === 'FRESH' || evidence.fundamentals.freshness === 'AGING');

      return {
        ...state,
        marketStrength,
        marketState,
        classification: marketState,
        marketDataFreshness: evidence.market.freshness,
        marketDataSource: evidence.market.source ?? undefined,
        relativeStrengthBreakdown: {
          ...state.relativeStrengthBreakdown,
          marketStrength,
          classification: marketState,
          marketDataFreshness: evidence.market.freshness,
          marketDataSource: evidence.market.source ?? undefined,
          explanation: evidence.market.reason || state.relativeStrengthBreakdown.explanation,
          contributors: evidence.market.contributingPairs.map((contribution) => ({
            pairSymbol: contribution.pairSymbol,
            pairReturnPercent: contribution.pairReturnPercent,
            role: contribution.role,
            signedContribution: contribution.signedContribution
          }))
        },
        centralBank: projectCentralBankPolicy(state.centralBank, intelligence),
        fundamentalState,
        overallState: hasCurrentMarketStrength && hasCurrentFundamentals
          ? state.overallState
          : 'DATA_UNAVAILABLE'
      };
    });
    const currentMarketByCurrency = new Map(
      allCurrencies.map((state) => [state.currency.code.toUpperCase(), state.marketStrength !== null])
    );
    const currentTopPair = dashboard.topPairToWatch;
    const topPairToWatch = currentTopPair &&
      currentMarketByCurrency.get(currentTopPair.baseCurrency.code.toUpperCase()) &&
      currentMarketByCurrency.get(currentTopPair.quoteCurrency.code.toUpperCase())
      ? currentTopPair
      : null;

    return {
      ...dashboard,
      allCurrencies,
      strongCurrencies: allCurrencies.filter((state) => state.marketState === 'STRONG'),
      neutralCurrencies: allCurrencies.filter((state) => state.marketState === 'NEUTRAL'),
      weakCurrencies: allCurrencies.filter((state) => state.marketState === 'WEAK'),
      topPairToWatch,
      topPair: topPairToWatch,
      currencyIntelligence
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

  public static getStructuredOpportunities(date: Date = new Date()) {
    const allIntelligences = this.getAllPairIntelligences(date);
    return evaluateAllOpportunities(allIntelligences);
  }

  /**
   * Market Focus is a derived presentation layer over the existing pair
   * intelligence. It is served from the same intelligence the UI consumes so
   * that the conclusion and the underlying evidence can never diverge.
   */
  public static getMarketFocus(date: Date = new Date()): MarketFocus {
    const allIntelligences = this.getAllPairIntelligences(date);
    const sessionOverview = getActiveSessionOverview(date);
    return buildMarketFocus(allIntelligences, {
      now: date,
      activeOverlaps: sessionOverview.activeOverlaps
    });
  }

  public static getCatalystIntelligence(currency?: string, date: Date = new Date()) {
    const state = globalStore.getState();
    return evaluateCatalystIntelligence(state.events, currency, date);
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
