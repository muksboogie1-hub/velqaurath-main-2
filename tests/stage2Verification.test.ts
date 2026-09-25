/**
 * VELQOARATH — STAGE 2 COMPREHENSIVE VERIFICATION TEST SUITE
 *
 * Verifies all Stage 2 requirements:
 * 1. Currency Intelligence Engine (8 currencies, threshold boundaries, 10 macro dimensions, evidence model)
 * 2. Fundamental Evidence Model (Fact, Expectation, Interpretation, Engine Analysis, genuine surprises)
 * 3. Central Bank Intelligence (8 banks, explicit provenance: LIVE/REFERENCE/STATIC/UNAVAILABLE)
 * 4. Pair Intelligence & 15 Canonical Pairs (all required properties exposed, detailed orientation)
 * 5. Structured Contradictions Engine (severity, statement A/B comparison, affected components)
 * 6. Opportunity Engine (6 setup classifications, watch reasons, invalidation rules)
 * 7. Session Intelligence & Provenance
 */

import { strict as assert } from 'assert';
import { INITIAL_CURRENCIES } from '../src/data/currencies';
import { INITIAL_PAIRS } from '../src/data/pairs';
import { buildCentralBankProfile, getAllCoreCentralBankProfiles } from '../src/fundamentals/centralBank/centralBankProfiles';
import { evaluateCurrencyFundamentalIntelligence } from '../src/fundamentals/engine/currencyIntelligenceEngine';
import { evaluatePairIntelligence } from '../src/engines/pair/pairEngine';
import { evaluateStructuredContradictions } from '../src/engines/contradiction/contradictionEngine';
import { evaluatePairOpportunity, evaluateAllOpportunities } from '../src/engines/opportunity/opportunityEngine';
import { analyzeObservationExpectations } from '../src/engines/expectations/expectationsEngine';
import { TARGET_MACRO_DIMENSIONS, FUNDAMENTAL_CATEGORIES } from '../src/types/fundamentals';
import { CurrencyState, PairIntelligence } from '../src/types';
import { VelqoarathApiService } from '../src/api/service';

console.log('================================================================');
console.log('RUNNING VELQOARATH STAGE 2: COMPLETE INTELLIGENCE VERIFICATION');
console.log('================================================================\n');

// -------------------------------------------------------------
// 1. CANONICAL 8 CURRENCIES & THRESHOLD COMPLIANCE
// -------------------------------------------------------------
console.log('--- 1. Canonical 8 Currencies & Threshold Verification ---');
const expectedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
const actualCurrencyCodes = INITIAL_CURRENCIES.map((c) => c.code);

assert.equal(actualCurrencyCodes.length, 8, 'Currency universe count must be exactly 8');
for (const code of expectedCurrencies) {
  assert(actualCurrencyCodes.includes(code), `Currency ${code} must be in the canonical universe`);
}
console.log('✅ PASS: Exactly 8 canonical currencies present (USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD)');

// Verify threshold boundary compliance: >= +0.10% STRONG, <= -0.10% WEAK, between NEUTRAL
const usd = INITIAL_CURRENCIES.find((c) => c.code === 'USD')!;

const strongIntel = evaluateCurrencyFundamentalIntelligence({
  currency: usd,
  observations: [],
  marketStrength: 0.10
});
assert.equal(strongIntel.classification, 'STRONG', 'Threshold: +0.10% must be STRONG');

const neutralUpperIntel = evaluateCurrencyFundamentalIntelligence({
  currency: usd,
  observations: [],
  marketStrength: 0.09
});
assert.equal(neutralUpperIntel.classification, 'NEUTRAL', 'Threshold: +0.09% must be NEUTRAL');

const neutralZeroIntel = evaluateCurrencyFundamentalIntelligence({
  currency: usd,
  observations: [],
  marketStrength: 0.00
});
assert.equal(neutralZeroIntel.classification, 'NEUTRAL', 'Threshold: 0.00% must be NEUTRAL');

const neutralLowerIntel = evaluateCurrencyFundamentalIntelligence({
  currency: usd,
  observations: [],
  marketStrength: -0.09
});
assert.equal(neutralLowerIntel.classification, 'NEUTRAL', 'Threshold: -0.09% must be NEUTRAL');

