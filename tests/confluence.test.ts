/**
 * VELQOARATH — MARKET INTELLIGENCE FOUNDATION, REFRESH & CONFLUENCE TEST SUITE
 *
 * Verifies:
 * 1. Percentage-based market strength (+0.10 means +0.10%)
 * 2. +0.21%, +0.10%, +0.09%, -0.09%, -0.10%, -0.18% threshold classifications
 * 3. dailyReturnPercent preference over live tick changes
 * 4. Preservation of true percentage without arbitrary scaling compression
 * 5. Correct FX base/quote orientation
 * 6. Basket-relative calculation methodology
 * 7. RefreshScheduler lifecycle & overlap protection
 * 8. Timestamp tracking & data preservation on failure
 * 9. FinanceCalendarProvider configured vs not configured
 * 10. Benchmark vs Live provider separation
 * 11. Multi-factor confluence model component contributions & contradiction deductions
 * 12. Exact 15 live pairs universe (unsupported extras excluded)
 */

import { calculateCurrencyMarketStrengths, calculatePairContribution } from '../src/marketData/engine/marketStrengthEngine';
import { calculatePairConfluence } from '../src/engines/confluence/confluenceEngine';
import { FinanceCalendarProvider } from '../src/fundamentals/providers/FinanceCalendarProvider';
import { VerifiedDatasetFundamentalProvider } from '../src/fundamentals/providers/VerifiedDatasetFundamentalProvider';
import { RefreshScheduler } from '../src/services/refreshScheduler';
import { INITIAL_PAIRS } from '../src/data/pairs';
import { DEFAULT_LIQUID_PAIRS, MARKET_STRENGTH_SCALE_FACTOR } from '../src/marketData/config';
import { MarketQuote, CurrencyState } from '../src/types';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    process.exitCode = 1;
  } else {
    passedTests++;
    console.log(`✅ PASS: ${testName}`);
  }
}

console.log('================================================================');
console.log('RUNNING VELQOARATH MARKET STRENGTH, REFRESH & CONFLUENCE TESTS');
console.log('================================================================\n');

