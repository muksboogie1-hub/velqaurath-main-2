import assert from 'node:assert/strict';
import { aggregateCurrencyIntelligence } from '../src/fundamentals/engine/currencyIntelligenceEngine';
import { buildCentralBankProfile } from '../src/fundamentals/centralBank/centralBankProfiles';
import { INITIAL_CURRENCIES } from '../src/data/currencies';
import { INITIAL_PAIRS } from '../src/data/pairs';
import { CANONICAL_15_PAIRS } from '../src/marketData/config';
import { VelquarathApiService } from '../src/api/service';
import {
  CurrencyMarketStrength,
  EconomicObservation,
  MarketQuote,
  PairIntelligence,
  ProviderStatus
} from '../src/types';
import { FundamentalProviderStatus } from '../src/fundamentals/providers/IFundamentalDataProvider';
import { ContradictionCategory, StructuredContradiction } from '../src/types/intelligence';

const calculatedAt = new Date('2026-09-26T12:00:00.000Z');
const sourceFetchedAt = '2026-09-26T11:55:00.000Z';
let passed = 0;

function check(name: string, run: () => void): void {
  run();
  passed++;
  console.log(`PASS: ${name}`);
}

function currency(code: string) {
  const result = INITIAL_CURRENCIES.find((item) => item.code === code);
  assert(result, `Expected canonical currency ${code}`);
  return result;
}

function makeObservation(
  code: string,
  category: string | undefined,
  actual: number | null,
  forecast: number | null,
  freshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE' = 'FRESH',
  sourceStatus: 'CONNECTED' | 'NOT_CONNECTED' = 'CONNECTED',
  metadataOverrides: Record<string, unknown> = {}
): EconomicObservation {
  return {
    id: `${code}-${category || 'unknown'}-${actual ?? 'no-actual'}-${forecast ?? 'no-forecast'}`,
    currency: code,
    indicatorId: category || 'unknown-indicator',
    indicatorName: `${category || 'Unclassified'} observation`,
    period: '2026-08',
    releaseDate: sourceFetchedAt,
    actual,
    forecast,
    previous: null,
    unit: '%',
    classification: 'FACT',
    sourceName: 'Official Statistics',
    sourceUrl: 'https://example.test/statistics',
    sourceStatus,
    category,
    fetchedAt: sourceFetchedAt,
    publishedAt: sourceFetchedAt,
    freshness,
    dataStatus: 'AVAILABLE',
    provenance: 'Finance Calendar Live API (https://example.test/statistics)',
    ...metadataOverrides
  } as EconomicObservation;
}

function completeObservations(code: string): EconomicObservation[] {
  return [
    makeObservation(code, 'INFLATION', 2, 1),
    makeObservation(code, 'EMPLOYMENT', 1, 0),
    makeObservation(code, 'GROWTH', 1, 0)
  ];
}

function makeMarketStatus(overrides: Partial<ProviderStatus> = {}): ProviderStatus {
  return {
    providerName: 'Biquote',
    activeProvider: 'Biquote',
    health: 'CONNECTED',
    connectionStatus: 'CONNECTED',
    snapshotHealth: 'FRESH',
    runtimeFeedState: 'CONNECTED',
    streamState: 'CONNECTED',
    message: 'Feed connected',
    lastFetchedAt: sourceFetchedAt,
    lastSuccessfulUpdate: sourceFetchedAt,
    lastSuccessfulSnapshotAt: sourceFetchedAt,
    quotesCount: 1,
    requiredPairsCount: 1,
    availablePairsCount: 1,
    missingPairs: [],
    stalePairs: [],
    oldestQuoteAge: 1,
    cacheExpiresAt: null,
    isConfigured: true,
    source: 'Biquote',
    ...overrides
  };
}

function makeFundamentalStatus(overrides: Partial<FundamentalProviderStatus> = {}): FundamentalProviderStatus {
  return {
    providerName: 'Finance Calendar Provider',
    isConfigured: true,
    health: 'CONNECTED',
    categoriesAvailable: ['INFLATION', 'EMPLOYMENT', 'GROWTH'],
    currenciesAvailable: ['USD', 'EUR'],
    lastFetchedAt: sourceFetchedAt,
    lastSuccessfulUpdate: sourceFetchedAt,
    lastAttemptAt: sourceFetchedAt,
    message: 'Connected',
    lifecycleState: 'CONNECTED',
    datasetMode: 'LIVE',
    freshness: 'FRESH',
    isStale: false,
    count: 3,
    ...overrides
  };
}