const weakIntel = evaluateCurrencyFundamentalIntelligence({
  currency: usd,
  observations: [],
  marketStrength: -0.10
});
assert.equal(weakIntel.classification, 'WEAK', 'Threshold: -0.10% must be WEAK');
console.log('✅ PASS: Exact market strength classification thresholds strictly enforced');

// -------------------------------------------------------------
// 2. 10 MACRO DIMENSIONS & NON-FABRICATION
// -------------------------------------------------------------
console.log('\n--- 2. 10 Macro Dimensions & Strict Non-Fabrication ---');
assert.equal(TARGET_MACRO_DIMENSIONS.length, 10, 'Target macro dimensions count must be 10');
assert(TARGET_MACRO_DIMENSIONS.includes('INFLATION'), 'Dimension: INFLATION present');
assert(TARGET_MACRO_DIMENSIONS.includes('EMPLOYMENT'), 'Dimension: EMPLOYMENT present');
assert(TARGET_MACRO_DIMENSIONS.includes('GROWTH'), 'Dimension: GROWTH present');
assert(TARGET_MACRO_DIMENSIONS.includes('TRADE'), 'Dimension: TRADE present');
assert(TARGET_MACRO_DIMENSIONS.includes('FISCAL'), 'Dimension: FISCAL present');
assert(TARGET_MACRO_DIMENSIONS.includes('HOUSING'), 'Dimension: HOUSING present');
assert(TARGET_MACRO_DIMENSIONS.includes('CONSUMPTION'), 'Dimension: CONSUMPTION present');
assert(TARGET_MACRO_DIMENSIONS.includes('BUSINESS_ACTIVITY'), 'Dimension: BUSINESS_ACTIVITY present');
assert(TARGET_MACRO_DIMENSIONS.includes('CENTRAL_BANK'), 'Dimension: CENTRAL_BANK present');
assert(TARGET_MACRO_DIMENSIONS.includes('MARKET_EXPECTATIONS'), 'Dimension: MARKET_EXPECTATIONS present');
console.log('✅ PASS: All 10 canonical target macro dimensions defined');

// Verify unpopulated categories are marked NOT_CONFIGURED or UNAVAILABLE, NEVER fabricated
const emptyIntel = evaluateCurrencyFundamentalIntelligence({
  currency: usd,
  observations: [],
  marketStrength: 0.15
});

assert(emptyIntel.dataGaps.length > 0, 'Unpopulated indicators must be honestly tracked in dataGaps');
assert(emptyIntel.dataGaps.some((g) => g.includes('Inflation') || g.includes('Fiscal')), 'Inflation/Fiscal gaps disclosed');
console.log('✅ PASS: Missing data categories honestly disclosed as data gaps (zero fabrication)');

// -------------------------------------------------------------
// 3. FUNDAMENTAL EVIDENCE MODEL: FACT VS EXPECTATION VS INTERPRETATION
// -------------------------------------------------------------
console.log('\n--- 3. Fundamental Evidence Model ---');
const sampleObs = {
  id: 'obs-cpi-us',
  indicatorId: 'ind-cpi-us',
  indicatorName: 'Consumer Price Index (YoY)',
  currency: 'USD',
  category: 'INFLATION' as const,
  actual: 3.2,
  forecast: 2.9,
  previous: 3.0,
  unit: '%',
  period: 'Jul 2026',
  releaseDate: '2026-08-12T12:30:00Z',
  sourceName: 'Bureau of Labor Statistics',
  sourceUrl: 'https://www.bls.gov/cpi',
  sourceStatus: 'CONNECTED' as const
};

const analysis = analyzeObservationExpectations(sampleObs);
assert.equal(analysis.actual, 3.2, 'Fact preserved accurately');
assert.equal(analysis.forecast, 2.9, 'Expectation preserved accurately');
assert.equal(analysis.surprise, 0.3, 'Surprise is exactly actual - forecast (3.2 - 2.9 = 0.3)');
assert.equal(analysis.expectationStatus, 'ABOVE_EXPECTATION', 'Expectation status is ABOVE_EXPECTATION');
assert(analysis.statements.fact.startsWith('FACT:'), 'Fact layer starts with FACT');
assert(analysis.statements.expectation.startsWith('EXPECTATION:'), 'Expectation layer starts with EXPECTATION');
assert(analysis.statements.interpretation.startsWith('INTERPRETATION:'), 'Interpretation layer starts with INTERPRETATION');
assert(analysis.statements.engineAnalysis.startsWith('ENGINE_ANALYSIS:'), 'Engine analysis layer starts with ENGINE_ANALYSIS');

