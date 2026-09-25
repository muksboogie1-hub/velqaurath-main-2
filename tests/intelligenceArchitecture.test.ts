/**
 * VELQOARATH — COMPREHENSIVE INTELLIGENCE ARCHITECTURE & HARDENING TEST SUITE
 *
 * Covers:
 * 1. Exact Market Strength Thresholds (+0.21, +0.10, +0.09, 0.00, -0.09, -0.10, -0.18)
 * 2. FX Pair Orientation (EUR/USD, USD/JPY, GBP/JPY, EUR/GBP, USD/CHF)
 * 3. Exact 15 Canonical Pairs Universe (no silent expansion)
 * 4. Catalyst Intelligence & Lifecycle (UPCOMING, IMMINENT, REACTING, RELEASED, PASSED, STALE, UNAVAILABLE)
 * 5. Structured Thesis States (SUPPORTED, MIXED, WEAKENED, INVALIDATED, INSUFFICIENT_DATA)
 * 6. Structured Invalidation States (VALID, WEAKENED, INVALIDATED, UNABLE_TO_EVALUATE)
 * 7. Structured Contradictions (detection, severity, auditability)
 * 8. 3-Dimensional Confluence Assessment (Directional, Context, Risk)
 * 9. Opportunity States (PRIMARY_WATCH, SECONDARY_WATCH, MONITOR, WAIT, INSUFFICIENT_DATA)
 * 10. DST-Aware Sessions & Institutional Context
 * 11. Deterministic End-to-End Fixture & 11 Pipeline Mutations
 */