function makeMarketStrength(
  code: string,
  symbol = 'EUR/USD',
  contributorTimestamp: number | null = Date.parse(sourceFetchedAt)
): CurrencyMarketStrength {
  return {
    currency: code,
    marketStrength: 0.2,
    classification: 'STRONG',
    dailyMovementPercent: 0.3,
    basketRelativeMovementPercent: 0.2,
    rawRelativeReturn: 0.2,
    avgReturn: 0.3,
    momentum: 0.1,
    coverage: {
      available: 1,
      required: 1,
      percent: 100,
      validPairs: [symbol],
      status: 'COMPLETE'
    },
    contributors: [
      {
        pairSymbol: symbol,
        pairReturnPercent: 0.3,
        role: code === 'USD' ? 'QUOTE' : 'BASE',
        signedContribution: 0.2,
        timestamp: contributorTimestamp
      }
    ],
    explanation: 'Basket-relative movement derived from one contributing pair.',
    calculatedAt: calculatedAt.toISOString(),
    providerStatus: 'CONNECTED',
    source: 'Biquote'
  };
}

function makeMarketQuote(overrides: Partial<MarketQuote> = {}): MarketQuote {
  const timestamp = Date.parse(sourceFetchedAt);
  return {
    symbol: 'EUR/USD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    price: 1.1,
    open: 1.09,
    high: 1.11,
    low: 1.08,
    close: 1.1,
    change: 0.01,
    changePercent: 0.3,
    timestamp,
    interval: '1d',
    source: 'Biquote',
    sourceStatus: 'CONNECTED',
    fetchedAt: sourceFetchedAt,
    providerTimestamp: sourceFetchedAt,
    receivedAt: sourceFetchedAt,
    stale: false,
    ...overrides
  };
}

function livePolicy(code = 'USD') {
  return buildCentralBankProfile(code, {
    sourceType: 'LIVE',
    dataSourceMode: 'LIVE',
    freshness: 'FRESH',
    dataStatus: 'LIVE',
    policyRate: 5,
    currentPolicyRate: 5,
    stance: 'HAWKISH',
    fetchedTimestamp: sourceFetchedAt
  });
}

function aggregate(overrides: Partial<Parameters<typeof aggregateCurrencyIntelligence>[0]> = {}) {
  return aggregateCurrencyIntelligence({
    currency: currency('USD'),
    observations: completeObservations('USD'),
    marketStrength: makeMarketStrength('USD'),
    marketQuotes: [makeMarketQuote()],
    marketProviderStatus: makeMarketStatus(),
    fundamentalProviderStatus: makeFundamentalStatus(),
    datasetMode: 'LIVE',
    centralBankProfile: livePolicy(),
    pairIntelligences: [],
    calculatedAt,
    ...overrides
  });
}

const marketFundamentalContradiction: StructuredContradiction = {
  id: 'contra-eurusd-market-fundamental',
  pair: 'EUR/USD',
  currency: 'USD',
  category: 'MARKET_VS_FUNDAMENTAL',
  contradictionType: 'MARKET_VS_FUNDAMENTAL',
  sourceA: 'Market strength',
  sourceB: 'Verified fundamentals',
  statementA: 'Market favors USD',
  statementB: 'Fundamentals favor EUR',
  conflictDescription: 'Valid market and fundamental evidence conflict.',
  description: 'Valid market and fundamental evidence conflict.',
  directionA: 'BULLISH_BASE',
  directionB: 'BEARISH_BASE',
  severity: 'HIGH',
  directionalImpact: 'Conflicting evidence.',
  penaltyPoints: 15,
  affectedComponents: ['MARKET_STRENGTH', 'FUNDAMENTALS'],
  status: 'UNRESOLVED',
  detectedTimestamp: calculatedAt.toISOString(),
  sourceTimestamps: {
    sourceA: calculatedAt.toISOString(),
    sourceB: calculatedAt.toISOString()
  },
  provenance: 'Existing pair contradiction engine'
};