// Verify missing forecast does NOT manufacture a surprise
const missingForecastObs = {
  ...sampleObs,
  id: 'obs-cpi-nofor',
  forecast: null
};
const analysisNoForecast = analyzeObservationExpectations(missingForecastObs);
assert.equal(analysisNoForecast.surprise, null, 'When forecast is missing, surprise must be null');
assert.equal(analysisNoForecast.expectationStatus, 'UNKNOWN', 'When forecast is missing, status must be UNKNOWN');
console.log('✅ PASS: 4-layer evidence model strictly distinguishes FACT, EXPECTATION, INTERPRETATION, and ENGINE_ANALYSIS');

// -------------------------------------------------------------
// 4. CENTRAL BANK INTELLIGENCE (8 CORE BANKS & EXPLICIT PROVENANCE)
// -------------------------------------------------------------
console.log('\n--- 4. Central Bank Intelligence ---');
const allBanks = getAllCoreCentralBankProfiles();
assert.equal(allBanks.length, 8, 'Central bank architecture must contain exactly 8 banks');

const bankNames = allBanks.map((b) => b.institution);
assert(bankNames.includes('Federal Reserve'), 'Federal Reserve present');
assert(bankNames.includes('European Central Bank'), 'European Central Bank present');
assert(bankNames.includes('Bank of England'), 'Bank of England present');
assert(bankNames.includes('Bank of Japan'), 'Bank of Japan present');
assert(bankNames.includes('Swiss National Bank'), 'Swiss National Bank present');
assert(bankNames.includes('Bank of Canada'), 'Bank of Canada present');
assert(bankNames.includes('Reserve Bank of Australia'), 'Reserve Bank of Australia present');
assert(bankNames.includes('Reserve Bank of New Zealand'), 'Reserve Bank of New Zealand present');

for (const b of allBanks) {
  assert(b.currency, `Bank ${b.institution} must have currency`);
  assert(b.stance, `Bank ${b.institution} must have policy stance`);
  assert(b.policyDirection, `Bank ${b.institution} must have policy direction`);
  assert(
    b.sourceType === 'LIVE' || b.sourceType === 'REFERENCE' || b.sourceType === 'STATIC' || b.sourceType === 'UNAVAILABLE',
    `Bank ${b.institution} sourceType (${b.sourceType}) must distinguish LIVE, REFERENCE, STATIC, UNAVAILABLE`
  );
}
console.log('✅ PASS: Exactly 8 central banks profiled with explicit provenance (LIVE, REFERENCE, STATIC, UNAVAILABLE)');

// -------------------------------------------------------------
// 5. CANONICAL 15-PAIR UNIVERSE & PAIR INTELLIGENCE
// -------------------------------------------------------------
console.log('\n--- 5. Canonical 15-Pair Universe & Pair Intelligence ---');
assert.equal(INITIAL_PAIRS.length, 15, 'Canonical pair universe must be exactly 15 pairs');

const eur = INITIAL_CURRENCIES.find((c) => c.code === 'EUR')!;
const pairEurusd = INITIAL_PAIRS.find((p) => p.symbol === 'EUR/USD')!;

const eurState: CurrencyState = {
  currency: eur,
  marketStrength: 0.25,
  marketState: 'STRONG',
  relativeStrengthBreakdown: { marketStrength: 0.25, classification: 'STRONG', thresholds: { strongThreshold: 0.1, weakThreshold: -0.1 }, timeframe: 'Live', explanation: '', source: 'Biquote' },
  fundamentalState: {
    currency: 'EUR',
    fundamentalScore: 0.12,
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
    stanceEvidence: ['Inflation pressures remain above target'],
    guidanceSummary: '',
    majorRisks: [],
    sourceMetadata: { sourceName: 'ECB', sourceUrl: '', lastUpdated: '', status: 'CONNECTED' }
  },
  overallState: 'STRONG',
  confidenceMetadata: { dataStatus: 'CONNECTED', observationCount: 6, completenessPct: 100, lastVerified: '' },
  supportingEvidence: ['Solid GDP growth', 'Resilient labor market'],
  conflictingEvidence: []
};

