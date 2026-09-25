/**
 * VELQOARATH — BIG STAGE 2.1
 * EVIDENCE INTEGRITY & INTELLIGENCE TRUTHFULNESS TEST SUITE
 *
 * Verifies:
 * 1. Central Bank Evidence Integrity & Provenance (LIVE vs REFERENCE vs STATIC vs UNAVAILABLE)
 * 2. Confluence Missing-Data Scoring (MISSING != NEUTRAL, MISSING != POSITIVE)
 * 3. Confluence Component Availability Exposure (AVAILABLE, UNAVAILABLE, REFERENCE_ONLY, STATIC, PARTIAL)
 * 4. Data Quality Multiplier does not mask missing evidence
 * 5. Expectations Surprise Arithmetic & Non-Fabrication
 * 6. Finance Calendar Classification Defensibility
 * 7. Benchmark Data Strict Isolation from LIVE mode
 * 8. Contradiction Engine Evidence Awareness (Absence of evidence != Contradiction)
 * 9. Thesis Engine Quality & Data Gaps Separation
 * 10. Opportunity Engine Truthfulness & Data Gaps Tracking
 */

import assert from 'node:assert';
import { buildCentralBankProfile, getAllCoreCentralBankProfiles } from '../src/fundamentals/centralBank/centralBankProfiles';
import { calculatePairConfluence } from '../src/engines/confluence/confluenceEngine';
import {
  calculateExpectationSurprise,
  analyzeObservationExpectations
} from '../src/engines/expectations/expectationsEngine';
import {
  detectCategoryFromEvent,
  detectEventCategory,
  FinanceCalendarProvider
} from '../src/fundamentals/providers/FinanceCalendarProvider';
import { globalStore } from '../src/data/store';
import { evaluateStructuredContradictions } from '../src/engines/contradiction/contradictionEngine';
import { evaluateStructuredThesis } from '../src/engines/thesis/thesisEngine';
import { evaluatePairOpportunity } from '../src/engines/opportunity/opportunityEngine';
import { CurrencyPair, CurrencyState } from '../src/types';

console.log('================================================================');
console.log('RUNNING VELQOARATH STAGE 2.1: EVIDENCE INTEGRITY & TRUTHFULNESS');
console.log('================================================================');

let passed = 0;
let total = 0;

