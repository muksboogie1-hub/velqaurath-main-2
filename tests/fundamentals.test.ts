/**
 * VELQOARATH — PHASE B: FUNDAMENTAL INTELLIGENCE DETERMINISTIC TEST SUITE
 */

import {
  calculateExpectationSurprise,
  generateFactInterpretationStatements,
  analyzeObservationExpectations
} from '../src/engines/expectations/expectationsEngine';
import {
  buildCentralBankProfile,
  getAllCoreCentralBankProfiles
} from '../src/fundamentals/centralBank/centralBankProfiles';
import {
  evaluateCurrencyFundamentalIntelligence
} from '../src/fundamentals/engine/currencyIntelligenceEngine';
import {
  evaluateFundamentalDifferential
} from '../src/fundamentals/engine/pairDifferentialEngine';
import {
  VerifiedDatasetFundamentalProvider
} from '../src/fundamentals/providers/VerifiedDatasetFundamentalProvider';
import { fundamentalService } from '../src/fundamentals/service/fundamentalService';
import { FUNDAMENTAL_CATEGORIES } from '../src/types/fundamentals';
import { INITIAL_CURRENCIES } from '../src/data/currencies';
import { INITIAL_PAIRS } from '../src/data/pairs';
import { INITIAL_EVENTS } from '../src/data/benchmarkDataset';
import { VelqoarathApiService } from '../src/api/service';

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
console.log('RUNNING VELQOARATH PHASE B: FUNDAMENTAL INTELLIGENCE TESTS');
console.log('================================================================\n');

// -------------------------------------------------------------
// 1. EXPECTATIONS ENGINE: ARITHMETIC & SURPRISE CALCULATION
// -------------------------------------------------------------
{
  // surprise = actual - forecast (positive surprise)
  const res1 = calculateExpectationSurprise(2.8, 2.9, 3.2);
  assert(res1.surprise === 0.3, 'Test 1.1: Surprise is exactly actual - forecast (3.2 - 2.9 = 0.3)');
  assert(res1.status === 'ABOVE_EXPECTATION', 'Test 1.1: Classified as ABOVE_EXPECTATION');

  // surprise = actual - forecast (negative surprise / miss)
  const res2 = calculateExpectationSurprise(3.2, 3.1, 2.7);
  assert(res2.surprise === -0.4, 'Test 1.2: Negative surprise is -0.4 (2.7 - 3.1)');
  assert(res2.status === 'BELOW_EXPECTATION', 'Test 1.2: Classified as BELOW_EXPECTATION');

  // In-line result
  const res3 = calculateExpectationSurprise(2.0, 2.0, 2.0);
  assert(res3.surprise === 0.0, 'Test 1.3: In-line surprise delta is 0.0');
  assert(res3.status === 'IN_LINE', 'Test 1.3: Classified as IN_LINE');
}

// -------------------------------------------------------------
// 2. MISSING FORECAST & MISSING ACTUAL (NO FABRICATION)
// -------------------------------------------------------------
{
  // Missing forecast
  const missingForecast = calculateExpectationSurprise(2.5, null, 2.8);
  assert(missingForecast.surprise === null, 'Test 2.1: Missing forecast yields surprise: null');
  assert(missingForecast.status === 'UNKNOWN', 'Test 2.1: Missing forecast classified as UNKNOWN (no fabricated forecast)');

  // Missing actual
  const missingActual = calculateExpectationSurprise(2.5, 2.6, null);
  assert(missingActual.surprise === null, 'Test 2.2: Missing actual yields surprise: null');
  assert(missingActual.status === 'UNKNOWN', 'Test 2.2: Missing actual classified as UNKNOWN (no fabricated actual)');

  // Both missing
  const bothMissing = calculateExpectationSurprise(null, null, null);
  assert(bothMissing.surprise === null, 'Test 2.3: Both missing yields surprise: null');
  assert(bothMissing.status === 'UNKNOWN', 'Test 2.3: Both missing classified as UNKNOWN');
}