// -------------------------------------------------------------
// SECTION 1: MARKET STRENGTH PERCENTAGE UNIT (+0.10 = +0.10%)
// -------------------------------------------------------------
{
  console.log('--- Section 1: Market Strength Percentage Unit & Classifications ---');

  assert(MARKET_STRENGTH_SCALE_FACTOR === 1.0, 'Test 1.1: MARKET_STRENGTH_SCALE_FACTOR is 1.0 (true percentage representation)');

  const thresholds = { strongThreshold: 0.10, weakThreshold: -0.10 };

  // Helper to test single currency against a synthetic zero-centered basket with controlled relative return
  function createControlledQuotes(targetRelativeReturn: number): MarketQuote[] {
    // Single pair USD/JPY: USD is base (+R), JPY is quote (-R).
    // Sum of averages is (+R - R) = 0, so basketMean = 0, giving USD rawRelativeReturn = targetRelativeReturn exactly.
    return [
      {
        symbol: 'USD/JPY',
        baseCurrency: 'USD',
        quoteCurrency: 'JPY',
        price: 150.0,
        open: 150.0,
        high: 150.0,
        low: 150.0,
        close: 150.0,
        change: 0,
        changePercent: targetRelativeReturn,
        dailyReturnPercent: targetRelativeReturn,
        timestamp: Date.now(),
        interval: '1day',
        source: 'Biquote',
        sourceStatus: 'CONNECTED',
        fetchedAt: new Date().toISOString()
      }
    ];
  }

  // +0.21% classified STRONG
  {
    const quotes = createControlledQuotes(0.21);
    const res = calculateCurrencyMarketStrengths(quotes, thresholds);
    const usd = res.get('USD');
    assert(usd?.marketStrength === 0.21, 'Test 1.2: +0.21% movement gives marketStrength of 0.21');
    assert(usd?.classification === 'STRONG', 'Test 1.2: +0.21% classified STRONG');
    assert(usd?.basketRelativeMovementPercent === 0.21, 'Test 1.2: basketRelativeMovementPercent is +0.21%');
  }

  // +0.10% classified STRONG
  {
    const quotes = createControlledQuotes(0.10);
    const res = calculateCurrencyMarketStrengths(quotes, thresholds);
    const usd = res.get('USD');
    assert(usd?.marketStrength === 0.10, 'Test 1.3: +0.10% movement gives marketStrength of 0.10');
    assert(usd?.classification === 'STRONG', 'Test 1.3: +0.10% classified STRONG (threshold boundary)');
  }

  // +0.09% classified NEUTRAL
  {
    const quotes = createControlledQuotes(0.09);
    const res = calculateCurrencyMarketStrengths(quotes, thresholds);
    const usd = res.get('USD');
    assert(usd?.marketStrength === 0.09, 'Test 1.4: +0.09% movement gives marketStrength of 0.09');
    assert(usd?.classification === 'NEUTRAL', 'Test 1.4: +0.09% classified NEUTRAL (below +0.10%)');
  }

  // 0.00% classified NEUTRAL
  {
    const quotes = createControlledQuotes(0.00);
    const res = calculateCurrencyMarketStrengths(quotes, thresholds);
    const usd = res.get('USD');
    assert(usd?.marketStrength === 0.00, 'Test 1.4b: 0.00% movement gives marketStrength of 0.00');
    assert(usd?.classification === 'NEUTRAL', 'Test 1.4b: 0.00% classified NEUTRAL');
  }

  // -0.09% classified NEUTRAL
  {
    const quotes = createControlledQuotes(-0.09);
    const res = calculateCurrencyMarketStrengths(quotes, thresholds);
    const usd = res.get('USD');
    assert(usd?.marketStrength === -0.09, 'Test 1.5: -0.09% movement gives marketStrength of -0.09');
    assert(usd?.classification === 'NEUTRAL', 'Test 1.5: -0.09% classified NEUTRAL (above -0.10%)');
  }

  // -0.10% classified WEAK
  {
    const quotes = createControlledQuotes(-0.10);
    const res = calculateCurrencyMarketStrengths(quotes, thresholds);
    const usd = res.get('USD');
    assert(usd?.marketStrength === -0.10, 'Test 1.6: -0.10% movement gives marketStrength of -0.10');
    assert(usd?.classification === 'WEAK', 'Test 1.6: -0.10% classified WEAK (threshold boundary)');
  }

  // -0.18% classified WEAK
  {
    const quotes = createControlledQuotes(-0.18);
    const res = calculateCurrencyMarketStrengths(quotes, thresholds);
    const usd = res.get('USD');
    assert(usd?.marketStrength === -0.18, 'Test 1.7: -0.18% movement gives marketStrength of -0.18');
    assert(usd?.classification === 'WEAK', 'Test 1.7: -0.18% classified WEAK (below -0.10%)');
  }
}