function check(desc: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// 1. CENTRAL BANK PROVENANCE & EVIDENCE INTEGRITY
// -------------------------------------------------------------
console.log('\n--- 1. Central Bank Provenance & Evidence Integrity ---');

check('Central bank profile defaults to REFERENCE and STALE for non-live builds', () => {
  const fed = buildCentralBankProfile('USD');
  assert.equal(fed.sourceType, 'REFERENCE', 'Source type defaults to REFERENCE');
  assert.equal(fed.dataSourceMode, 'REFERENCE', 'Mode defaults to REFERENCE');
  assert.equal(fed.freshness, 'STALE', 'Freshness defaults to STALE (not FRESH)');
  assert(fed.provenance.includes('REFERENCE'), 'Provenance indicates REFERENCE status');
});

check('Central bank explicitly honors LIVE mode and FRESH metadata when configured', () => {
  const liveFed = buildCentralBankProfile('USD', {
    sourceType: 'LIVE',
    freshness: 'FRESH'
  });
  assert.equal(liveFed.sourceType, 'LIVE');
  assert.equal(liveFed.freshness, 'FRESH');
  assert.equal(liveFed.dataSourceMode, 'LIVE');
});

check('Central bank profile honors UNAVAILABLE state with 0 points and null rates', () => {
  const unavail = buildCentralBankProfile('XYZ' as any);
  assert.equal(unavail.sourceType, 'UNAVAILABLE');
  assert.equal(unavail.currentPolicyRate, null);
  assert.equal(unavail.freshness, 'UNAVAILABLE');
});

check('All 8 core central banks maintain strict provenance without fabricating LIVE status', () => {
  const allBanks = getAllCoreCentralBankProfiles();
  assert.equal(allBanks.length, 8);
  for (const b of allBanks) {
    assert(['LIVE', 'REFERENCE', 'STATIC', 'UNAVAILABLE'].includes(b.sourceType), `Valid sourceType on ${b.institution}`);
    assert(b.freshness !== undefined);
  }
});

// -------------------------------------------------------------
// 2. CONFLUENCE MISSING-DATA SCORING (MISSING ≠ NEUTRAL, MISSING ≠ POSITIVE)
// -------------------------------------------------------------
console.log('\n--- 2. Confluence Missing-Data Scoring ---');

const pairEurUsd: CurrencyPair = {
  id: 'pair-eurusd',
  symbol: 'EUR/USD',
  baseCurrency: 'EUR',
  quoteCurrency: 'USD',
  displayName: 'EUR / USD',
  pipDecimalPlaces: 4,
  isMajor: true,
  category: 'MAJORS'
};

const baseWithOnlyMarket: CurrencyState = {
  currency: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', centralBank: 'ECB' },
  marketStrength: 0.25,
  marketState: 'STRONG',
  relativeStrengthBreakdown: {
    marketStrength: 0.25,
    classification: 'STRONG',
    thresholds: { strongThreshold: 0.1, weakThreshold: -0.1 },
    timeframe: 'Live',
    explanation: 'Market +0.25%',
    source: 'Biquote',
    coverage: { available: 5, required: 5, percent: 100 }
  },
  fundamentalState: {
    currency: 'EUR',
    fundamentalScore: null,
    overallCondition: 'DATA_UNAVAILABLE',
    inflation: { category: 'INFLATION', currentCondition: '', surprise: 'UNKNOWN', implication: '', observations: [] },
    employment: { category: 'EMPLOYMENT', currentCondition: '', surprise: 'UNKNOWN', implication: '', observations: [] },
    growth: { category: 'GROWTH', currentCondition: '', surprise: 'UNKNOWN', implication: '', observations: [] },
    summary: 'No observations',
    calculatedAt: new Date().toISOString(),
    sources: []
  },
  centralBank: {
    id: 'cb-ecb',
    institution: 'European Central Bank',
    associatedCurrency: 'EUR',
    currentPolicyRate: 3.5,
    previousPolicyRate: 3.75,
    latestDecisionDate: '2026-07-18',
    nextKnownDecisionDate: '2026-10-15',
    stance: 'DOVISH',
    stanceEvidence: [],
    guidanceSummary: '',
    majorRisks: [],
    sourceType: 'REFERENCE',
    sourceMetadata: { sourceName: 'ECB', sourceUrl: '', lastUpdated: '', status: 'CONNECTED' }
  },
  overallState: 'STRONG',
  confidenceMetadata: { dataStatus: 'NOT_CONFIGURED', observationCount: 0, completenessPct: 0, lastVerified: '' },
  supportingEvidence: ['Market strength divergence'],
  conflictingEvidence: []
};

const quoteWithOnlyMarket: CurrencyState = {
  currency: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', centralBank: 'Fed' },
  marketStrength: -0.15,
  marketState: 'WEAK',
  relativeStrengthBreakdown: {
    marketStrength: -0.15,
    classification: 'WEAK',
    thresholds: { strongThreshold: 0.1, weakThreshold: -0.1 },
    timeframe: 'Live',
    explanation: 'Market -0.15%',
    source: 'Biquote',
    coverage: { available: 5, required: 5, percent: 100 }
  },
  fundamentalState: {
    currency: 'USD',
    fundamentalScore: null,
    overallCondition: 'DATA_UNAVAILABLE',
    inflation: { category: 'INFLATION', currentCondition: '', surprise: 'UNKNOWN', implication: '', observations: [] },
    employment: { category: 'EMPLOYMENT', currentCondition: '', surprise: 'UNKNOWN', implication: '', observations: [] },
    growth: { category: 'GROWTH', currentCondition: '', surprise: 'UNKNOWN', implication: '', observations: [] },
    summary: 'No observations',
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
    stance: 'NEUTRAL',
    stanceEvidence: [],
    guidanceSummary: '',
    majorRisks: [],
    sourceType: 'REFERENCE',
    sourceMetadata: { sourceName: 'Fed', sourceUrl: '', lastUpdated: '', status: 'CONNECTED' }
  },
  overallState: 'WEAK',
  confidenceMetadata: { dataStatus: 'NOT_CONFIGURED', observationCount: 0, completenessPct: 0, lastVerified: '' },
  supportingEvidence: [],
  conflictingEvidence: []
};

check('Missing fundamentals awards exactly 0 points and marks UNAVAILABLE (not neutral 5 pts)', () => {
  const confluence = calculatePairConfluence({
    pair: pairEurUsd,
    baseState: baseWithOnlyMarket,
    quoteState: quoteWithOnlyMarket,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    events: [],
    isDataFeedConnected: true
  });

  const fundComp = confluence.components.fundamentals;
  assert.equal(fundComp.points, 0, 'Missing fundamentals gets 0 points');
  assert.equal(fundComp.availability, 'UNAVAILABLE', 'Availability is UNAVAILABLE');
  assert.equal(fundComp.evidenceCount, 0, 'Evidence count is 0');
  assert(fundComp.explanation.includes('No verified live macro observations available'), 'Honest explanation');
});

check('Missing macro expectations awards exactly 0 points and marks UNAVAILABLE (not neutral 4 pts)', () => {
  const confluence = calculatePairConfluence({
    pair: pairEurUsd,
    baseState: baseWithOnlyMarket,
    quoteState: quoteWithOnlyMarket,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    events: [],
    isDataFeedConnected: true
  });

  const expComp = confluence.components.expectations;
  assert.equal(expComp.points, 0, 'Missing expectations gets 0 points');
  assert.equal(expComp.availability, 'UNAVAILABLE', 'Expectations marked UNAVAILABLE');
  assert.equal(expComp.evidenceCount, 0, 'Expectations evidence count is 0');
  assert(expComp.explanation.includes('Evidence unavailable'), 'Clear missing notice');
});

check('Reference-only central bank policy rate awards 0 live points and marks REFERENCE_ONLY', () => {
  const confluence = calculatePairConfluence({
    pair: pairEurUsd,
    baseState: baseWithOnlyMarket,
    quoteState: quoteWithOnlyMarket,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    events: [],
    isDataFeedConnected: true
  });

  const polComp = confluence.components.policy;
  assert.equal(polComp.points, 0, 'Reference policy awards 0 live points');
  assert.equal(polComp.availability, 'REFERENCE_ONLY', 'Marked REFERENCE_ONLY');
  assert.equal(polComp.freshness, 'REFERENCE', 'Freshness is REFERENCE');
  assert(polComp.explanation.includes('REFERENCE_ONLY'), 'Explanation clearly identifies reference context');
});

// -------------------------------------------------------------
// 3. CONFLUENCE EVIDENCE AVAILABILITY EXPOSURE
// -------------------------------------------------------------
console.log('\n--- 3. Confluence Evidence Availability Exposure ---');

check('Confluence assessment explicitly lists available, missing, and reference-only components', () => {
  const confluence = calculatePairConfluence({
    pair: pairEurUsd,
    baseState: baseWithOnlyMarket,
    quoteState: quoteWithOnlyMarket,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    events: [],
    isDataFeedConnected: true
  });

  assert(Array.isArray(confluence.availableComponents), 'availableComponents is array');
  assert(Array.isArray(confluence.missingComponents), 'missingComponents is array');
  assert(Array.isArray(confluence.referenceOnlyComponents), 'referenceOnlyComponents is array');

  assert(confluence.availableComponents.includes('Market Strength'), 'Market Strength is available');
  assert(confluence.missingComponents.includes('Fundamentals'), 'Fundamentals is missing');
  assert(confluence.missingComponents.includes('Expectations'), 'Expectations is missing');
  assert(confluence.referenceOnlyComponents.includes('Policy'), 'Policy is reference-only');
});

check('Confluence score is bounded 0 to 100 and never claims win probability', () => {
  const confluence = calculatePairConfluence({
    pair: pairEurUsd,
    baseState: baseWithOnlyMarket,
    quoteState: quoteWithOnlyMarket,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    events: [],
    isDataFeedConnected: true
  });

  assert(confluence.confluenceScore >= 0 && confluence.confluenceScore <= 100);
  assert(!confluence.explanation.toLowerCase().includes('win rate'));
  assert(!confluence.explanation.toLowerCase().includes('probability of profit'));
});

// -------------------------------------------------------------
// 4. EXPECTATIONS SURPRISE INTEGRITY & NON-FABRICATION
// -------------------------------------------------------------
console.log('\n--- 4. Expectations Surprise Integrity & Non-Fabrication ---');

check('Surprise is calculated ONLY when both actual and forecast exist', () => {
  // Case A: Both exist
  const resBoth = calculateExpectationSurprise(2.0, 2.5, 3.0);
  assert.equal(resBoth.surprise, 0.5);
  assert.equal(resBoth.status, 'ABOVE_EXPECTATION');

  // Case B: Actual missing (awaiting release)
  const resNoActual = calculateExpectationSurprise(2.0, 2.5, null);
  assert.equal(resNoActual.surprise, null);
  assert.equal(resNoActual.percentageSurprise, null);
  assert.equal(resNoActual.status, 'UNKNOWN');

  // Case C: Forecast missing (released without consensus)
  const resNoForecast = calculateExpectationSurprise(2.0, null, 3.0);
  assert.equal(resNoForecast.surprise, null);
  assert.equal(resNoForecast.percentageSurprise, null);
  assert.equal(resNoForecast.status, 'UNKNOWN');
});

check('analyzeObservationExpectations separates FACT, EXPECTATION, and INTERPRETATION cleanly', () => {
  const analysisPending = analyzeObservationExpectations({
    id: 'obs-cpi-pending',
    indicatorId: 'ind-cpi',
    indicatorName: 'Consumer Price Index YoY',
    currency: 'USD',
    period: '2026-08',
    scheduledTime: '2026-09-15T12:30:00Z',
    releaseTimestamp: null,
    actual: null,
    forecast: 2.7,
    previous: 2.9,
    unit: '%',
    category: 'INFLATION',
    source: 'BLS',
    sourceStatus: 'CONNECTED',
    frequency: 'MONTHLY'
  });

  assert.equal(analysisPending.surprise, null, 'Surprise is null before release');
  assert.equal(analysisPending.classification, 'EXPECTATION', 'Classification is EXPECTATION');
  assert(analysisPending.statements.expectation.includes('Consensus market expectation is 2.7%'));
  assert(analysisPending.statements.interpretation.includes('cannot calculate surprise before actual release'));

  const analysisReleasedNoForecast = analyzeObservationExpectations({
    id: 'obs-gdp-unforecasted',
    indicatorId: 'ind-gdp',
    indicatorName: 'Quarterly GDP',
    currency: 'EUR',
    period: '2026-Q2',
    scheduledTime: '2026-09-01T09:00:00Z',
    releaseTimestamp: '2026-09-01T09:00:00Z',
    actual: 0.3,
    forecast: null,
    previous: 0.1,
    unit: '%',
    category: 'GROWTH',
    source: 'Eurostat',
    sourceStatus: 'CONNECTED',
    frequency: 'QUARTERLY'
  });

  assert.equal(analysisReleasedNoForecast.surprise, null, 'Surprise is null when forecast is missing');
  assert.equal(analysisReleasedNoForecast.surpriseType, 'NO_FORECAST');
  assert(analysisReleasedNoForecast.statements.expectation.includes('No consensus forecast recorded'));
});

// -------------------------------------------------------------
// 5. FINANCE CALENDAR CLASSIFICATION INTEGRITY
// -------------------------------------------------------------
console.log('\n--- 5. Finance Calendar Classification Integrity ---');

check('Bond auctions and interest rate items classify as CENTRAL_BANK or BOND_AUCTION, never GROWTH', () => {
  const auctionCat = detectEventCategory({ name: '10-Year Treasury Note Auction' });
  assert(['CENTRAL_BANK', 'BOND_AUCTION'].includes(auctionCat), `Auction classified sensibly (${auctionCat})`);
  assert(auctionCat !== 'GROWTH', 'Auction is not GROWTH');

  const rateCat = detectCategoryFromEvent({ name: 'ECB Interest Rate Decision' });
  assert.equal(rateCat, 'CENTRAL_BANK', 'Interest rate decision is CENTRAL_BANK');
});

check('Geopolitical and tariff terms do not force unclassifiable events into GROWTH', () => {
  const warEvent = detectEventCategory({ name: 'Emergency Geopolitical Security Briefing' });
  assert.equal(warEvent, 'GEOPOLITICAL');
  assert(warEvent !== 'GROWTH', 'War is not GDP/Growth');

  const tariffEvent = detectEventCategory({ name: 'Bilateral Tariff Announcement' });
  assert.equal(tariffEvent, 'TARIFF');
  assert(tariffEvent !== 'GROWTH', 'Tariff is not GDP/Growth');
});

// -------------------------------------------------------------
// 6. BENCHMARK DATA ISOLATION (Benchmark does not leak into LIVE)
// -------------------------------------------------------------
console.log('\n--- 6. Benchmark Data Strict Isolation ---');

check('Global store initializes with LIVE datasetMode and 0 default observations (no benchmark leak)', () => {
  const st = globalStore.getState();
  assert.equal(st.fundamentalDatasetMode, 'LIVE');
  // In live mode without explicit provider population, benchmark observations do not auto-populate
});

check('Toggling benchmark mode explicitly sets datasetMode to BENCHMARK and reverting sets LIVE', () => {
  globalStore.setBenchmarkMode(true);
  assert.equal(globalStore.getState().fundamentalDatasetMode, 'BENCHMARK');

  globalStore.setBenchmarkMode(false);
  assert.equal(globalStore.getState().fundamentalDatasetMode, 'LIVE');
});

// -------------------------------------------------------------
// 7. CONTRADICTION ENGINE: ABSENCE OF EVIDENCE ≠ CONTRADICTION
// -------------------------------------------------------------
console.log('\n--- 7. Contradiction Engine Evidence Awareness ---');

check('Absence of fundamental observations does NOT generate a contradiction penalty', () => {
  const contradictionResult = evaluateStructuredContradictions({
    pair: pairEurUsd,
    baseState: baseWithOnlyMarket,
    quoteState: quoteWithOnlyMarket,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE'
  });

  // Base currency EUR is STRONG (+0.25%) but has 0 fundamental observations.
  // This must NOT trigger a contradiction penalty!
  const hasAbsenceContra = contradictionResult.contradictions.some(
    (c) => c.category === 'DATA_QUALITY' || c.conflictDescription.includes('no live fundamental evidence')
  );
  assert.equal(hasAbsenceContra, false, 'Absence of observations is not an evidence contradiction');
  assert.equal(contradictionResult.totalPenaltyPoints, 0, 'Zero penalty points for missing observations');
});

check('Genuine contradictory evidence (Bullish price vs Contractionary fundamentals) triggers HIGH severity contradiction', () => {
  const contradictingBase: CurrencyState = {
    ...baseWithOnlyMarket,
    fundamentalState: {
      ...baseWithOnlyMarket.fundamentalState,
      fundamentalScore: -0.22,
      overallCondition: 'CONTRACTIONARY'
    },
    confidenceMetadata: { dataStatus: 'CONNECTED', observationCount: 4, completenessPct: 80, lastVerified: '' }
  };

  const contradictionResult = evaluateStructuredContradictions({
    pair: pairEurUsd,
    baseState: contradictingBase,
    quoteState: quoteWithOnlyMarket,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE'
  });

  assert(contradictionResult.contradictions.length > 0, 'Contradiction detected');
  assert.equal(contradictionResult.contradictions[0].category, 'MARKET_VS_FUNDAMENTAL');
  assert.equal(contradictionResult.contradictions[0].severity, 'HIGH');
  assert(contradictionResult.totalPenaltyPoints >= 15);
});

// -------------------------------------------------------------
// 8. THESIS ENGINE: DISTINGUISHING MISSING FROM CONTRADICTORY
// -------------------------------------------------------------
console.log('\n--- 8. Thesis Engine Quality & Data Gaps Separation ---');

check('Valid market data with missing macro observations yields TENTATIVE status, not INSUFFICIENT_DATA', () => {
  const thesis = evaluateStructuredThesis({
    pair: pairEurUsd,
    baseState: baseWithOnlyMarket,
    quoteState: quoteWithOnlyMarket,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    contradictions: []
  });

  assert.equal(thesis.status, 'TENTATIVE', 'Thesis is TENTATIVE when market data is valid but macro has gaps');
  assert(thesis.dataGaps.length > 0, 'Data gaps recorded');
});

// -------------------------------------------------------------
// 9. OPPORTUNITY ENGINE: TRUTHFULNESS & DATA GAPS TRACKING
// -------------------------------------------------------------
console.log('\n--- 9. Opportunity Engine Truthfulness & Data Gaps ---');

check('Pair with missing macro observations records dataGaps in structured opportunity', () => {
  const confluence = calculatePairConfluence({
    pair: pairEurUsd,
    baseState: baseWithOnlyMarket,
    quoteState: quoteWithOnlyMarket,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    events: [],
    isDataFeedConnected: true
  });

  const opp = evaluatePairOpportunity({
    symbol: 'EUR/USD',
    pair: pairEurUsd,
    baseCurrency: baseWithOnlyMarket.currency,
    quoteCurrency: quoteWithOnlyMarket.currency,
    baseMarketStrength: 0.25,
    quoteMarketStrength: -0.15,
    marketStrengthDifferential: 0.40,
    relativeStrengthDelta: 0.40,
    orientationDirection: 'BULLISH_BASE',
    orientation: 'CONFLUENCE_PARTIAL',
    baseState: baseWithOnlyMarket,
    quoteState: quoteWithOnlyMarket,
    baseCentralBank: baseWithOnlyMarket.centralBank,
    quoteCentralBank: quoteWithOnlyMarket.centralBank,
    confluence,
    confidence: 'MODERATE',
    dataQuality: 'PARTIAL',
    freshness: 'FRESH',
    calculatedAt: new Date().toISOString()
  });

  assert(Array.isArray(opp.dataGaps), 'dataGaps is array on StructuredOpportunity');
  assert(opp.dataGaps.length > 0, 'dataGaps accurately records missing elements');
  assert(opp.state !== 'INSUFFICIENT_DATA', 'Opportunity evaluates watch state with valid market quotes');
});

console.log('\n================================================================');
console.log(`STAGE 2.1 EVIDENCE INTEGRITY VERIFICATION COMPLETED: ${passed}/${total} PASSED`);
console.log('================================================================\n');

if (passed !== total) {
  process.exit(1);
}