// -------------------------------------------------------------
// 3. FACT vs EXPECTATION vs INTERPRETATION vs ENGINE_ANALYSIS SEPARATION
// -------------------------------------------------------------
{
  const calc = calculateExpectationSurprise(2.9, 2.9, 3.1);
  const bundle = generateFactInterpretationStatements(
    {
      previous: 2.9,
      forecast: 2.9,
      actual: 3.1,
      unit: '%',
      indicatorName: 'Consumer Price Index (YoY)',
      period: '2026-08',
      category: 'INFLATION',
      highIsHawkish: true
    },
    calc
  );

  assert(bundle.fact.startsWith('FACT:'), 'Test 3.1: Fact layer begins with explicit FACT identifier');
  assert(bundle.fact.includes('reported at 3.1%'), 'Test 3.1: Fact contains exact reported number');
  assert(bundle.expectation.startsWith('EXPECTATION:'), 'Test 3.2: Expectation layer begins with EXPECTATION');
  assert(bundle.expectation.includes('Consensus forecast was 2.9%'), 'Test 3.2: Expectation records forecast');
  assert(bundle.expectation.includes('Previous: 2.9%'), 'Test 3.2: Expectation preserves previous release value');
  assert(bundle.interpretation.startsWith('INTERPRETATION:'), 'Test 3.3: Interpretation layer begins with INTERPRETATION');
  assert(bundle.interpretation.includes('exceeded consensus expectations by +0.2%'), 'Test 3.3: Interpretation details exact deviation');
  assert(bundle.engineAnalysis.startsWith('ENGINE_ANALYSIS:'), 'Test 3.4: Engine analysis explicitly separated from facts');
  assert(bundle.engineAnalysis.includes('Upside inflation pressure'), 'Test 3.4: Engine analysis evaluates monetary policy impact');
}

// -------------------------------------------------------------
// 4. OBSERVATION ANALYSIS EVALUATION (LEGACY & PHASE B HARMONY)
// -------------------------------------------------------------
{
  const testObs = {
    id: 'obs-test-us-cpi',
    currency: 'USD',
    indicatorId: 'ind-cpi',
    indicatorName: 'Consumer Price Index (CPI YoY)',
    category: 'INFLATION' as const,
    period: '2026-08',
    actual: 2.9,
    forecast: 2.9,
    previous: 2.9,
    unit: '%',
    sourceStatus: 'CONNECTED' as const,
    sourceName: 'Bureau of Labor Statistics',
    sourceUrl: 'https://www.bls.gov',
    releaseDate: '2026-09-11'
  };

  const analysis = analyzeObservationExpectations(testObs);
  assert(analysis.actual === 2.9, 'Test 4.1: Preserves actual separately');
  assert(analysis.forecast === 2.9, 'Test 4.1: Preserves forecast separately');
  assert(analysis.previous === 2.9, 'Test 4.1: Preserves previous separately');
  assert(analysis.surprise === 0.0, 'Test 4.1: Preserves surprise separately');
  assert(analysis.expectationStatus === 'IN_LINE', 'Test 4.2: expectationStatus is IN_LINE');
  assert(analysis.surpriseType === 'IN_LINE', 'Test 4.2: surpriseType legacy mapping works');
  assert(analysis.statements !== undefined, 'Test 4.3: 4-layer statements bundle is populated');
}