const usdState: CurrencyState = {
  currency: usd,
  marketStrength: -0.15,
  marketState: 'WEAK',
  relativeStrengthBreakdown: { marketStrength: -0.15, classification: 'WEAK', thresholds: { strongThreshold: 0.1, weakThreshold: -0.1 }, timeframe: 'Live', explanation: '', source: 'Biquote' },
  fundamentalState: {
    currency: 'USD',
    fundamentalScore: -0.08,
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
    stanceEvidence: ['Labor market cooling allows rate cuts'],
    guidanceSummary: '',
    majorRisks: [],
    sourceMetadata: { sourceName: 'Fed', sourceUrl: '', lastUpdated: '', status: 'CONNECTED' }
  },
  overallState: 'WEAK',
  confidenceMetadata: { dataStatus: 'CONNECTED', observationCount: 6, completenessPct: 100, lastVerified: '' },
  supportingEvidence: [],
  conflictingEvidence: ['Subdued employment growth']
};

const pairIntel = evaluatePairIntelligence(pairEurusd, eurState, usdState, [], new Date('2026-09-24T14:00:00Z'), true);

// Verify all required properties on PairIntelligence
assert.equal(pairIntel.symbol, 'EUR/USD', 'Exposes symbol');
assert.equal(pairIntel.baseCurrency.code, 'EUR', 'Exposes baseCurrency');
assert.equal(pairIntel.quoteCurrency.code, 'USD', 'Exposes quoteCurrency');
assert.equal(pairIntel.baseMarketStrength, 0.25, 'Exposes baseMarketStrength');
assert.equal(pairIntel.quoteMarketStrength, -0.15, 'Exposes quoteMarketStrength');
assert.equal(pairIntel.marketStrengthDifferential, 0.40, 'Exposes marketStrengthDifferential (+0.40)');
assert(pairIntel.baseFundamentalEvidence !== undefined, 'Exposes baseFundamentalEvidence');
assert(pairIntel.quoteFundamentalEvidence !== undefined, 'Exposes quoteFundamentalEvidence');
assert(pairIntel.fundamentalDifferential !== undefined, 'Exposes fundamentalDifferential');
assert.equal(pairIntel.baseCentralBank.institution, 'European Central Bank', 'Exposes baseCentralBank');
assert.equal(pairIntel.quoteCentralBank.institution, 'Federal Reserve', 'Exposes quoteCentralBank');
assert(pairIntel.policyDifferential !== undefined, 'Exposes policyDifferential');
assert(pairIntel.sessionContext !== undefined, 'Exposes sessionContext');
assert(Array.isArray(pairIntel.catalysts), 'Exposes catalysts');
assert(Array.isArray(pairIntel.supportingEvidence), 'Exposes supportingEvidence');
assert(Array.isArray(pairIntel.opposingEvidence), 'Exposes opposingEvidence');
assert(Array.isArray(pairIntel.contradictions), 'Exposes contradictions');
assert(Array.isArray(pairIntel.risks), 'Exposes risks');
assert(Array.isArray(pairIntel.invalidationConditions), 'Exposes invalidationConditions');
assert(pairIntel.dataQuality, 'Exposes dataQuality');
assert(pairIntel.freshness, 'Exposes freshness');
assert(pairIntel.confluence, 'Exposes confluence');
assert(pairIntel.confidence, 'Exposes confidence');
assert(pairIntel.orientation, 'Exposes detailed orientation');
assert.equal(pairIntel.orientation, 'COMPLETE_CONFLUENCE', 'EUR/USD orientation with aligning strength & fundamentals evaluates to COMPLETE_CONFLUENCE');

console.log('✅ PASS: All required PairIntelligence properties directly exposed and verified');

// -------------------------------------------------------------
// 6. OPPORTUNITY ENGINE & 6 SETUP CLASSIFICATIONS
// -------------------------------------------------------------
console.log('\n--- 6. Opportunity Engine Classifications ---');
const opportunity = evaluatePairOpportunity(pairIntel);