function pairIntelligence(
  contradictions: StructuredContradiction[],
  overrides: Partial<PairIntelligence> = {}
): PairIntelligence {
  return {
    symbol: 'EUR/USD',
    baseCurrency: currency('EUR'),
    quoteCurrency: currency('USD'),
    baseMarketStrength: 0.2,
    quoteMarketStrength: -0.1,
    contradictions,
    structuredContradictions: contradictions,
    ...overrides
  } as PairIntelligence;
}

function contradictionForCategory(category: ContradictionCategory): StructuredContradiction {
  return {
    ...marketFundamentalContradiction,
    id: `contra-${category.toLowerCase()}`,
    category,
    contradictionType: category,
    affectedComponents: category === 'OTHER' ? ['FUNDAMENTALS'] : [category]
  };
}

check('Complete evidence produces bounded intelligence with an explanation', () => {
  const result = aggregate();
  assert.equal(result.evidenceAssessment?.market.availability, 'AVAILABLE');
  assert.equal(result.evidenceAssessment?.fundamentals.availability, 'AVAILABLE');
  assert.equal(result.evidenceAssessment?.policy.currentPolicyRate, 5);
  assert.equal(result.fundamentalScore, 0.2);
  assert(result.fundamentalScore! >= -0.2 && result.fundamentalScore! <= 0.2);
  assert(result.evidenceAssessment?.explanation.summary.includes('USD'));
  assert(result.evidenceAssessment?.explanation.contributingEvidence.length > 0);
});

check('Missing market evidence stays unavailable and relative strength stays null', () => {
  const result = aggregate({ marketStrength: null, marketQuotes: [] });
  assert.equal(result.evidenceAssessment?.market.availability, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.market.strength, null);
  assert.equal(result.evidenceAssessment?.relativeStrength.value, null);
  assert(result.evidenceAssessment?.market.reason);
});

check('A source label without bound provenance and timestamps cannot create LIVE fundamentals', () => {
  const result = aggregate({
    observations: [makeObservation('USD', 'INFLATION', 2, 1, 'FRESH', 'CONNECTED', {
      sourceUrl: '',
      provenance: '',
      fetchedAt: null,
      publishedAt: null
    })]
  });
  assert.equal(result.evidenceAssessment?.fundamentals.provenance, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.fundamentals.evidenceCount, 0);
  assert.equal(result.evidenceAssessment?.fundamentals.observations.length, 0);
});

check('Connected provider status alone cannot create LIVE observations', () => {
  const result = aggregate({ observations: [] });
  assert.equal(result.evidenceAssessment?.fundamentals.provenance, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.fundamentals.evidenceCount, 0);
});

check('LIVE dataset mode alone cannot create LIVE observations', () => {
  const result = aggregate({ observations: [], datasetMode: 'LIVE' });
  assert.equal(result.evidenceAssessment?.fundamentals.provenance, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.fundamentals.evidenceCount, 0);
});

check('Timestamped derived pair contributors remain usable when raw quotes are not cached', () => {
  const result = aggregate({ marketQuotes: [] });
  assert.equal(result.evidenceAssessment?.market.provenance, 'LIVE');
  assert.equal(result.evidenceAssessment?.market.availability, 'AVAILABLE');
  assert.equal(result.evidenceAssessment?.market.contributingPairs[0].sourceTimestamp, sourceFetchedAt);
  assert.equal(result.evidenceAssessment?.market.fetchedAt, null);
});

check('Missing quote and contributor timestamps cannot become current evidence', () => {
  const result = aggregate({
    marketStrength: makeMarketStrength('USD', 'EUR/USD', null),
    marketQuotes: [makeMarketQuote({ timestamp: null, providerTimestamp: undefined })]
  });
  assert.equal(result.evidenceAssessment?.market.availability, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.market.provenance, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.market.strength, null);
  assert.equal(result.evidenceAssessment?.market.contributingPairs.length, 0);
});

check('Fresh provider quotes remain usable when the stream is degraded', () => {
  const result = aggregate({
    marketQuotes: [makeMarketQuote({ sourceStatus: 'DEGRADED' })],
    marketProviderStatus: makeMarketStatus({
      health: 'DEGRADED',
      connectionStatus: 'DISCONNECTED',
      runtimeFeedState: 'DATA_AVAILABLE'
    })
  });
  assert.equal(result.evidenceAssessment?.market.strength, 0.2);
  assert.equal(result.evidenceAssessment?.market.freshness, 'FRESH');
  assert.equal(result.evidenceAssessment?.market.provenance, 'LIVE');
});