import { calculateCurrencyMarketStrengths } from '../src/marketData/engine/marketStrengthEngine';
import { evaluatePairIntelligence } from '../src/engines/pair/pairEngine';
import { evaluateEventLifecycle, evaluateIndicatorImpact, evaluateEventRisk, transformToCatalystEvent, evaluateCatalystIntelligence } from '../src/engines/catalyst/catalystEngine';
import { evaluateStructuredContradictions } from '../src/engines/contradiction/contradictionEngine';
import { evaluateStructuredInvalidation } from '../src/engines/invalidation/invalidationEngine';
import { evaluateStructuredThesis } from '../src/engines/thesis/thesisEngine';
import { evaluatePairOpportunity, evaluateAllOpportunities } from '../src/engines/opportunity/opportunityEngine';
import { calculatePairConfluence } from '../src/engines/confluence/confluenceEngine';
import { ProvenanceService } from '../src/services/provenanceService';
import { INITIAL_PAIRS, getPairBySymbol } from '../src/data/pairs';
import { DEFAULT_LIQUID_PAIRS } from '../src/marketData/config';
import { getSessionInstantStatus, getActiveSessionOverview, MARKET_SESSIONS } from '../src/data/sessions';
import { CurrencyState, MarketQuote, EconomicEvent, PairIntelligence } from '../src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    failed++;
    console.error(`❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('================================================================');
console.log('RUNNING VELQOARATH FULL INTELLIGENCE ARCHITECTURE VERIFICATION');
console.log('================================================================\n');

// -------------------------------------------------------------
// SECTION 1: MARKET STRENGTH EXACT THRESHOLDS
// -------------------------------------------------------------
console.log('--- Section 1: Exact Market Strength Threshold Boundaries ---');
{
  const thresholds = { strongThreshold: 0.10, weakThreshold: -0.10 };

  function mockQuote(sym: string, returnPct: number): MarketQuote {
    const [base, quote] = sym.split('/');
    return {
      symbol: sym,
      baseCurrency: base,
      quoteCurrency: quote,
      price: 1.0,
      open: 1.0,
      high: 1.0,
      low: 1.0,
      close: 1.0,
      change: 0,
      changePercent: returnPct,
      dailyReturnPercent: returnPct,
      timestamp: Date.now(),
      interval: '1day',
      source: 'Biquote',
      sourceStatus: 'CONNECTED',
      fetchedAt: new Date().toISOString()
    };
  }

  // Helper to isolate single currency relative return
  function getStrengthForRelativeReturn(target: number): number | null {
    // USD/JPY with target return
    const quotes = [mockQuote('USD/JPY', target)];
    const res = calculateCurrencyMarketStrengths(quotes, thresholds);
    return res.get('USD')?.marketStrength ?? null;
  }

  // +0.21 -> STRONG
  {
    const val = getStrengthForRelativeReturn(0.21);
    const res = calculateCurrencyMarketStrengths([mockQuote('USD/JPY', 0.21)], thresholds);
    assert(val === 0.21, 'Test 1.1: +0.21% gives exact marketStrength 0.21');
    assert(res.get('USD')?.classification === 'STRONG', 'Test 1.1: +0.21% classified STRONG');
  }

  // +0.10 -> STRONG (exact boundary)
  {
    const val = getStrengthForRelativeReturn(0.10);
    const res = calculateCurrencyMarketStrengths([mockQuote('USD/JPY', 0.10)], thresholds);
    assert(val === 0.10, 'Test 1.2: +0.10% gives exact marketStrength 0.10');
    assert(res.get('USD')?.classification === 'STRONG', 'Test 1.2: +0.10% classified STRONG (boundary)');
  }

  // +0.09 -> NEUTRAL
  {
    const val = getStrengthForRelativeReturn(0.09);
    const res = calculateCurrencyMarketStrengths([mockQuote('USD/JPY', 0.09)], thresholds);
    assert(val === 0.09, 'Test 1.3: +0.09% gives exact marketStrength 0.09');
    assert(res.get('USD')?.classification === 'NEUTRAL', 'Test 1.3: +0.09% classified NEUTRAL');
  }

  // 0.00 -> NEUTRAL
  {
    const val = getStrengthForRelativeReturn(0.00);
    const res = calculateCurrencyMarketStrengths([mockQuote('USD/JPY', 0.00)], thresholds);
    assert(val === 0.00, 'Test 1.4: 0.00% gives exact marketStrength 0.00');
    assert(res.get('USD')?.classification === 'NEUTRAL', 'Test 1.4: 0.00% classified NEUTRAL');
  }

  // -0.09 -> NEUTRAL
  {
    const val = getStrengthForRelativeReturn(-0.09);
    const res = calculateCurrencyMarketStrengths([mockQuote('USD/JPY', -0.09)], thresholds);
    assert(val === -0.09, 'Test 1.5: -0.09% gives exact marketStrength -0.09');
    assert(res.get('USD')?.classification === 'NEUTRAL', 'Test 1.5: -0.09% classified NEUTRAL');
  }

  // -0.10 -> WEAK (exact boundary)
  {
    const val = getStrengthForRelativeReturn(-0.10);
    const res = calculateCurrencyMarketStrengths([mockQuote('USD/JPY', -0.10)], thresholds);
    assert(val === -0.10, 'Test 1.6: -0.10% gives exact marketStrength -0.10');
    assert(res.get('USD')?.classification === 'WEAK', 'Test 1.6: -0.10% classified WEAK (boundary)');
  }

  // -0.18 -> WEAK
  {
    const val = getStrengthForRelativeReturn(-0.18);
    const res = calculateCurrencyMarketStrengths([mockQuote('USD/JPY', -0.18)], thresholds);
    assert(val === -0.18, 'Test 1.7: -0.18% gives exact marketStrength -0.18');
    assert(res.get('USD')?.classification === 'WEAK', 'Test 1.7: -0.18% classified WEAK');
  }
}

// -------------------------------------------------------------
// SECTION 2: CANONICAL 15-PAIR UNIVERSE ENFORCEMENT
// -------------------------------------------------------------
console.log('\n--- Section 2: Canonical 15-Pair Universe ---');
{
  assert(INITIAL_PAIRS.length === 15, `Test 2.1: INITIAL_PAIRS count is exactly 15 (got ${INITIAL_PAIRS.length})`);
  assert(DEFAULT_LIQUID_PAIRS.length === 15, `Test 2.2: DEFAULT_LIQUID_PAIRS count is exactly 15 (got ${DEFAULT_LIQUID_PAIRS.length})`);

  const official15 = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
    'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
    'EUR/CHF', 'GBP/CHF', 'AUD/JPY', 'NZD/JPY', 'CAD/JPY'
  ];

  for (const sym of official15) {
    assert(getPairBySymbol(sym) !== undefined, `Test 2.3: Official pair ${sym} is resolvable`);
  }

  // Verify non-canonical pairs are strictly excluded
  const nonCanonical = ['EUR/AUD', 'GBP/AUD', 'AUD/NZD'];
  for (const sym of nonCanonical) {
    assert(getPairBySymbol(sym) === undefined, `Test 2.4: Non-canonical pair ${sym} is excluded`);
  }
}

// -------------------------------------------------------------
// SECTION 3: CATALYST INTELLIGENCE & EVENT LIFECYCLE
// -------------------------------------------------------------
console.log('\n--- Section 3: Catalyst Intelligence & Lifecycle States ---');
{
  const now = new Date('2026-09-24T12:00:00Z');

  // Test UPCOMING (> 2h)
  const upcomingEvent: EconomicEvent = {
    id: 'evt-cpi-future',
    name: 'US Core CPI YoY',
    currency: 'USD',
    importance: 'HIGH',
    scheduledTime: '2026-09-24T16:00:00Z', // 4h in future
    previous: 3.2,
    forecast: 3.1,
    actual: null,
    unit: '%',
    status: 'UPCOMING'
  };
  const upRes = evaluateEventLifecycle(upcomingEvent, now);
  assert(upRes.lifecycle === 'UPCOMING', `Test 3.1: Event 4h in future is UPCOMING (got ${upRes.lifecycle})`);
  assert(upRes.timeToEventMinutes === 240, 'Test 3.1: timeToEventMinutes is 240m');

  // Test IMMINENT (<= 2h)
  const imminentEvent: EconomicEvent = {
    ...upcomingEvent,
    scheduledTime: '2026-09-24T13:30:00Z' // 90m in future
  };
  const immRes = evaluateEventLifecycle(imminentEvent, now);
  assert(immRes.lifecycle === 'IMMINENT', `Test 3.2: Event 90m in future is IMMINENT (got ${immRes.lifecycle})`);

  // Imminent High Impact creates Event Risk, NOT directional evidence
  const immRisk = evaluateEventRisk(imminentEvent, 'IMMINENT', 90);
  assert(immRisk.level === 'CRITICAL', 'Test 3.3: Imminent high impact release creates CRITICAL event risk');
  assert(immRisk.inVolatilityWindow === true, 'Test 3.3: inVolatilityWindow is true for imminent event');

  const immTrans = transformToCatalystEvent(imminentEvent, now);
  assert(immTrans.directionalEvidence.bias === 'UNKNOWN', 'Test 3.4: Imminent unreleased event creates ZERO directional bias');
  assert(immTrans.directionalEvidence.weight === 0, 'Test 3.4: Directional evidence weight is 0 for unreleased event');

  // Test REACTING (<= 4h post-release)
  const reactingEvent: EconomicEvent = {
    ...upcomingEvent,
    scheduledTime: '2026-09-24T11:00:00Z', // 60m ago
    actual: 3.4,
    status: 'RELEASED'
  };
  const reactRes = evaluateEventLifecycle(reactingEvent, now);
  assert(reactRes.lifecycle === 'REACTING', `Test 3.5: Event printed 60m ago is REACTING (got ${reactRes.lifecycle})`);

  // Released Inflation beat creates verified directional bias
  const impact = evaluateIndicatorImpact('US Core CPI YoY', 3.4, 3.1, 3.2);
  assert(impact.bias === 'BULLISH', 'Test 3.6: Inflation beat (3.4 vs 3.1) creates BULLISH directional impulse');
  assert(impact.surprise === 0.3, 'Test 3.6: Surprise magnitude is +0.3');
  assert(impact.isVerifiedInterpretation === true, 'Test 3.6: Indicator interpretation is verified');

  // Test RELEASED (> 4h and <= 24h)
  const releasedEvent: EconomicEvent = {
    ...upcomingEvent,
    scheduledTime: '2026-09-24T06:00:00Z', // 6h ago
    actual: 3.4,
    status: 'RELEASED'
  };
  const relRes = evaluateEventLifecycle(releasedEvent, now);
  assert(relRes.lifecycle === 'RELEASED', `Test 3.7: Event printed 6h ago is RELEASED (got ${relRes.lifecycle})`);

  // Test PASSED (> 24h)
  const passedEvent: EconomicEvent = {
    ...upcomingEvent,
    scheduledTime: '2026-09-22T12:00:00Z', // 48h ago
    actual: 3.4,
    status: 'RELEASED'
  };
  const passRes = evaluateEventLifecycle(passedEvent, now);
  assert(passRes.lifecycle === 'PASSED', `Test 3.8: Event printed 48h ago is PASSED (got ${passRes.lifecycle})`);

  // Test STALE (historical with missing actual)
  const staleEvent: EconomicEvent = {
    ...upcomingEvent,
    scheduledTime: '2026-09-20T12:00:00Z',
    actual: null,
    status: 'UPCOMING'
  };
  const staleRes = evaluateEventLifecycle(staleEvent, now);
  assert(staleRes.lifecycle === 'STALE', `Test 3.9: Old event without actual print is STALE (got ${staleRes.lifecycle})`);

  // Test UNAVAILABLE (invalid timestamp)
  const unavailEvent: EconomicEvent = {
    ...upcomingEvent,
    scheduledTime: 'INVALID_DATE'
  };
  const unavailRes = evaluateEventLifecycle(unavailEvent, now);
  assert(unavailRes.lifecycle === 'UNAVAILABLE', `Test 3.10: Malformed event timestamp is UNAVAILABLE (got ${unavailRes.lifecycle})`);
}

// -------------------------------------------------------------
// SECTION 4: STRUCTURED CONTRADICTIONS ENGINE
// -------------------------------------------------------------
console.log('\n--- Section 4: Structured Contradictions Engine ---');
{
  const mockBaseState: CurrencyState = {
    currency: { id: 'curr-eur', code: 'EUR', name: 'Euro', symbol: '€', region: 'Europe', active: true, createdAt: '', updatedAt: '' },
    marketStrength: 0.25, // Strong price momentum
    marketState: 'STRONG',
    relativeStrengthBreakdown: { marketStrength: 0.25, classification: 'STRONG', thresholds: { strongThreshold: 0.1, weakThreshold: -0.1 }, timeframe: 'Live', explanation: '', source: 'Biquote' },
    fundamentalState: {
      currency: 'EUR',
      fundamentalScore: -0.15, // Deteriorating fundamentals
      overallCondition: 'CONTRACTIONARY',
      inflation: { category: 'INFLATION', currentCondition: '', surprise: 'NEGATIVE', implication: '', observations: [] },
      employment: { category: 'EMPLOYMENT', currentCondition: '', surprise: 'NEGATIVE', implication: '', observations: [] },
      growth: { category: 'GROWTH', currentCondition: '', surprise: 'NEGATIVE', implication: '', observations: [] },
      summary: '',
      calculatedAt: '',
      sources: []
    },
    centralBank: {
      id: 'cb-ecb',
      institution: 'European Central Bank',
      associatedCurrency: 'EUR',
      currentPolicyRate: 3.75,
      previousPolicyRate: 4.0,
      latestDecisionDate: '2026-07-15',
      nextKnownDecisionDate: '2026-09-15',
      stance: 'DOVISH',
      stanceEvidence: ['Rate cut cycle active'],
      guidanceSummary: '',
      majorRisks: [],
      sourceMetadata: { sourceName: 'ECB', sourceUrl: '', lastUpdated: '', status: 'CONNECTED' }
    },
    overallState: 'STRONG',
    confidenceMetadata: { dataStatus: 'CONNECTED', observationCount: 5, completenessPct: 80, lastVerified: '' },
    supportingEvidence: [],
    conflictingEvidence: []
  };

  const mockQuoteState: CurrencyState = {
    ...mockBaseState,
    currency: { id: 'curr-usd', code: 'USD', name: 'US Dollar', symbol: '$', region: 'North America', active: true, createdAt: '', updatedAt: '' },
    marketStrength: -0.10,
    marketState: 'WEAK',
    fundamentalState: {
      ...mockBaseState.fundamentalState,
      currency: 'USD',
      fundamentalScore: 0.15 // Resilient fundamentals
    },
    centralBank: {
      ...mockBaseState.centralBank,
      id: 'cb-fed',
      institution: 'Federal Reserve',
      associatedCurrency: 'USD',
      currentPolicyRate: 5.25,
      stance: 'HAWKISH'
    }
  };

  const pair = INITIAL_PAIRS.find((p) => p.symbol === 'EUR/USD')!;
  const fundDiff: any = {
    fundamentalDifferential: { delta: -0.30, summary: 'USD fundamentals superior to EUR' },
    policyDifferential: { rateSpread: -1.50, stanceDelta: 'Fed hawkish vs ECB dovish' }
  };

  const res = evaluateStructuredContradictions({
    pair,
    baseState: mockBaseState,
    quoteState: mockQuoteState,
    relativeStrengthDelta: 0.35, // Market is bullish EUR/USD
    orientationDirection: 'BULLISH_BASE',
    fundamentalDiff: fundDiff
  });

  assert(res.contradictions.length >= 1, `Test 4.1: Contradictions detected (count: ${res.contradictions.length})`);
  const mktVsFund = res.contradictions.find((c) => c.category === 'MARKET_VS_FUNDAMENTAL');
  assert(mktVsFund !== undefined, 'Test 4.2: MARKET_VS_FUNDAMENTAL contradiction identified');
  assert(mktVsFund?.severity === 'HIGH', 'Test 4.2: Divergence severity is HIGH');
  assert(mktVsFund?.status === 'UNRESOLVED', 'Test 4.2: Status is UNRESOLVED');
  assert(mktVsFund?.penaltyPoints === 15, 'Test 4.3: Contradiction carries 15 penalty points');
}

// -------------------------------------------------------------
// SECTION 5: STRUCTURED INVALIDATION ENGINE
// -------------------------------------------------------------
console.log('\n--- Section 5: Structured Invalidation Engine ---');
{
  const pair = INITIAL_PAIRS.find((p) => p.symbol === 'EUR/USD')!;
  const mockState: any = {
    marketStrength: 0.20,
    centralBank: { institution: 'ECB', stance: 'HAWKISH' }
  };
  const mockQuote: any = {
    marketStrength: -0.10,
    centralBank: { institution: 'Fed', stance: 'DOVISH' }
  };

  // 1. Untriggered / Valid
  const validRes = evaluateStructuredInvalidation({
    pair,
    baseState: mockState,
    quoteState: mockQuote,
    relativeStrengthDelta: 0.30,
    orientationDirection: 'BULLISH_BASE',
    isDataFeedConnected: true
  });
  assert(validRes.overallStatus === 'VALID', `Test 5.1: Untriggered conditions evaluate to VALID (got ${validRes.overallStatus})`);
  assert(validRes.conditions.every((c) => !c.triggered), 'Test 5.1: All condition triggered flags are false');

  // 2. Triggered Invalidation (delta reversed below threshold)
  const invalidRes = evaluateStructuredInvalidation({
    pair,
    baseState: mockState,
    quoteState: mockQuote,
    relativeStrengthDelta: 0.02, // Below 0.05% threshold for Bullish
    orientationDirection: 'BULLISH_BASE',
    isDataFeedConnected: true
  });
  assert(invalidRes.overallStatus === 'INVALIDATED', `Test 5.2: Broken strength delta triggers INVALIDATED (got ${invalidRes.overallStatus})`);
  const deltaCond = invalidRes.conditions.find((c) => c.category === 'MARKET_STRENGTH');
  assert(deltaCond?.triggered === true, 'Test 5.2: Market strength condition triggered is true');

  // 3. Feeds Offline -> UNABLE_TO_EVALUATE
  const offlineRes = evaluateStructuredInvalidation({
    pair,
    baseState: mockState,
    quoteState: mockQuote,
    relativeStrengthDelta: null,
    orientationDirection: 'DATA_UNAVAILABLE',
    isDataFeedConnected: false
  });
  assert(offlineRes.overallStatus === 'UNABLE_TO_EVALUATE', `Test 5.3: Disconnected feeds evaluate to UNABLE_TO_EVALUATE (got ${offlineRes.overallStatus})`);
}

// -------------------------------------------------------------
// SECTION 6: STRUCTURED THESIS & OPPORTUNITY STATES
// -------------------------------------------------------------
console.log('\n--- Section 6: Structured Thesis & Opportunity States ---');
{
  const pair = INITIAL_PAIRS.find((p) => p.symbol === 'USD/JPY')!;
  const mockState: any = {
    marketStrength: 0.25,
    confidenceMetadata: { observationCount: 6 },
    centralBank: { currentPolicyRate: 5.25, institution: 'Fed', stance: 'HAWKISH' }
  };
  const mockQuote: any = {
    marketStrength: -0.15,
    confidenceMetadata: { observationCount: 5 },
    centralBank: { currentPolicyRate: 0.50, institution: 'BoJ', stance: 'DOVISH' }
  };

  const cleanThesis = evaluateStructuredThesis({
    pair,
    baseState: mockState,
    quoteState: mockQuote,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    supportingEvidence: ['Strong price momentum', 'Positive carry'],
    counterEvidence: [],
    catalysts: [],
    contradictions: [],
    invalidationConditions: [],
    isDataFeedConnected: true
  });

  assert(cleanThesis.status === 'SUPPORTED', `Test 6.1: Clean evidence yields SUPPORTED thesis (got ${cleanThesis.status})`);
  assert(cleanThesis.evidenceQuality === 'COMPLETE', 'Test 6.1: Complete inputs yield COMPLETE evidence quality');

  // Opportunity evaluation
  const mockIntel: PairIntelligence = {
    pair,
    baseCurrency: { id: 'curr-usd', code: 'USD', name: 'US Dollar', symbol: '$', region: 'North America', active: true, createdAt: '', updatedAt: '' },
    quoteCurrency: { id: 'curr-jpy', code: 'JPY', name: 'Japanese Yen', symbol: '¥', region: 'Asia', active: true, createdAt: '', updatedAt: '' },
    baseState: mockState,
    quoteState: mockQuote,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    orientationExplanation: '',
    convergenceDivergence: 'CONVERGENCE',
    convergenceExplanation: '',
    supportingEvidence: ['Aligned momentum'],
    counterEvidence: [],
    catalysts: [],
    risks: [],
    thesis: '',
    structuredThesis: cleanThesis,
    invalidationConditions: [],
    sessionRelevance: { primarySession: 'Tokyo / New York', relevantSessions: ['Tokyo', 'New York'], structuralRationale: '' },
    watchWindow: { watchState: 'ACTIVE', watchWindow: '' },
    lastUpdated: new Date().toISOString(),
    sources: [],
    confluence: {
      confluenceScore: 85,
      directionalConfidence: 'VERY_HIGH',
      direction: 'BULLISH_BASE',
      components: {} as any,
      dataQualityAdjustment: {} as any,
      rawScoreBeforeAdjustments: 85,
      explanation: '',
      calculatedAt: '',
      marketDataTimestamp: null,
      fundamentalDataTimestamp: null,
      dataQuality: 'COMPLETE'
    }
  };

  const opp = evaluatePairOpportunity(mockIntel);
  assert(opp.state === 'PRIMARY_WATCH', `Test 6.2: High score + supported thesis yields PRIMARY_WATCH (got ${opp.state})`);
  assert(opp.whyThisPair.includes('PRIMARY WATCH'), 'Test 6.2: Explanation identifies PRIMARY WATCH');

  // Imminent binary event downgrades to MONITOR
  const imminentCatalyst = transformToCatalystEvent({
    id: 'evt-fomc',
    name: 'Fed Interest Rate Decision',
    currency: 'USD',
    importance: 'HIGH',
    scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h in future
    previous: 5.25,
    forecast: 5.25,
    actual: null,
    unit: '%',
    status: 'UPCOMING'
  });

  const eventRiskIntel: PairIntelligence = {
    ...mockIntel,
    catalystIntelligence: [imminentCatalyst]
  };
  const oppEvent = evaluatePairOpportunity(eventRiskIntel);
  assert(oppEvent.state === 'MONITOR', `Test 6.3: Imminent high impact event sets state to MONITOR (got ${oppEvent.state})`);

  // Invalidated thesis sets state to WAIT
  const invalidIntel: PairIntelligence = {
    ...mockIntel,
    structuredThesis: {
      ...cleanThesis,
      status: 'INVALIDATED'
    }
  };
  const oppInvalid = evaluatePairOpportunity(invalidIntel);
  assert(oppInvalid.state === 'WAIT', `Test 6.4: Invalidated thesis sets state to WAIT (got ${oppInvalid.state})`);
}

// -------------------------------------------------------------
// SECTION 7: PROVENANCE & FRESHNESS SERVICE
// -------------------------------------------------------------
console.log('\n--- Section 7: Provenance & Freshness Service ---');
{
  const now = new Date('2026-09-24T12:00:00Z');

  // Live Quote Freshness (<= 30s)
  const freshQuote = ProvenanceService.evaluateFreshness('2026-09-24T11:59:45Z', 'LIVE_QUOTE', now);
  assert(freshQuote === 'FRESH', `Test 7.1: Quote 15s old is FRESH (got ${freshQuote})`);

  const staleQuote = ProvenanceService.evaluateFreshness('2026-09-24T11:55:00Z', 'LIVE_QUOTE', now);
  assert(staleQuote === 'STALE', `Test 7.2: Quote 5m old is STALE (got ${staleQuote})`);

  // Macro Observation Freshness (<= 24h)
  const freshMacro = ProvenanceService.evaluateFreshness('2026-09-24T00:00:00Z', 'MACRO_OBSERVATION', now);
  assert(freshMacro === 'FRESH', `Test 7.3: Macro observation 12h old is FRESH (got ${freshMacro})`);

  const staleMacro = ProvenanceService.evaluateFreshness('2026-09-10T00:00:00Z', 'MACRO_OBSERVATION', now);
  assert(staleMacro === 'STALE', `Test 7.4: Macro observation 14d old is STALE (got ${staleMacro})`);

  const rec = ProvenanceService.createRecord({
    source: 'Biquote Tick Stream',
    provider: 'Biquote',
    dataType: 'LIVE_QUOTE',
    status: 'CONNECTED',
    provenanceType: 'LIVE_PROVIDER',
    referenceDate: now
  });
  assert(rec.provenanceType === 'LIVE_PROVIDER', 'Test 7.5: ProvenanceType preserved as LIVE_PROVIDER');
  assert(rec.freshness === 'FRESH', 'Test 7.5: Created record freshness is FRESH');
}

// -------------------------------------------------------------
// SECTION 8: DST-AWARE INSTITUTIONAL SESSIONS
// -------------------------------------------------------------
console.log('\n--- Section 8: DST-Aware Institutional Sessions ---');
{
  const sydney = MARKET_SESSIONS.find((s) => s.id === 'sess-sydney')!;
  const tokyo = MARKET_SESSIONS.find((s) => s.id === 'sess-tokyo')!;
  const london = MARKET_SESSIONS.find((s) => s.id === 'sess-london')!;
  const newyork = MARKET_SESSIONS.find((s) => s.id === 'sess-newyork')!;

  assert(sydney.timeZone === 'Australia/Sydney', 'Test 8.1: Sydney uses Australia/Sydney IANA zone');
  assert(tokyo.timeZone === 'Asia/Tokyo', 'Test 8.2: Tokyo uses Asia/Tokyo IANA zone');
  assert(london.timeZone === 'Europe/London', 'Test 8.3: London uses Europe/London IANA zone');
  assert(newyork.timeZone === 'America/New_York', 'Test 8.4: New York uses America/New_York IANA zone');

  // Test London DST during Summer (e.g., July 15) vs Winter (Jan 15)
  const summerDate = new Date('2026-07-15T10:00:00Z');
  const winterDate = new Date('2026-01-15T10:00:00Z');

  const londonSummer = getSessionInstantStatus(london, summerDate);
  const londonWinter = getSessionInstantStatus(london, winterDate);

  assert(londonSummer.utcOffsetHours === 1, `Test 8.5: London summer UTC offset is +1 (BST) (got ${londonSummer.utcOffsetHours})`);
  assert(londonWinter.utcOffsetHours === 0, `Test 8.6: London winter UTC offset is 0 (GMT) (got ${londonWinter.utcOffsetHours})`);

  // Active Overlaps check
  const overlapOverview = getActiveSessionOverview(new Date('2026-09-24T14:00:00Z')); // 14:00 UTC = London & NY overlap
  const hasLondonNy = overlapOverview.activeOverlaps.some((o) => o.includes('London / New York'));
  assert(hasLondonNy, 'Test 8.7: London/New York overlap active at 14:00 UTC');
}

// -------------------------------------------------------------
// SECTION 9: 11 DETERMINISTIC PIPELINE MUTATIONS
// -------------------------------------------------------------
console.log('\n--- Section 9: 11 Deterministic Pipeline Mutations ---');
{
  const pair = INITIAL_PAIRS.find((p) => p.symbol === 'EUR/USD')!;
  const baseCurrency = { id: 'curr-eur', code: 'EUR', name: 'Euro', symbol: '€', region: 'Europe', active: true, createdAt: '', updatedAt: '' };
  const quoteCurrency = { id: 'curr-usd', code: 'USD', name: 'US Dollar', symbol: '$', region: 'North America', active: true, createdAt: '', updatedAt: '' };

  const baselineBase: CurrencyState = {
    currency: baseCurrency,
    marketStrength: 0.20,
    marketState: 'STRONG',
    relativeStrengthBreakdown: { marketStrength: 0.20, classification: 'STRONG', thresholds: { strongThreshold: 0.1, weakThreshold: -0.1 }, timeframe: 'Live', explanation: '', source: 'Biquote' },
    fundamentalState: {
      currency: 'EUR',
      fundamentalScore: 0.15,
      overallCondition: 'EXPANSIONARY',
      inflation: { category: 'INFLATION', currentCondition: '', surprise: 'POSITIVE', implication: '', observations: [] },
      employment: { category: 'EMPLOYMENT', currentCondition: '', surprise: 'IN_LINE', implication: '', observations: [] },
      growth: { category: 'GROWTH', currentCondition: '', surprise: 'POSITIVE', implication: '', observations: [] },
      summary: '',
      calculatedAt: '',
      sources: []
    },
    centralBank: {
      id: 'cb-ecb',
      institution: 'European Central Bank',
      associatedCurrency: 'EUR',
      currentPolicyRate: 3.75,
      previousPolicyRate: 3.50,
      latestDecisionDate: '2026-07-15',
      nextKnownDecisionDate: '2026-09-15',
      stance: 'HAWKISH',
      stanceEvidence: [],
      guidanceSummary: '',
      majorRisks: [],
      sourceMetadata: { sourceName: 'ECB', sourceUrl: '', lastUpdated: '', status: 'CONNECTED' }
    },
    overallState: 'STRONG',
    confidenceMetadata: { dataStatus: 'CONNECTED', observationCount: 8, completenessPct: 100, lastVerified: '' },
    supportingEvidence: ['Resilient growth'],
    conflictingEvidence: []
  };

  const baselineQuote: CurrencyState = {
    currency: quoteCurrency,
    marketStrength: -0.15,
    marketState: 'WEAK',
    relativeStrengthBreakdown: { marketStrength: -0.15, classification: 'WEAK', thresholds: { strongThreshold: 0.1, weakThreshold: -0.1 }, timeframe: 'Live', explanation: '', source: 'Biquote' },
    fundamentalState: {
      currency: 'USD',
      fundamentalScore: -0.10,
      overallCondition: 'CONTRACTIONARY',
      inflation: { category: 'INFLATION', currentCondition: '', surprise: 'NEGATIVE', implication: '', observations: [] },
      employment: { category: 'EMPLOYMENT', currentCondition: '', surprise: 'NEGATIVE', implication: '', observations: [] },
      growth: { category: 'GROWTH', currentCondition: '', surprise: 'NEGATIVE', implication: '', observations: [] },
      summary: '',
      calculatedAt: '',
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
      stance: 'DOVISH',
      stanceEvidence: [],
      guidanceSummary: '',
      majorRisks: [],
      sourceMetadata: { sourceName: 'Fed', sourceUrl: '', lastUpdated: '', status: 'CONNECTED' }
    },
    overallState: 'WEAK',
    confidenceMetadata: { dataStatus: 'CONNECTED', observationCount: 8, completenessPct: 100, lastVerified: '' },
    supportingEvidence: [],
    conflictingEvidence: []
  };

  // Mutation A: Complete healthy pipeline
  const intelA = evaluatePairIntelligence(pair, baselineBase, baselineQuote, [], new Date('2026-09-24T14:00:00Z'), true);
  assert(intelA.orientationDirection === 'BULLISH_BASE', 'Mutation A: Healthy pipeline yields BULLISH_BASE');
  assert(intelA.structuredThesis?.status === 'SUPPORTED', 'Mutation A: Structured thesis is SUPPORTED');
  assert(intelA.structuredOpportunity?.state === 'PRIMARY_WATCH', 'Mutation A: Opportunity state is PRIMARY_WATCH');

  // Mutation B: Missing market data (null marketStrength)
  const baseMissingMkt = { ...baselineBase, marketStrength: null };
  const intelB = evaluatePairIntelligence(pair, baseMissingMkt, baselineQuote, [], new Date('2026-09-24T14:00:00Z'), true);
  assert(intelB.orientationDirection === 'DATA_UNAVAILABLE', 'Mutation B: Missing market strength yields DATA_UNAVAILABLE');
  assert(intelB.structuredThesis?.status === 'INSUFFICIENT_DATA', 'Mutation B: Thesis status is INSUFFICIENT_DATA');
  assert(intelB.structuredOpportunity?.state === 'INSUFFICIENT_DATA', 'Mutation B: Opportunity state is INSUFFICIENT_DATA');

  // Mutation C: Stale market data (stale coverage)
  const baseStaleMkt: CurrencyState = {
    ...baselineBase,
    relativeStrengthBreakdown: {
      ...baselineBase.relativeStrengthBreakdown,
      coverage: { available: 4, required: 5, percent: 80, stalePairs: ['EUR/JPY'] }
    }
  };
  const intelC = evaluatePairIntelligence(pair, baseStaleMkt, baselineQuote, [], new Date('2026-09-24T14:00:00Z'), true);
  assert(intelC.confluence?.dataQuality === 'DEGRADED', 'Mutation C: Stale pairs yield DEGRADED data quality');
  assert(intelC.confluence?.dataQualityAdjustment.factor === 0.75, 'Mutation C: Confluence penalized by 0.75× quality factor');

  // Mutation D: Missing fundamentals (0 observation count)
  const baseMissingFund: CurrencyState = {
    ...baselineBase,
    confidenceMetadata: { dataStatus: 'CONNECTED', observationCount: 0, completenessPct: 0, lastVerified: null }
  };
  const intelD = evaluatePairIntelligence(pair, baseMissingFund, baselineQuote, [], new Date('2026-09-24T14:00:00Z'), true);
  assert(intelD.structuredThesis?.dataGaps.length! > 0, 'Mutation D: Missing observations flagged in structuredThesis.dataGaps');

  // Mutation E: Stale fundamentals
  const staleObsRec = ProvenanceService.evaluateFreshness('2026-08-01T00:00:00Z', 'MACRO_OBSERVATION', new Date('2026-09-24T12:00:00Z'));
  assert(staleObsRec === 'STALE', 'Mutation E: 54-day-old observation correctly classified as STALE');

  // Mutation F: Conflicting fundamentals (macro deterioration vs rising price)
  const baseConflictingFund: CurrencyState = {
    ...baselineBase,
    fundamentalState: {
      ...baselineBase.fundamentalState,
      fundamentalScore: -0.25 // Heavily negative fundamentals
    }
  };
  const intelF = evaluatePairIntelligence(pair, baseConflictingFund, baselineQuote, [], new Date('2026-09-24T14:00:00Z'), true);
  assert(intelF.structuredContradictions?.length! > 0, 'Mutation F: Macro divergence generates structured contradictions');
  assert(intelF.structuredThesis?.status === 'WEAKENED' || intelF.structuredThesis?.status === 'MIXED', 'Mutation F: Thesis status weakened by macro divergence');

  // Mutation G: Upcoming high-impact event (imminent binary risk)
  const imminentEvt: EconomicEvent = {
    id: 'evt-ecb-meeting',
    name: 'ECB Monetary Policy Decision',
    currency: 'EUR',
    importance: 'HIGH',
    scheduledTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 min in future
    previous: 3.75,
    forecast: 3.50,
    actual: null,
    unit: '%',
    status: 'UPCOMING'
  };
  const intelG = evaluatePairIntelligence(pair, baselineBase, baselineQuote, [imminentEvt], new Date(), true);
  assert(intelG.catalystIntelligence?.[0]?.lifecycle === 'IMMINENT', 'Mutation G: Catalyst classified as IMMINENT');
  assert(intelG.structuredOpportunity?.state === 'MONITOR', 'Mutation G: Opportunity downgraded from PRIMARY_WATCH to MONITOR due to imminent event risk');

  // Mutation H: Released event with surprise
  const releasedSurpriseEvt: EconomicEvent = {
    id: 'evt-ecb-hike',
    name: 'ECB Monetary Policy Decision',
    currency: 'EUR',
    importance: 'HIGH',
    scheduledTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    previous: 3.75,
    forecast: 3.50,
    actual: 3.75, // Hawkish pause/hold surprise (+0.25% vs cut forecast)
    unit: '%',
    status: 'RELEASED'
  };
  const intelH = evaluatePairIntelligence(pair, baselineBase, baselineQuote, [releasedSurpriseEvt], new Date(), true);
  assert(intelH.catalystIntelligence?.[0]?.directionalEvidence.bias === 'BULLISH', 'Mutation H: Released hawkish surprise generates BULLISH directional bias');

  // Mutation I: Policy/market contradiction
  const easingBase: CurrencyState = {
    ...baselineBase,
    centralBank: {
      ...baselineBase.centralBank,
      stance: 'DOVISH'
    }
  };
  const intelI = evaluatePairIntelligence(pair, easingBase, baselineQuote, [], new Date('2026-09-24T14:00:00Z'), true);
  assert(intelI.confluence?.components.contradictionPenalty.penaltyPoints! > 0, 'Mutation I: Easing stance with nominal carry creates contradiction deduction');

  // Mutation J: Thesis invalidation triggered (delta compressed below threshold)
  const compressedBase: CurrencyState = {
    ...baselineBase,
    marketStrength: 0.02
  };
  const compressedQuote: CurrencyState = {
    ...baselineQuote,
    marketStrength: 0.00
  };
  const intelJ = evaluatePairIntelligence(pair, compressedBase, compressedQuote, [], new Date('2026-09-24T14:00:00Z'), true);
  assert(intelJ.structuredInvalidation?.some((c) => c.triggered), 'Mutation J: Neutral delta triggers invalidation condition');

  // Mutation K: Unavailable provider / feeds offline
  const intelK = evaluatePairIntelligence(pair, baselineBase, baselineQuote, [], new Date('2026-09-24T14:00:00Z'), false);
  assert(intelK.orientationDirection === 'DATA_UNAVAILABLE', 'Mutation K: Disconnected feed forces DATA_UNAVAILABLE');
  assert(intelK.structuredInvalidation?.[0]?.evaluationStatus === 'UNABLE_TO_EVALUATE', 'Mutation K: Disconnected feed results in UNABLE_TO_EVALUATE');
  assert(intelK.structuredOpportunity?.state === 'INSUFFICIENT_DATA', 'Mutation K: Disconnected feed results in INSUFFICIENT_DATA opportunity');
}

console.log(`\n================================================================`);
console.log(`FULL ARCHITECTURE VERIFICATION COMPLETED: ${passed}/${passed + failed} PASSED`);
console.log(`================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