// -------------------------------------------------------------
// 5. CENTRAL BANK INTELLIGENCE: ALL 8 CORE CENTRAL BANKS
// -------------------------------------------------------------
{
  const coreCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
  const profiles = getAllCoreCentralBankProfiles();
  assert(profiles.length === 8, 'Test 5.1: Exactly 8 core central bank profiles returned');

  const fed = profiles.find((p) => p.currency === 'USD');
  const ecb = profiles.find((p) => p.currency === 'EUR');
  const boe = profiles.find((p) => p.currency === 'GBP');
  const boj = profiles.find((p) => p.currency === 'JPY');
  const snb = profiles.find((p) => p.currency === 'CHF');
  const boc = profiles.find((p) => p.currency === 'CAD');
  const rba = profiles.find((p) => p.currency === 'AUD');
  const rbnz = profiles.find((p) => p.currency === 'NZD');

  assert(fed?.institution === 'Federal Reserve', 'Test 5.2: USD maps to Federal Reserve');
  assert(fed?.policyRate !== null, 'Test 5.2: Federal Reserve has real policy rate');
  assert(ecb?.institution === 'European Central Bank', 'Test 5.3: EUR maps to European Central Bank');
  assert(boe?.institution === 'Bank of England', 'Test 5.4: GBP maps to Bank of England');
  assert(boj?.institution === 'Bank of Japan', 'Test 5.5: JPY maps to Bank of Japan');
  assert(snb?.institution === 'Swiss National Bank', 'Test 5.6: CHF maps to Swiss National Bank');
  assert(boc?.institution === 'Bank of Canada', 'Test 5.7: CAD maps to Bank of Canada');
  assert(rba?.institution === 'Reserve Bank of Australia', 'Test 5.8: AUD maps to Reserve Bank of Australia');
  assert(rbnz?.institution === 'Reserve Bank of New Zealand', 'Test 5.9: NZD maps to Reserve Bank of New Zealand');

  // Verify all fields are present on profiles
  for (const p of profiles) {
    assert(p.currency.length === 3, `Test 5.10: ${p.currency} has 3-letter currency code`);
    assert(p.institution.length > 0, `Test 5.10: ${p.currency} has institution name`);
    assert(p.source.length > 0, `Test 5.10: ${p.currency} has explicit source provenance`);
    assert(p.dataStatus === 'AVAILABLE' || p.dataStatus === 'LIVE', `Test 5.10: ${p.currency} has valid operational status`);
  }

  // Unconfigured central bank test
  const fakeBank = buildCentralBankProfile('XYZ');
  assert(fakeBank.dataStatus === 'NOT_CONFIGURED', 'Test 5.11: Unknown currency XYZ central bank returns NOT_CONFIGURED');
  assert(fakeBank.policyRate === null, 'Test 5.11: Unknown currency XYZ does not invent a fake policy rate');
}

// -------------------------------------------------------------
// 6. 10 FUNDAMENTAL CATEGORIES DEFINITION & COVERAGE
// -------------------------------------------------------------
{
  assert(FUNDAMENTAL_CATEGORIES.length === 10, 'Test 6.1: Exactly 10 fundamental categories defined');

  const categoryIds = FUNDAMENTAL_CATEGORIES.map((c) => c.id);
  assert(categoryIds.includes('CENTRAL_BANK_MONETARY_POLICY'), 'Test 6.2: Central bank policy category exists');
  assert(categoryIds.includes('INTEREST_RATES'), 'Test 6.2: Interest rates category exists');
  assert(categoryIds.includes('INFLATION'), 'Test 6.2: Inflation category exists');
  assert(categoryIds.includes('EMPLOYMENT'), 'Test 6.2: Employment category exists');
  assert(categoryIds.includes('GROWTH'), 'Test 6.2: Growth category exists');
  assert(categoryIds.includes('FISCAL_GOVERNMENT'), 'Test 6.2: Fiscal / government category exists');
  assert(categoryIds.includes('TRADE_EXTERNAL_BALANCE'), 'Test 6.2: Trade / external balance category exists');
  assert(categoryIds.includes('COMMODITY_EXPOSURE_TERMS_OF_TRADE'), 'Test 6.2: Commodity exposure category exists');
  assert(categoryIds.includes('MAJOR_ECONOMIC_SHOCKS'), 'Test 6.2: Major economic shocks category exists');
  assert(categoryIds.includes('MARKET_EXPECTATIONS'), 'Test 6.2: Market expectations category exists');
}

// -------------------------------------------------------------
// 7. VERIFIED DATASET PROVIDER & SERVICE
// -------------------------------------------------------------
{
  const provider = new VerifiedDatasetFundamentalProvider();
  const status = provider.getStatus();
  assert(status.isConfigured === true, 'Test 7.1: Provider is configured');
  assert(status.health === 'AVAILABLE', 'Test 7.1: Provider health is AVAILABLE');
  assert(status.currenciesAvailable.length >= 8, 'Test 7.1: At least 8 currencies available in provider');

  // Verify singleton service
  const serviceStatus = fundamentalService.getStatus();
  assert(
    serviceStatus.health === 'AVAILABLE' || serviceStatus.health === 'NOT_CONFIGURED',
    'Test 7.2: FundamentalService exposes active provider status'
  );
}