assert.equal(opportunity.pair, 'EUR/USD', 'Exposes pair');
assert.equal(opportunity.state, 'PRIMARY_WATCH', 'Exposes state');
assert.equal(opportunity.opportunityClassification, 'EXPANSION', 'High confluence aligning setup classifies as EXPANSION');
assert.equal(opportunity.directionalBias, 'BULLISH_BASE', 'Directional bias is BULLISH_BASE');
assert(opportunity.confluenceScore >= 70, 'Confluence score is high');
assert(opportunity.whyThisPair.length > 0, 'Exposes whyThisPair');
assert(opportunity.watchReason.length > 0, 'Exposes watchReason');
assert(opportunity.watchFactors.length > 0, 'Exposes watchFactors');
assert(Array.isArray(opportunity.risks), 'Exposes risks');
assert(Array.isArray(opportunity.invalidationRules), 'Exposes invalidationRules');

// Test evaluateAllOpportunities
const allOpps = evaluateAllOpportunities([pairIntel]);
assert.equal(allOpps.length, 1, 'Evaluates all opportunities correctly');
assert.equal(allOpps[0].pair, 'EUR/USD', 'Returns sorted opportunities');
console.log('✅ PASS: Opportunity Engine exposes all required properties and classifies into setup types');

// -------------------------------------------------------------
// 7. STRUCTURED CONTRADICTIONS ENGINE
// -------------------------------------------------------------
console.log('\n--- 7. Structured Contradictions Engine ---');
// Create a contradictory state: USD is strong in market (+0.20%) but fundamentals are severe contraction (-0.25)
const usdContradictoryBase: CurrencyState = {
  ...usdState,
  marketStrength: 0.25,
  marketState: 'STRONG',
  fundamentalState: {
    ...usdState.fundamentalState,
    fundamentalScore: -0.25,
    overallCondition: 'CONTRACTIONARY'
  }
};

const contradictionResult = evaluateStructuredContradictions({
  pair: pairEurusd,
  baseState: usdContradictoryBase,
  quoteState: eurState,
  relativeStrengthDelta: 0.35,
  orientationDirection: 'BULLISH_BASE'
});

assert(contradictionResult.contradictions.length > 0, 'Contradictions detected for divergent market/fundamental signals');
const mktFundContra = contradictionResult.contradictions.find(c => c.category === 'MARKET_VS_FUNDAMENTAL');
assert(mktFundContra, 'MARKET_VS_FUNDAMENTAL contradiction identified');
assert.equal(mktFundContra?.severity, 'HIGH', 'Severity is HIGH');
assert(mktFundContra?.statementA.length > 0, 'Statement A present');
assert(mktFundContra?.statementB.length > 0, 'Statement B present');
assert(mktFundContra?.description.length > 0, 'Description present');
assert(mktFundContra?.affectedComponents.includes('FUNDAMENTALS'), 'Affected components include FUNDAMENTALS');
assert(mktFundContra?.affectedComponents.includes('MARKET_STRENGTH'), 'Affected components include MARKET_STRENGTH');

console.log('✅ PASS: Structured Contradictions Engine correctly detects conflicts with Statement A/B and severity');

// -------------------------------------------------------------
// 8. API SERVICE VERIFICATION
// -------------------------------------------------------------
console.log('\n--- 8. API Service Verification ---');
const currenciesApi = VelqoarathApiService.getCurrencies();
assert.equal(currenciesApi.length, 8, 'API getCurrencies returns 8 currencies');

const pairsApi = VelqoarathApiService.getPairs();
assert.equal(pairsApi.length, 15, 'API getPairs returns 15 pairs');

const centralBanksApi = VelqoarathApiService.getCentralBanks();
assert.equal(centralBanksApi.length, 8, 'API getCentralBanks returns 8 central banks');

const sessionsApi = VelqoarathApiService.getSessions();
assert.equal(sessionsApi.length, 4, 'API getSessions returns 4 market sessions');

const dashboardApi = VelqoarathApiService.getDashboard();
assert(dashboardApi.allCurrencies.length >= 8, 'Dashboard contains 8 currencies');
assert(dashboardApi.marketProviderStatus, 'Dashboard includes marketProviderStatus');
assert(dashboardApi.fundamentalProviderStatus, 'Dashboard includes fundamentalProviderStatus');

console.log('✅ PASS: API service endpoints validated');

console.log('\n================================================================');
console.log('STAGE 2 VERIFICATION SUITE: ALL CHECKS PASSED SUCCESSFULLY!');
console.log('================================================================');