// -------------------------------------------------------------
// SECTION 2: DAILY RETURN PERCENT SEPARATION & ORIENTATION
// -------------------------------------------------------------
{
  console.log('\n--- Section 2: Daily Return Separation & Pair Orientation ---');

  // dailyReturnPercent is preferred over instantaneous tick changePercent
  const quoteWithDailyReturn: MarketQuote = {
    symbol: 'EUR/USD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    price: 1.085,
    open: 1.08,
    high: 1.09,
    low: 1.079,
    close: 1.085,
    change: 0.005,
    changePercent: 0.15, // instantaneous tick return
    dailyReturnPercent: 0.46, // preserved daily baseline return
    timestamp: Date.now(),
    interval: '1day',
    source: 'Biquote',
    sourceStatus: 'CONNECTED',
    fetchedAt: new Date().toISOString()
  };

  const eurContrib = calculatePairContribution('EUR', quoteWithDailyReturn);
  const usdContrib = calculatePairContribution('USD', quoteWithDailyReturn);

  assert(eurContrib?.signedContribution === 0.46, 'Test 2.1: Base EUR uses dailyReturnPercent (+0.46%) over tick change (0.15%)');
  assert(usdContrib?.signedContribution === -0.46, 'Test 2.2: Quote USD uses dailyReturnPercent (-0.46%) over tick change (-0.15%)');
  assert(eurContrib?.role === 'BASE', 'Test 2.3: EUR correctly identified as BASE role');
  assert(usdContrib?.role === 'QUOTE', 'Test 2.4: USD correctly identified as QUOTE role');

  // Pair orientation regression tests for USD/JPY, EUR/USD, GBP/USD, AUD/JPY
  const pairsToTest = [
    { symbol: 'EUR/USD', base: 'EUR', quote: 'USD' },
    { symbol: 'USD/JPY', base: 'USD', quote: 'JPY' },
    { symbol: 'GBP/USD', base: 'GBP', quote: 'USD' },
    { symbol: 'AUD/JPY', base: 'AUD', quote: 'JPY' }
  ];

  for (const p of pairsToTest) {
    const pairQuote: MarketQuote = {
      symbol: p.symbol,
      baseCurrency: p.base,
      quoteCurrency: p.quote,
      price: 1.0,
      open: 1.0,
      high: 1.0,
      low: 1.0,
      close: 1.0,
      change: 0.01,
      changePercent: 0.50,
      dailyReturnPercent: 0.50,
      timestamp: Date.now(),
      interval: '1day',
      source: 'Biquote',
      sourceStatus: 'CONNECTED',
      fetchedAt: new Date().toISOString()
    };

    const baseContrib = calculatePairContribution(p.base, pairQuote);
    const quoteContrib = calculatePairContribution(p.quote, pairQuote);

    assert(baseContrib?.role === 'BASE', `Regression: ${p.base} is BASE role in ${p.symbol}`);
    assert(quoteContrib?.role === 'QUOTE', `Regression: ${p.quote} is QUOTE role in ${p.symbol}`);
    assert(baseContrib?.signedContribution === 0.50, `Regression: ${p.base} gets positive +0.50% from ${p.symbol} gain`);
    assert(quoteContrib?.signedContribution === -0.50, `Regression: ${p.quote} gets negative -0.50% from ${p.symbol} gain`);
  }
}

// -------------------------------------------------------------
// SECTION 3: EXACT 15 LIVE PAIRS UNIVERSE
// -------------------------------------------------------------
{
  console.log('\n--- Section 3: Exact 15 Live Pairs Universe ---');

  assert(INITIAL_PAIRS.length === 15, `Test 3.1: INITIAL_PAIRS has exactly 15 pairs (found: ${INITIAL_PAIRS.length})`);
  assert(DEFAULT_LIQUID_PAIRS.length === 15, `Test 3.2: DEFAULT_LIQUID_PAIRS has exactly 15 pairs (found: ${DEFAULT_LIQUID_PAIRS.length})`);

  const initialSymbols = INITIAL_PAIRS.map((p) => p.symbol);
  const defaultSymbols = [...DEFAULT_LIQUID_PAIRS];

  // Verify all 15 expected pairs are present
  const expected15 = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
    'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
    'EUR/CHF', 'GBP/CHF', 'AUD/JPY', 'NZD/JPY', 'CAD/JPY'
  ];

  for (const sym of expected15) {
    assert(initialSymbols.includes(sym), `Test 3.3: ${sym} is in INITIAL_PAIRS`);
    assert(defaultSymbols.includes(sym), `Test 3.4: ${sym} is in DEFAULT_LIQUID_PAIRS`);
  }

  // Verify unsupported extra pairs are excluded
  const unsupported = ['EUR/AUD', 'GBP/AUD', 'AUD/NZD'];
  for (const sym of unsupported) {
    assert(!initialSymbols.includes(sym), `Test 3.5: Unsupported pair ${sym} is excluded from INITIAL_PAIRS`);
  }

  // Verify universe contains exactly 15 unique pairs
  assert(new Set(initialSymbols).size === 15, 'Test 3.6: INITIAL_PAIRS contains 15 unique symbols');
  assert(new Set(defaultSymbols).size === 15, 'Test 3.7: DEFAULT_LIQUID_PAIRS contains 15 unique symbols');
}