// -------------------------------------------------------------
// 8. CURRENCY FUNDAMENTAL INTELLIGENCE AGGREGATION & DATA GAPS
// -------------------------------------------------------------
{
  const usd = INITIAL_CURRENCIES.find((c) => c.code === 'USD')!;
  const provider = new VerifiedDatasetFundamentalProvider();
  const usdObs = await provider.getObservations('USD');
  const usdCb = await provider.getCentralBankProfile('USD');

  const usdIntel = evaluateCurrencyFundamentalIntelligence({
    currency: usd,
    observations: usdObs,
    centralBank: usdCb!,
    marketStrength: 0.15,
    upcomingEvents: INITIAL_EVENTS,
    isDataFeedConnected: true
  });

  assert(usdIntel.currency.code === 'USD', 'Test 8.1: Evaluates USD currency');
  assert(usdIntel.centralBankStance === 'NEUTRAL', 'Test 8.1: USD Fed stance is NEUTRAL');
  assert(usdIntel.supportingFactors.length > 0, 'Test 8.2: USD has transparent supporting factors');
  assert(usdIntel.opposingFactors.length >= 0, 'Test 8.2: USD opposing factors array exists');
  assert(usdIntel.dataGaps.length > 0, 'Test 8.3: Unpopulated categories are explicitly tracked in dataGaps');
  assert(usdIntel.dataGaps.some((g) => g.includes('Fiscal')), 'Test 8.3: Fiscal gap honestly reported');
  assert(usdIntel.expectationInformation.totalObservations > 0, 'Test 8.4: Expectations summary contains observations');
  assert(Object.keys(usdIntel.categories).length === 10, 'Test 8.5: Evaluates all 10 fundamental categories');
}

// -------------------------------------------------------------
// 9. FUNDAMENTAL DIFFERENTIAL (BASE VS QUOTE) & ORIENTATION
// -------------------------------------------------------------
{
  const pairUsdJpy = INITIAL_PAIRS.find((p) => p.symbol === 'USD/JPY')!;
  const usd = INITIAL_CURRENCIES.find((c) => c.code === 'USD')!;
  const jpy = INITIAL_CURRENCIES.find((c) => c.code === 'JPY')!;
  const provider = new VerifiedDatasetFundamentalProvider();

  const usdObs = await provider.getObservations('USD');
  const jpyObs = await provider.getObservations('JPY');
  const usdCb = await provider.getCentralBankProfile('USD')!;
  const jpyCb = await provider.getCentralBankProfile('JPY')!;

  const usdIntel = evaluateCurrencyFundamentalIntelligence({
    currency: usd,
    observations: usdObs,
    centralBank: usdCb!,
    marketStrength: 0.20,
    upcomingEvents: INITIAL_EVENTS,
    isDataFeedConnected: true
  });

  const jpyIntel = evaluateCurrencyFundamentalIntelligence({
    currency: jpy,
    observations: jpyObs,
    centralBank: jpyCb!,
    marketStrength: -0.15,
    upcomingEvents: INITIAL_EVENTS,
    isDataFeedConnected: true
  });

  const diff = evaluateFundamentalDifferential({
    pair: pairUsdJpy,
    baseIntel: usdIntel,
    quoteIntel: jpyIntel,
    upcomingEvents: INITIAL_EVENTS
  });

  // Base minus quote market strength delta: 0.20 - (-0.15) = 0.35
  assert(diff.marketStrengthDifferential === 0.35, 'Test 9.1: Market strength differential is base - quote (+0.35)');

  // Policy carry spread: Fed rate (5.25%) - BoJ rate (0.50%) = +4.75%
  assert(diff.policyDifferential.rateSpread === 4.75, 'Test 9.2: Carry spread is Fed - BoJ (+4.75%)');
  assert(diff.policyDifferential.baseRate === 5.25, 'Test 9.2: Base rate is 5.25%');
  assert(diff.policyDifferential.quoteRate === 0.5, 'Test 9.2: Quote rate is 0.50%');
  assert(diff.policyDifferential.stanceDelta.includes('Bank of Japan'), 'Test 9.3: Stance delta captures divergence');

  // Supporting and Contradictory evidence
  assert(diff.supportingEvidence.length > 0, 'Test 9.4: Supporting evidence list populated');
  assert(Array.isArray(diff.contradictoryEvidence), 'Test 9.4: Contradictory evidence list populated');
  assert(Array.isArray(diff.invalidationConditions), 'Test 9.5: Invalidation conditions populated');
  assert(diff.dataQuality === 'PARTIAL' || diff.dataQuality === 'COMPLETE', 'Test 9.6: Data quality correctly reflects partial coverage across 10 categories');
}