check('Stale source quotes remain visible without producing a current market strength', () => {
  const result = aggregate({
    marketStrength: null,
    marketQuotes: [makeMarketQuote({ stale: true, sourceStatus: 'STALE' })],
    marketProviderStatus: makeMarketStatus({ stalePairs: ['EUR/USD'] })
  });
  assert.equal(result.evidenceAssessment?.market.availability, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.market.strength, null);
  assert.equal(result.evidenceAssessment?.market.freshness, 'STALE');
  assert.equal(result.evidenceAssessment?.market.provenance, 'LIVE');
  assert.deepEqual(result.evidenceAssessment?.market.stalePairs.map((pair) => pair.pairSymbol), ['EUR/USD']);
});

check('Missing fundamentals do not become zero or neutral score evidence', () => {
  const result = aggregate({ observations: [] });
  assert.equal(result.fundamentalScore, null);
  assert.equal(result.overallCondition, 'DATA_UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.fundamentals.availability, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.fundamentals.scoreComponents[0].points, 0.08);
  assert(result.evidenceAssessment?.fundamentals.scoreComponents.slice(1).every((component) => component.points === null));
});

check('Reference and static policy remain contextual instead of live policy evidence', () => {
  for (const sourceType of ['REFERENCE', 'STATIC'] as const) {
    const profile = buildCentralBankProfile('USD', {
      sourceType,
      dataSourceMode: sourceType,
      freshness: sourceType === 'REFERENCE' ? 'STALE' : 'UNAVAILABLE'
    });
    const result = aggregate({ centralBankProfile: profile });
    assert.equal(result.evidenceAssessment?.policy.provenance, sourceType);
    assert.equal(result.evidenceAssessment?.policy.currentPolicyRate, null);
    assert.equal(result.evidenceAssessment?.policy.contextualPolicyRate, profile.policyRate);
    assert.equal(result.evidenceAssessment?.fundamentals.scoreComponents[0].points, null);
  }
});

check('Live policy without an actual fetched timestamp is unavailable', () => {
  const result = aggregate({
    centralBankProfile: buildCentralBankProfile('USD', {
      sourceType: 'LIVE',
      dataSourceMode: 'LIVE',
      freshness: 'FRESH',
      dataStatus: 'LIVE',
      currentPolicyRate: 5,
      stance: 'HAWKISH',
      fetchedTimestamp: null
    })
  });
  assert.equal(result.evidenceAssessment?.policy.availability, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.policy.currentPolicyRate, null);
  assert.equal(result.evidenceAssessment?.fundamentals.scoreComponents[0].points, null);
});

check('Connected provider status does not upgrade unrelated inputs to LIVE', () => {
  const result = aggregate({
    observations: [makeObservation('USD', 'INFLATION', 2, 1, 'FRESH', 'NOT_CONNECTED')],
    marketQuotes: [],
    marketStrength: null
  });
  assert.equal(result.evidenceAssessment?.market.provenance, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.fundamentals.provenance, 'UNAVAILABLE');
  assert(result.evidenceAssessment?.quality.reasons.some((reason) => reason.includes('connectivity alone')));
});

check('Actual-only observation remains incomplete without a realized surprise', () => {
  const result = aggregate({ observations: [makeObservation('USD', 'INFLATION', 2, null)] });
  assert.equal(result.evidenceAssessment?.expectations.incompleteCount, 1);
  assert.equal(result.evidenceAssessment?.expectations.items[0].surprise, null);
  assert.equal(result.evidenceAssessment?.expectations.items[0].surpriseType, 'UNKNOWN');
});

check('Forecast-only observation remains incomplete without a realized surprise', () => {
  const result = aggregate({ observations: [makeObservation('USD', 'EMPLOYMENT', null, 1)] });
  assert.equal(result.evidenceAssessment?.expectations.incompleteCount, 1);
  assert.equal(result.evidenceAssessment?.expectations.items[0].surprise, null);
  assert.equal(result.evidenceAssessment?.expectations.items[0].surpriseType, 'UNKNOWN');
});

check('Stale complete expectations remain historical rather than currently available', () => {
  const result = aggregate({
    observations: completeObservations('USD').map((observation) =>
      ({ ...observation, freshness: 'STALE' } as EconomicObservation)
    )
  });
  assert.equal(result.evidenceAssessment?.expectations.freshness, 'STALE');
  assert.equal(result.evidenceAssessment?.expectations.availability, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.expectations.completeCount, 0);
  assert(result.evidenceAssessment?.expectations.items.every((item) => item.surprise !== null));
});

check('Non-finite observation values cannot qualify or earn expectation points', () => {
  const result = aggregate({
    observations: [
      makeObservation('USD', 'INFLATION', Number.NaN, 1),
      makeObservation('USD', 'EMPLOYMENT', 1, Number.POSITIVE_INFINITY),
      makeObservation('USD', 'GROWTH', Number.NEGATIVE_INFINITY, 0)
    ]
  });
  assert.equal(result.fundamentalScore, null);
  assert.equal(result.evidenceAssessment?.fundamentals.provenance, 'UNAVAILABLE');
  assert.equal(result.evidenceAssessment?.fundamentals.evidenceCount, 0);
  assert.equal(result.evidenceAssessment?.expectations.items.length, 0);
});

check('Non-finite market and policy values cannot qualify as current evidence', () => {
  const marketResult = aggregate({ marketStrength: makeMarketStrength('USD') });
  const invalidMarketResult = aggregate({
    marketStrength: { ...makeMarketStrength('USD'), marketStrength: Number.NaN }
  });
  const invalidPolicyResult = aggregate({
    centralBankProfile: buildCentralBankProfile('USD', {
      sourceType: 'LIVE',
      dataSourceMode: 'LIVE',
      freshness: 'FRESH',
      dataStatus: 'LIVE',
      currentPolicyRate: Number.POSITIVE_INFINITY,
      stance: 'HAWKISH',
      fetchedTimestamp: sourceFetchedAt
    })
  });
  assert.equal(marketResult.evidenceAssessment?.market.availability, 'AVAILABLE');
  assert.equal(invalidMarketResult.evidenceAssessment?.market.availability, 'UNAVAILABLE');
  assert.equal(invalidPolicyResult.evidenceAssessment?.policy.availability, 'UNAVAILABLE');
  assert.equal(invalidPolicyResult.evidenceAssessment?.fundamentals.scoreComponents[0].points, null);
});

check('Missing evidence cannot create a market/fundamental contradiction', () => {
  const result = aggregate({
    observations: [],
    pairIntelligences: [pairIntelligence([marketFundamentalContradiction])]
  });
  assert.equal(result.evidenceAssessment?.contradictions.length, 0);
});

check('Every contradiction category fails closed when its required evidence is absent', () => {
  const categories: ContradictionCategory[] = [
    'MARKET_VS_FUNDAMENTAL',
    'FUNDAMENTAL_VS_EXPECTATION',
    'POLICY_VS_MARKET',
    'POLICY_VS_EXPECTATION',
    'CATALYST_VS_THESIS',
    'SESSION_VS_TIMING',
    'DATA_QUALITY',
    'OTHER'
  ];
  const result = aggregate({
    observations: [],
    marketStrength: null,
    marketQuotes: [],
    pairIntelligences: [pairIntelligence(categories.map(contradictionForCategory))]
  });
  assert.equal(result.evidenceAssessment?.contradictions.length, 0);
});

check('Stale market evidence cannot sustain a current market/fundamental contradiction', () => {
  const result = aggregate({
    observations: [...completeObservations('EUR'), ...completeObservations('USD')],
    marketQuotes: [makeMarketQuote({ stale: true, sourceStatus: 'STALE' })],
    marketProviderStatus: makeMarketStatus({ stalePairs: ['EUR/USD'] }),
    pairIntelligences: [pairIntelligence([marketFundamentalContradiction])]
  });
  assert.equal(result.evidenceAssessment?.contradictions.length, 0);
});

check('Existing contradiction output is retained when both sides have valid evidence', () => {
  const result = aggregate({
    observations: [...completeObservations('EUR'), ...completeObservations('USD')],
    pairIntelligences: [pairIntelligence([
      marketFundamentalContradiction,
      { ...marketFundamentalContradiction, id: 'contra-eurusd-market-fundamental-duplicate' }
    ])]
  });
  assert.equal(result.evidenceAssessment?.contradictions.length, 2);
  assert(result.evidenceAssessment?.explanation.conflicts.includes('Valid market and fundamental evidence conflict.'));
  assert.equal(
    result.evidenceAssessment?.explanation.conflicts.filter((conflict) =>
      conflict === 'Valid market and fundamental evidence conflict.'
    ).length,
    1
  );
  assert.equal(result.evidenceAssessment?.contradictions[0].sourceTimestamps.sourceA, null);
});

check('Valid fundamental-expectation contradiction requires current evidence on both pair currencies', () => {
  const contradiction = contradictionForCategory('FUNDAMENTAL_VS_EXPECTATION');
  const result = aggregate({
    observations: [...completeObservations('EUR'), ...completeObservations('USD')],
    pairIntelligences: [pairIntelligence([contradiction])]
  });
  assert.equal(result.evidenceAssessment?.contradictions.length, 1);
});

check('Policy contradictions require live current policy profiles for both currencies', () => {
  const policyMarket = contradictionForCategory('POLICY_VS_MARKET');
  const policyExpectation = contradictionForCategory('POLICY_VS_EXPECTATION');
  const pair = pairIntelligence([policyMarket, policyExpectation], {
    baseCentralBank: livePolicy('EUR'),
    quoteCentralBank: livePolicy('USD')
  });
  const result = aggregate({
    observations: [...completeObservations('EUR'), ...completeObservations('USD')],
    pairIntelligences: [pair]
  });
  assert.equal(result.evidenceAssessment?.contradictions.length, 2);
});

check('Valid OTHER fundamental contradictions require current facts on both currencies', () => {
  const result = aggregate({
    observations: [...completeObservations('EUR'), ...completeObservations('USD')],
    pairIntelligences: [pairIntelligence([contradictionForCategory('OTHER')])]
  });
  assert.equal(result.evidenceAssessment?.contradictions.length, 1);
});

check('Catalyst contradictions require a fetched fresh catalyst and supported thesis', () => {
  const catalyst = {
    currency: 'USD',
    source: 'Finance Calendar Provider',
    fetchedAt: sourceFetchedAt,
    freshness: 'FRESH',
    lifecycle: 'UPCOMING',
    status: 'UPCOMING'
  } as PairIntelligence['catalystIntelligence'][number];
  const thesis = {
    status: 'TENTATIVE',
    evidenceQuality: 'PARTIAL',
    provenance: ['LIVE market evidence'],
    supportingEvidence: ['Live market evidence'],
    counterEvidence: []
  } as NonNullable<PairIntelligence['structuredThesis']>;
  const result = aggregate({
    pairIntelligences: [pairIntelligence([contradictionForCategory('CATALYST_VS_THESIS')], {
      catalystIntelligence: [catalyst],
      structuredThesis: thesis
    })]
  });
  assert.equal(result.evidenceAssessment?.contradictions.length, 1);
});

check('Session contradictions require derived session and watch-window context', () => {
  const result = aggregate({
    pairIntelligences: [pairIntelligence([contradictionForCategory('SESSION_VS_TIMING')], {
      sessionContext: {
        primarySession: 'London',
        relevantSessions: ['London'],
        structuralRationale: 'London session is active.'
      },
      watchWindow: {
        watchState: 'ACTIVE',
        watchWindow: 'London session'
      },
      lastUpdated: calculatedAt.toISOString()
    })]
  });
  assert.equal(result.evidenceAssessment?.contradictions.length, 1);
});

check('Source provenance and freshness survive aggregation separately from calculation time', () => {
  const result = aggregate({
    observations: completeObservations('USD').map((observation) =>
      ({ ...observation, freshness: 'STALE' } as EconomicObservation)
    ),
    marketQuotes: [makeMarketQuote({ stale: true, sourceStatus: 'STALE' })],
    marketProviderStatus: makeMarketStatus({ snapshotHealth: 'STALE', stalePairs: ['EUR/USD'] }),
    fundamentalProviderStatus: makeFundamentalStatus({ freshness: 'STALE', isStale: true })
  });
  assert.equal(result.evidenceAssessment?.market.freshness, 'STALE');
  assert.equal(result.evidenceAssessment?.fundamentals.freshness, 'STALE');
  assert.equal(result.evidenceAssessment?.fundamentals.fetchedAt, sourceFetchedAt);
  assert.equal(result.evidenceAssessment?.calculatedAt, calculatedAt.toISOString());
  assert.notEqual(result.evidenceAssessment?.calculatedAt, result.evidenceAssessment?.fundamentals.fetchedAt);
});

check('Unknown or unclassified observations are not silently assigned to growth', () => {
  const result = aggregate({ observations: [makeObservation('USD', undefined, 2, 1)] });
  assert.equal(result.evidenceAssessment?.fundamentals.observations.length, 0);
  assert.equal(result.evidenceAssessment?.expectations.items.length, 0);
});

check('Currency intelligence retains the repository canonical 15-pair universe', () => {
  assert.equal(INITIAL_PAIRS.length, 15);
  assert.deepEqual(
    INITIAL_PAIRS.map((pair) => pair.symbol).sort(),
    [...CANONICAL_15_PAIRS].sort()
  );
});

check('Existing dashboard API exposes intelligence for every canonical currency', () => {
  const dashboard = VelquarathApiService.getDashboard(calculatedAt);
  assert.equal(dashboard.currencyIntelligence?.length, INITIAL_CURRENCIES.length);
  assert(dashboard.currencyIntelligence?.every(
    (intelligence) => intelligence.evidenceAssessment?.calculatedAt === calculatedAt.toISOString()
  ));
  assert(dashboard.allCurrencies.every((state) =>
    state.marketState !== 'STRONG' || state.marketStrength !== null
  ));
  assert(dashboard.allCurrencies.every((state) =>
    state.centralBank.sourceType === 'LIVE' || state.centralBank.currentPolicyRate === null
  ));
  assert(dashboard.allCurrencies.every((state) => state.overallState === 'DATA_UNAVAILABLE'));
});

check('Fundamental currency API separates reference policy from current LIVE policy', () => {
  const result = VelquarathApiService.getFundamentalCurrency('USD');
  assert(result);
  assert.equal(result.centralBank.currentPolicyRate, null);
  assert.equal(result.centralBank.policyRate, null);
  assert.equal(result.centralBank.stance, 'UNAVAILABLE');
  assert.equal(result.centralBank.contextualPolicyRate, result.evidenceAssessment?.policy.contextualPolicyRate);
  assert.equal(result.centralBank.contextualStance, result.evidenceAssessment?.policy.contextualStance);
  assert.equal(result.centralBank.policyProvenance, 'REFERENCE');
  assert.equal(result.centralBank.policyAvailability, 'REFERENCE_ONLY');
  assert.equal(result.overallState, 'DATA_UNAVAILABLE');
  if ('monetaryPolicy' in result.fundamentalState) {
    assert.equal(result.fundamentalState.monetaryPolicy.dataAvailable, false);
    assert(result.fundamentalState.monetaryPolicy.currentCondition.includes('contextual policy rate'));
  }
});

check('Currency and pair API states do not expose stored reference rates as current', () => {
  const state = VelquarathApiService.getCurrencyState('USD');
  assert(state);
  assert.equal(state.centralBank.currentPolicyRate, null);
  assert.equal(state.centralBank.policyRate, null);
  assert(state.centralBank.contextualPolicyRate !== null);
  assert.equal(state.centralBank.sourceType, 'REFERENCE');
  assert.equal(state.overallState, 'DATA_UNAVAILABLE');
  if ('monetaryPolicy' in state.fundamentalState) {
    assert.equal(state.fundamentalState.monetaryPolicy.dataAvailable, false);
    assert(state.fundamentalState.monetaryPolicy.currentCondition.includes('contextual policy rate'));
  }

  const pair = VelquarathApiService.getPairIntelligence('EUR/USD');
  assert(pair);
  assert.equal(pair.baseState.centralBank.currentPolicyRate, null);
  assert.equal(pair.quoteState.centralBank.currentPolicyRate, null);
  assert.equal(pair.baseCentralBank?.currentPolicyRate, null);
  assert.equal(pair.quoteCentralBank?.currentPolicyRate, null);
  assert.equal(pair.baseState.overallState, 'DATA_UNAVAILABLE');
  assert.equal(pair.quoteState.overallState, 'DATA_UNAVAILABLE');
});

console.log(`Currency Intelligence Core: ${passed} focused checks passed.`);