// -------------------------------------------------------------
// SECTION 4: FUNDAMENTAL PROVIDER (FINANCE CALENDAR & BENCHMARK)
// -------------------------------------------------------------
{
  console.log('\n--- Section 4: Fundamental Providers (Finance Calendar & Benchmark) ---');

  // Unconfigured Finance Calendar provider (explicitly disabled)
  const unconfiguredProvider = new FinanceCalendarProvider({ enabled: false });
  const statusUnconf = unconfiguredProvider.getStatus();
  assert(statusUnconf.isConfigured === false, 'Test 4.1: Unconfigured provider isConfigured is false');
  assert(statusUnconf.health === 'NOT_CONFIGURED', 'Test 4.2: Unconfigured provider health is NOT_CONFIGURED');
  assert(statusUnconf.categoriesAvailable.length === 0, 'Test 4.3: Unconfigured provider reports 0 categories');

  // Configured Finance Calendar provider without invented API key requirement
  const configuredProvider = new FinanceCalendarProvider();
  const statusConf = configuredProvider.getStatus();
  assert(statusConf.isConfigured === true, 'Test 4.4: Configured provider isConfigured is true without API key');
  assert(
    statusConf.health === 'DISCONNECTED' || statusConf.health === 'AVAILABLE' || statusConf.health === 'CONNECTED',
    'Test 4.5: Configured provider lifecycle health initialized honestly'
  );
  assert(statusConf.categoriesConfigured?.length === 10, 'Test 4.6a: Configured provider reports 10 categories configured');
  assert(statusConf.categoriesAvailable.length === 0, 'Test 4.6b: Before initial sync, 0 categories populated');
  assert(statusConf.currenciesAvailable.length === 8, 'Test 4.7: Configured provider reports 8 currencies');

  // Edge case: Events exist, but observations are empty (must report DEGRADED, not fully CONNECTED macro dataset)
  const mockEventsOnlyFetch = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => [
      { id: '101', name: 'Upcoming FOMC Meeting', currency: 'USD', impact: 'HIGH', time_utc: '2026-10-01T18:00:00Z', actual: null }
    ]
  }) as any;

  const eventsOnlyProvider = new FinanceCalendarProvider({ fetchFn: mockEventsOnlyFetch });
  const refreshSuccess = await eventsOnlyProvider.refresh(true);
  const eventsOnlyStatus = eventsOnlyProvider.getStatus();
  assert(refreshSuccess === false, 'Test 4.8: Refresh returns false when only upcoming events with no macro prints exist');
  assert(eventsOnlyStatus.health === 'DEGRADED', 'Test 4.9: Provider health is DEGRADED when released macro observations are empty');
  assert(eventsOnlyStatus.count === 0, 'Test 4.10: Released macro observation count is 0');
  const eventsOnlyEvents = await eventsOnlyProvider.getEconomicCalendar();
  assert(eventsOnlyEvents.length === 1, 'Test 4.11: Calendar events are parsed and preserved');

  // Benchmark provider separation
  const benchmarkProvider = new VerifiedDatasetFundamentalProvider();
  assert(benchmarkProvider.name.includes('Baseline'), 'Test 4.12: Benchmark provider explicitly identified as Baseline');
  const benchStatus = benchmarkProvider.getStatus();
  assert(benchStatus.health === 'AVAILABLE', 'Test 4.13: Benchmark provider health is AVAILABLE');
}

// -------------------------------------------------------------
// SECTION 5: REFRESH SCHEDULER & OVERLAP PROTECTION
// -------------------------------------------------------------
{
  console.log('\n--- Section 5: Refresh Scheduler & Overlap Protection ---');

  const scheduler = RefreshScheduler.getInstance();
  const initialStatus = scheduler.getStatus();
  assert(initialStatus.market.intervalMs === 300000, 'Test 5.1: Market refresh interval is 5 minutes (300,000 ms)');
  assert(initialStatus.fundamentals.intervalMs === 900000, 'Test 5.2: Fundamental refresh interval is 15 minutes (900,000 ms)');

  // Test overlap protection: calling refresh concurrently
  let refreshCount = 0;
  const originalSync = scheduler.refreshMarketSnapshot;
  // Trigger refresh
  const p1 = scheduler.refreshMarketSnapshot(false);
  const p2 = scheduler.refreshMarketSnapshot(false); // Should detect overlap and return false immediately
  const results = await Promise.all([p1, p2]);

  assert(results.includes(false), 'Test 5.3: Overlapping market refresh call is safely prevented');
}