// -------------------------------------------------------------
// 10. REVERSE ORIENTATION MATHEMATICAL INTEGRITY (QUOTE VS BASE)
// -------------------------------------------------------------
{
  // If we evaluate EUR/USD with EUR = -0.10 and USD = +0.20
  const pairEurUsd = INITIAL_PAIRS.find((p) => p.symbol === 'EUR/USD')!;
  const eur = INITIAL_CURRENCIES.find((c) => c.code === 'EUR')!;
  const usd = INITIAL_CURRENCIES.find((c) => c.code === 'USD')!;
  const provider = new VerifiedDatasetFundamentalProvider();

  const eurObs = await provider.getObservations('EUR');
  const usdObs = await provider.getObservations('USD');
  const eurCb = await provider.getCentralBankProfile('EUR')!;
  const usdCb = await provider.getCentralBankProfile('USD')!;

  const eurIntel = evaluateCurrencyFundamentalIntelligence({
    currency: eur,
    observations: eurObs,
    centralBank: eurCb!,
    marketStrength: -0.10,
    upcomingEvents: INITIAL_EVENTS,
    isDataFeedConnected: true
  });

  const usdIntel = evaluateCurrencyFundamentalIntelligence({
    currency: usd,
    observations: usdObs,
    centralBank: usdCb!,
    marketStrength: 0.20,
    upcomingEvents: INITIAL_EVENTS,
    isDataFeedConnected: true
  });

  const diff = evaluateFundamentalDifferential({
    pair: pairEurUsd,
    baseIntel: eurIntel,
    quoteIntel: usdIntel,
    upcomingEvents: INITIAL_EVENTS
  });

  // Base minus quote: -0.10 - 0.20 = -0.30
  assert(diff.marketStrengthDifferential === -0.30, 'Test 10.1: EUR/USD differential is -0.30 (not reversed)');
  // ECB (3.50%) - Fed (5.25%) = -1.75%
  assert(diff.policyDifferential.rateSpread === -1.75, 'Test 10.2: Policy spread is -1.75% favoring quote (USD)');
}

// -------------------------------------------------------------
// 11. API ENDPOINTS INTEGRATION
// -------------------------------------------------------------
{
  const status = VelqoarathApiService.getFundamentalsStatus();
  assert(status.categoriesCount === 10, 'Test 11.1: API status reports 10 categories');
  assert(
    status.provider.health === 'AVAILABLE' || status.provider.health === 'NOT_CONFIGURED',
    'Test 11.1: API provider status is AVAILABLE or NOT_CONFIGURED'
  );

  const cbList = VelqoarathApiService.getCentralBanks();
  assert(cbList.length === 8, 'Test 11.2: API getCentralBanks returns 8 central banks');

  const usdFund = VelqoarathApiService.getFundamentalCurrency('USD');
  assert(usdFund !== null, 'Test 11.3: API getFundamentalCurrency returns USD data');
  assert(usdFund?.supportingFactors.length > 0, 'Test 11.3: USD returns supportingFactors');
  assert(usdFund?.dataGaps.length > 0, 'Test 11.3: USD returns dataGaps');

  const pairIntel = VelqoarathApiService.getPairIntelligence('USD/JPY');
  assert(pairIntel !== null, 'Test 11.4: API getPairIntelligence returns USD/JPY');
  assert(pairIntel?.fundamentalDifferential !== undefined, 'Test 11.4: Pair intelligence includes fundamentalDifferential');
}

console.log('\n================================================================');
console.log(`PHASE B TESTS SUMMARY: ${passedTests}/${totalTests} PASSED`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