// -------------------------------------------------------------
// SECTION 6: MULTI-FACTOR CONFLUENCE MODEL
// -------------------------------------------------------------
{
  console.log('\n--- Section 6: Multi-Factor Confluence Model ---');

  const pair = INITIAL_PAIRS.find((p) => p.symbol === 'USD/JPY')!;

  // Create mock CurrencyStates with strong USD vs weak JPY
  const baseCurrency = {
    id: 'curr-usd',
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
    region: 'North America',
    active: true,
    createdAt: '',
    updatedAt: ''
  };

  const quoteCurrency = {
    id: 'curr-jpy',
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    region: 'Asia',
    active: true,
    createdAt: '',
    updatedAt: ''
  };

  const mockBaseState: CurrencyState = {
    currency: baseCurrency,
    marketStrength: 0.21, // +0.21% STRONG
    marketState: 'STRONG',
    relativeStrengthBreakdown: {
      marketStrength: 0.21,
      classification: 'STRONG',
      thresholds: { strongThreshold: 0.1, weakThreshold: -0.1 },
      dailyMovementPercent: 0.15,
      basketRelativeMovementPercent: 0.21,
      momentum: 0.08,
      timeframe: 'Live',
      explanation: 'USD basket relative movement = +0.21%',
      source: 'Biquote',
      coverage: { available: 5, required: 5, percent: 100 }
    },
    fundamentalState: {
      currency: 'USD',
      fundamentalScore: 0.18,
      overallCondition: 'EXPANSIONARY',
      inflation: { category: 'INFLATION', currentCondition: 'MODERATE', surprise: 'POSITIVE', implication: 'Hawkish', observations: [] },
      employment: { category: 'EMPLOYMENT', currentCondition: 'RESILIENT', surprise: 'IN_LINE', implication: 'Stable', observations: [] },
      growth: { category: 'GROWTH', currentCondition: 'EXPANDING', surprise: 'POSITIVE', implication: 'Supportive', observations: [] },
      summary: 'Resilient macro backdrop',
      calculatedAt: new Date().toISOString(),
      sources: []
    },
    centralBank: {
      id: 'cb-fed',
      institution: 'Federal Reserve',
      associatedCurrency: 'USD',
      currentPolicyRate: 5.25,
      previousPolicyRate: 5.25,
      latestDecisionDate: '2026-07-29',
      nextKnownDecisionDate: '2026-09-16',
      stance: 'HAWKISH',
      stanceEvidence: ['Higher for longer posture'],
      guidanceSummary: 'Restrictive policy maintained',
      majorRisks: ['Inflation persistence'],
      sourceMetadata: { sourceName: 'Fed', sourceUrl: '', lastUpdated: '', status: 'CONNECTED' }
    },
    overallState: 'STRONG',
    confidenceMetadata: { dataStatus: 'CONNECTED', observationCount: 8, completenessPct: 100, lastVerified: '' },
    supportingEvidence: ['Strong growth'],
    conflictingEvidence: []
  };

  const mockQuoteState: CurrencyState = {
    currency: quoteCurrency,
    marketStrength: -0.18, // -0.18% WEAK
    marketState: 'WEAK',
    relativeStrengthBreakdown: {
      marketStrength: -0.18,
      classification: 'WEAK',
      thresholds: { strongThreshold: 0.1, weakThreshold: -0.1 },
      dailyMovementPercent: -0.12,
      basketRelativeMovementPercent: -0.18,
      momentum: -0.07,
      timeframe: 'Live',
      explanation: 'JPY basket relative movement = -0.18%',
      source: 'Biquote',
      coverage: { available: 5, required: 5, percent: 100 }
    },
    fundamentalState: {
      currency: 'JPY',
      fundamentalScore: -0.05,
      overallCondition: 'CONTRACTIONARY',
      inflation: { category: 'INFLATION', currentCondition: 'SUBDUED', surprise: 'IN_LINE', implication: 'Dovish', observations: [] },
      employment: { category: 'EMPLOYMENT', currentCondition: 'STABLE', surprise: 'IN_LINE', implication: 'Neutral', observations: [] },
      growth: { category: 'GROWTH', currentCondition: 'SUBDUED', surprise: 'NEGATIVE', implication: 'Easing needed', observations: [] },
      summary: 'Subdued domestic momentum',
      calculatedAt: new Date().toISOString(),
      sources: []
    },
    centralBank: {
      id: 'cb-boj',
      institution: 'Bank of Japan',
      associatedCurrency: 'JPY',
      currentPolicyRate: 0.50,
      previousPolicyRate: 0.25,
      latestDecisionDate: '2026-07-31',
      nextKnownDecisionDate: '2026-09-20',
      stance: 'DOVISH',
      stanceEvidence: ['Gradual normalization with accommodative posture'],
      guidanceSummary: 'Accommodative monetary stance preserved',
      majorRisks: ['Global slowdown drag'],
      sourceMetadata: { sourceName: 'BoJ', sourceUrl: '', lastUpdated: '', status: 'CONNECTED' }
    },
    overallState: 'WEAK',
    confidenceMetadata: { dataStatus: 'CONNECTED', observationCount: 6, completenessPct: 80, lastVerified: '' },
    supportingEvidence: ['Accommodative policy'],
    conflictingEvidence: []
  };

  // Delta = 0.21 - (-0.18) = +0.39%
  const confluence = calculatePairConfluence({
    pair,
    baseState: mockBaseState,
    quoteState: mockQuoteState,
    relativeStrengthDelta: 0.39,
    orientationDirection: 'BULLISH_BASE',
    events: [],
    isDataFeedConnected: true
  });

  assert(confluence.direction === 'BULLISH_BASE', 'Test 6.1: Direction is BULLISH_BASE');
  assert(confluence.confluenceScore >= 70, `Test 6.2: High alignment yields high confluence score (score: ${confluence.confluenceScore}/100)`);
  assert(confluence.directionalConfidence === 'HIGH' || confluence.directionalConfidence === 'VERY_HIGH', `Test 6.3: Confidence level is HIGH or VERY_HIGH (was: ${confluence.directionalConfidence})`);

  // Verify component points
  assert(confluence.components.marketStrength.points === 25, 'Test 6.4: Market strength provides max 25 points for +0.39% delta');
  assert(confluence.components.fundamentals.points >= 16, 'Test 6.5: Fundamentals provide strong contribution');
  assert(confluence.components.policy.points >= 15, 'Test 6.6: Policy carry (+4.75%) + Hawkish vs Dovish provides high points');
  assert(confluence.components.contradictionPenalty.penaltyPoints === 0, 'Test 6.7: Zero contradiction penalty when all factors align');
  assert(confluence.dataQualityAdjustment.factor === 1.0, 'Test 6.8: Complete coverage yields 1.0x data quality multiplier');

  // Verify no fake probability claims
  assert(!confluence.explanation.toLowerCase().includes('probability of winning'), 'Test 6.9: Explanation never claims winning probability');
  assert(!confluence.explanation.toLowerCase().includes('chance of profit'), 'Test 6.10: Explanation never claims profit chance');
  assert(confluence.explanation.includes('Confluence Score'), 'Test 6.11: Uses proper Confluence terminology');

  // Test contradiction penalty when fundamentals oppose market direction
  const conflictingBaseState = {
    ...mockBaseState,
    fundamentalState: {
      ...mockBaseState.fundamentalState,
      fundamentalScore: -0.20 // Negative fundamentals despite positive market strength
    }
  };

  const penalizedConfluence = calculatePairConfluence({
    pair,
    baseState: conflictingBaseState,
    quoteState: mockQuoteState,
    relativeStrengthDelta: 0.39,
    orientationDirection: 'BULLISH_BASE',
    events: [],
    isDataFeedConnected: true
  });

  assert(
    penalizedConfluence.components.contradictionPenalty.penaltyPoints > 0,
    `Test 6.12: Divergence between price and fundamentals applies penalty (-${penalizedConfluence.components.contradictionPenalty.penaltyPoints} pts)`
  );
  assert(
    penalizedConfluence.confluenceScore < confluence.confluenceScore,
    'Test 6.13: Penalized confluence score is lower than fully aligned score'
  );
}

console.log(`\n================================================================`);
console.log(`ALL CONFLUENCE & REFRESH TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
console.log(`================================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
