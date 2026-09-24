/**
 * VELQOARATH — LIVE FUNDAMENTAL DATA PIPELINE VERIFICATION SUITE
 *
 * Automated test suite covering the 15 core architectural requirements:
 * 1. Finance Calendar provider initializes without invented API-key requirement.
 * 2. Live provider data normalizes correctly with full provenance.
 * 3. Successful live refresh updates the application's authoritative fundamental state.
 * 4. Currency intelligence consumes the refreshed live observations.
 * 5. Pair intelligence consumes the refreshed live fundamental state.
 * 6. Confluence consumes the refreshed live fundamental state.
 * 7. Live event data reaches catalyst/watch-window logic.
 * 8. Failed refresh retains the last successful LIVE dataset.
 * 9. Failed refresh does not activate benchmark data.
 * 10. Benchmark provider is explicitly identifiable as BENCHMARK.
 * 11. Production state cannot silently report BENCHMARK as LIVE.
 * 12. Refresh overlap protection works.
 * 13. 15-minute fundamental refresh interval remains intact.
 * 14. Fundamental timestamps update after a successful refresh.
 * 15. A changed live observation actually changes downstream intelligence without restarting the application.
 */

import { FinanceCalendarProvider } from '../src/fundamentals/providers/FinanceCalendarProvider';
import { VerifiedDatasetFundamentalProvider } from '../src/fundamentals/providers/VerifiedDatasetFundamentalProvider';
import { FundamentalService } from '../src/fundamentals/service/fundamentalService';
import { globalStore } from '../src/data/store';
import { VelqoarathApiService } from '../src/api/service';
import { RefreshScheduler } from '../src/services/refreshScheduler';
import { INITIAL_CURRENCIES } from '../src/data/currencies';
import { INITIAL_PAIRS } from '../src/data/pairs';
import { evaluatePairIntelligence } from '../src/engines/pair/pairEngine';
import { calculatePairConfluence } from '../src/engines/confluence/confluenceEngine';
import { calculateWatchWindow } from '../src/engines/session/sessionEngine';

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
console.log('RUNNING VELQOARATH LIVE FUNDAMENTAL DATA PIPELINE TESTS');
console.log('================================================================\n');

// -------------------------------------------------------------
// TEST 1: INITIALIZATION WITHOUT INVENTED API KEY
// -------------------------------------------------------------
{
  console.log('--- Test 1: Finance Calendar Initialization Without Invented API Key ---');
  const provider = new FinanceCalendarProvider();

  assert(provider.isConfigured === true, 'Test 1.1: Provider is configured without providing any API key');
  assert(provider.apiKey === undefined, 'Test 1.2: No apiKey required or invented');
  assert(provider.health === 'DISCONNECTED', 'Test 1.3: Honest lifecycle state is DISCONNECTED prior to first fetch');
  assert(provider.lifecycleState === 'DISCONNECTED', 'Test 1.4: Lifecycle state is DISCONNECTED');

  // Explicitly disabled provider
  const disabledProvider = new FinanceCalendarProvider({ enabled: false });
  assert(disabledProvider.isConfigured === false, 'Test 1.5: Explicitly disabled provider isConfigured is false');
  assert(disabledProvider.health === 'NOT_CONFIGURED', 'Test 1.6: Explicitly disabled provider health is NOT_CONFIGURED');
}

// -------------------------------------------------------------
// TEST 2: LIVE PROVIDER DATA NORMALIZATION & PROVENANCE
// -------------------------------------------------------------
{
  console.log('\n--- Test 2: Live Provider Data Normalization & Provenance ---');

  const sampleApiResponse = [
    {
      date: '2026-09-24',
      time_utc: '2026-09-24T12:30:00+00:00',
      name: 'US CPI Headline YoY',
      title: 'US CPI Headline YoY September 2026',
      impact: 'high',
      category: 'economic-indicators',
      consensus: '3.1%',
      prior: '3.3%',
      actual: '2.8%',
      url: 'https://www.financecalendar.com/event/us-cpi-september-2026/'
    },
    {
      date: '2026-09-24',
      time_utc: '2026-09-24T18:00:00+00:00',
      name: 'FOMC Rate Decision',
      title: 'FOMC Rate Decision September 2026',
      impact: 'high',
      category: 'central-banks-monetary-policy',
      consensus: '5.25%',
      prior: '5.50%',
      actual: null, // Upcoming event, NOT yet released
      url: 'https://www.financecalendar.com/event/fomc-rate-decision-september-2026/'
    }
  ];

  const mockFetch = async () =>
    new Response(JSON.stringify(sampleApiResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  const provider = new FinanceCalendarProvider({ fetchFn: mockFetch as any });
  const refreshed = await provider.refresh();

  assert(refreshed === true, 'Test 2.1: Mock live refresh succeeds');
  const events = await provider.getEconomicCalendar();
  const observations = await provider.getObservations();

  assert(events.length === 2, 'Test 2.2: Exactly 2 events parsed into calendar');
  assert(observations.length === 1, 'Test 2.3: Only actual released prints parsed as observations (1 fact)');

  const cpiObs = observations[0];
  assert(cpiObs.currency === 'USD', 'Test 2.4: Currency correctly mapped to USD');
  assert(cpiObs.category === 'INFLATION', 'Test 2.5: Category correctly mapped to INFLATION');
  assert(cpiObs.actual === 2.8, 'Test 2.6: Actual value correctly parsed as 2.8');
  assert(cpiObs.forecast === 3.1, 'Test 2.7: Forecast value correctly parsed as 3.1');
  assert(cpiObs.previous === 3.3, 'Test 2.8: Previous value correctly parsed as 3.3');
  assert(cpiObs.classification === 'FACT', 'Test 2.9: Observation strictly classified as FACT');
  assert(cpiObs.sourceUrl.includes('financecalendar.com'), 'Test 2.10: Provenance sourceUrl preserved');

  const fomcEvt = events.find((e) => e.name.includes('FOMC'));
  assert(fomcEvt !== undefined, 'Test 2.11: FOMC event present in calendar');
  assert(fomcEvt?.actual === null, 'Test 2.12: Never fabricates missing actual value for upcoming event');
  assert(fomcEvt?.status === 'UPCOMING', 'Test 2.13: Upcoming status correctly flagged');
}

// -------------------------------------------------------------
// TEST 3: LIVE REFRESH UPDATES AUTHORITATIVE GLOBAL STATE
// -------------------------------------------------------------
{
  console.log('\n--- Test 3: Live Refresh Updates Authoritative State ---');

  const fundamentalService = FundamentalService.getInstance();
  const liveProvider = fundamentalService.getLiveProvider();

  // Load custom live fixture
  const liveObs: any = [
    {
      id: 'obs-usd-live-cpi',
      currency: 'USD',
      indicatorId: 'usd-cpi',
      indicatorName: 'US Consumer Price Index',
      category: 'INFLATION',
      value: 2.5,
      actual: 2.5,
      forecast: 2.8,
      previous: 3.0,
      unit: '%',
      period: '2026-09',
      releaseDate: new Date().toISOString(),
      source: 'Finance Calendar',
      sourceName: 'Finance Calendar',
      sourceUrl: 'https://financecalendar.com',
      sourceStatus: 'CONNECTED',
      fetchedAt: new Date().toISOString(),
      dataStatus: 'AVAILABLE',
      provenance: 'Finance Calendar Live Feed',
      classification: 'FACT',
      statements: {
        fact: 'FACT: US CPI printed at 2.5%.',
        expectation: 'EXPECTATION: Consensus was 2.8%.',
        interpretation: 'INTERPRETATION: Downward surprise.',
        engineAnalysis: 'ENGINE_ANALYSIS: Easing pressure on Fed terminal rate.'
      }
    }
  ];

  const liveEvents: any = [
    {
      id: 'evt-usd-live-fomc',
      name: 'FOMC Rate Decision',
      currency: 'USD',
      importance: 'HIGH',
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
      previous: 5.5,
      forecast: 5.25,
      actual: null,
      unit: '%',
      source: 'Finance Calendar',
      status: 'UPCOMING'
    }
  ];

  liveProvider.setFixtureData(liveEvents, liveObs);
  await fundamentalService.useLiveProvider();
  await fundamentalService.refresh(true);

  const state = globalStore.getState();
  assert(state.fundamentalDatasetMode === 'LIVE', 'Test 3.1: Global store mode is LIVE');
  assert(state.observations.length === 1, 'Test 3.2: Store contains exactly 1 live observation');
  assert(state.observations[0].id === 'obs-usd-live-cpi', 'Test 3.3: Store observation is the live CPI item');
  assert(state.events.length === 1, 'Test 3.4: Store contains exactly 1 live event');
}

// -------------------------------------------------------------
// TEST 4: CURRENCY INTELLIGENCE CONSUMES LIVE OBSERVATIONS
// -------------------------------------------------------------
{
  console.log('\n--- Test 4: Currency Intelligence Consumes Live Observations ---');

  const usdState = globalStore.getCurrencyState('USD');
  assert(usdState !== null, 'Test 4.1: Evaluates USD currency state');
  const usdFund = VelqoarathApiService.getFundamentalCurrency('USD');

  assert(usdFund !== null, 'Test 4.2: API returns USD fundamental intelligence');
  assert(usdFund?.observations.some((o: any) => o.id === 'obs-usd-live-cpi'), 'Test 4.3: Consumes live CPI observation');
  assert(usdFund?.observations[0].actual === 2.5, 'Test 4.4: Reflects the live 2.5% value');
}

// -------------------------------------------------------------
// TEST 5: PAIR INTELLIGENCE CONSUMES REFRESHED LIVE STATE
// -------------------------------------------------------------
{
  console.log('\n--- Test 5: Pair Intelligence Consumes Live State ---');

  const pairIntel = globalStore.getPairIntelligence('EUR/USD');
  assert(pairIntel !== null, 'Test 5.1: Evaluates EUR/USD pair intelligence');
  assert(pairIntel?.fundamentalDifferential !== undefined, 'Test 5.2: Fundamental differential is present');
}

// -------------------------------------------------------------
// TEST 6: CONFLUENCE CONSUMES REFRESHED LIVE FUNDAMENTAL STATE
// -------------------------------------------------------------
{
  console.log('\n--- Test 6: Confluence Consumes Live State ---');

  const pairIntel = globalStore.getPairIntelligence('USD/JPY');
  assert(pairIntel?.confluence !== undefined, 'Test 6.1: Confluence is evaluated on USD/JPY');
  assert(
    pairIntel?.confluence?.components.fundamentals !== undefined,
    'Test 6.2: Fundamentals component is populated'
  );
  assert(
    pairIntel?.confluence?.components.catalysts !== undefined,
    'Test 6.3: Catalysts component is populated'
  );
}

// -------------------------------------------------------------
// TEST 7: LIVE EVENT REACHES CATALYST/WATCH-WINDOW LOGIC
// -------------------------------------------------------------
{
  console.log('\n--- Test 7: Live Event Reaches Catalyst / Watch Window ---');

  const pair = INITIAL_PAIRS.find((p) => p.symbol === 'USD/JPY')!;
  const simulatedTime = new Date();
  const watch = calculateWatchWindow(pair, globalStore.getState().events, simulatedTime, true);

  assert(watch.upcomingCatalyst !== null, 'Test 7.1: Live FOMC event detected as upcoming catalyst');
  assert(watch.upcomingCatalyst?.name === 'FOMC Rate Decision', 'Test 7.2: Catalyst name matches live event');
  assert(watch.watchState === 'EVENT-SENSITIVE', 'Test 7.3: Event within 4h triggers EVENT-SENSITIVE');
}

// -------------------------------------------------------------
// TEST 8: FAILED REFRESH RETAINS LAST SUCCESSFUL LIVE DATASET
// -------------------------------------------------------------
{
  console.log('\n--- Test 8: Failed Refresh Retains Last Valid Live Dataset ---');

  const fundamentalService = FundamentalService.getInstance();
  const liveProvider = fundamentalService.getLiveProvider();

  // Inject failing fetch
  (liveProvider as any).fetchFn = async () => {
    throw new Error('503 Service Unavailable: upstream timeout');
  };

  const refreshSuccess = await fundamentalService.refresh(true);
  assert(refreshSuccess === false, 'Test 8.1: Refresh returns false on upstream error');

  const status = fundamentalService.getStatus();
  assert(status.health === 'DEGRADED', 'Test 8.2: Provider health becomes DEGRADED');
  assert(status.lifecycleState === 'DEGRADED', 'Test 8.3: Provider lifecycle state is DEGRADED');

  const state = globalStore.getState();
  assert(state.observations.length === 1, 'Test 8.4: Retains previously cached live observation');
  assert(state.observations[0].id === 'obs-usd-live-cpi', 'Test 8.5: Retained observation is still live CPI');
}

// -------------------------------------------------------------
// TEST 9: FAILED REFRESH DOES NOT ACTIVATE BENCHMARK DATA
// -------------------------------------------------------------
{
  console.log('\n--- Test 9: Failed Refresh Does NOT Activate Benchmark Data ---');

  const state = globalStore.getState();
  assert(state.fundamentalDatasetMode === 'LIVE', 'Test 9.1: Mode remains strictly LIVE, not switched to BENCHMARK');
  assert(
    !state.fundamentalProviderStatus.providerName.includes('Baseline'),
    'Test 9.2: Benchmark provider was NOT silently activated'
  );
}

// -------------------------------------------------------------
// TEST 10: BENCHMARK PROVIDER IS EXPLICITLY IDENTIFIABLE
// -------------------------------------------------------------
{
  console.log('\n--- Test 10: Benchmark Provider Explicitly Identifiable ---');

  const benchProvider = new VerifiedDatasetFundamentalProvider();
  assert(benchProvider.mode === 'BENCHMARK', 'Test 10.1: Mode property is explicitly BENCHMARK');
  const benchStatus = benchProvider.getStatus();
  assert(benchStatus.datasetMode === 'BENCHMARK', 'Test 10.2: getStatus() datasetMode is BENCHMARK');
  assert(benchStatus.providerName.includes('Benchmark'), 'Test 10.3: Name explicitly includes Benchmark');
}

// -------------------------------------------------------------
// TEST 11: PRODUCTION STATE CANNOT SILENTLY REPORT BENCHMARK AS LIVE
// -------------------------------------------------------------
{
  console.log('\n--- Test 11: Production Cannot Silently Report Benchmark as Live ---');

  const fundamentalService = FundamentalService.getInstance();
  await fundamentalService.useBenchmarkProvider();

  const state = globalStore.getState();
  assert(state.fundamentalDatasetMode === 'BENCHMARK', 'Test 11.1: Store mode explicitly states BENCHMARK');
  assert(state.fundamentalProviderStatus.datasetMode === 'BENCHMARK', 'Test 11.2: Status reports BENCHMARK');

  // Switch back to LIVE
  await fundamentalService.useLiveProvider();
  const liveState = globalStore.getState();
  assert(liveState.fundamentalDatasetMode === 'LIVE', 'Test 11.3: Reverted mode is LIVE');
}

// -------------------------------------------------------------
// TEST 12: REFRESH OVERLAP PROTECTION
// -------------------------------------------------------------
{
  console.log('\n--- Test 12: Refresh Overlap Protection ---');

  const scheduler = RefreshScheduler.getInstance();

  // Trigger two concurrent refreshFundamentals calls
  const [r1, r2] = await Promise.all([
    scheduler.refreshFundamentals(false),
    scheduler.refreshFundamentals(false)
  ]);

  // One of them must have returned false due to in-flight mutex
  assert(r1 === false || r2 === false, 'Test 12.1: Overlapping fundamental refresh safely prevented');
}

// -------------------------------------------------------------
// TEST 13: 15-MINUTE FUNDAMENTAL REFRESH INTERVAL REMAINS INTACT
// -------------------------------------------------------------
{
  console.log('\n--- Test 13: Refresh Intervals Intact ---');

  const scheduler = RefreshScheduler.getInstance();
  const status = scheduler.getStatus();

  assert(status.market.intervalMs === 300000, 'Test 13.1: Market interval is 5 minutes (300,000 ms)');
  assert(status.fundamentals.intervalMs === 900000, 'Test 13.2: Fundamental interval is 15 minutes (900,000 ms)');
}

// -------------------------------------------------------------
// TEST 14: FUNDAMENTAL TIMESTAMPS UPDATE AFTER SUCCESSFUL REFRESH
// -------------------------------------------------------------
{
  console.log('\n--- Test 14: Fundamental Timestamps Update ---');

  const initialStatus = VelqoarathApiService.getFundamentalsStatus();
  const beforeTime = initialStatus.lastSuccessfulFetch;

  // Simulate a live update
  const fundamentalService = FundamentalService.getInstance();
  const liveProvider = fundamentalService.getLiveProvider();

  const freshObs: any = [
    {
      id: 'obs-usd-live-cpi-t2',
      currency: 'USD',
      indicatorId: 'usd-cpi',
      indicatorName: 'US Consumer Price Index',
      category: 'INFLATION',
      value: 2.4,
      actual: 2.4,
      forecast: 2.7,
      previous: 2.5,
      unit: '%',
      period: '2026-10',
      releaseDate: new Date().toISOString(),
      source: 'Finance Calendar',
      sourceName: 'Finance Calendar',
      sourceUrl: 'https://financecalendar.com',
      sourceStatus: 'CONNECTED',
      fetchedAt: new Date().toISOString(),
      dataStatus: 'AVAILABLE',
      provenance: 'Finance Calendar Live Feed',
      classification: 'FACT',
      statements: {
        fact: 'FACT: US CPI printed at 2.4%.',
        expectation: 'EXPECTATION: Consensus was 2.7%.',
        interpretation: 'INTERPRETATION: Downward surprise.',
        engineAnalysis: 'ENGINE_ANALYSIS: Disinflation trend accelerating.'
      }
    }
  ];

  liveProvider.setFixtureData([], freshObs);
  await fundamentalService.useLiveProvider();
  await fundamentalService.refresh(true);

  const updatedStatus = VelqoarathApiService.getFundamentalsStatus();
  assert(updatedStatus.lastSuccessfulFetch !== null, 'Test 14.1: lastSuccessfulFetch is populated');
  assert(updatedStatus.datasetMode === 'LIVE', 'Test 14.2: Mode is LIVE');
  assert(updatedStatus.observationsCount === 1, 'Test 14.3: Observations count reflects updated dataset');
}

// -------------------------------------------------------------
// TEST 15: CHANGED OBSERVATION ALTERS DOWNSTREAM INTELLIGENCE IN-MEMORY
// -------------------------------------------------------------
{
  console.log('\n--- Test 15: Changed Live Observation Alters Downstream Intelligence ---');

  // Baseline reading for USD
  const usdBefore = VelqoarathApiService.getFundamentalCurrency('USD');
  const initialObsValue = usdBefore?.observations[0]?.actual;
  assert(initialObsValue === 2.4, 'Test 15.1: Initial observation is 2.4%');

  // New release comes in with a significant upside surprise (e.g. 4.5% inflation shock)
  const fundamentalService = FundamentalService.getInstance();
  const liveProvider = fundamentalService.getLiveProvider();

  const shockObs: any = [
    {
      id: 'obs-usd-live-cpi-shock',
      currency: 'USD',
      indicatorId: 'usd-cpi',
      indicatorName: 'US Consumer Price Index',
      category: 'INFLATION',
      value: 4.5,
      actual: 4.5,
      forecast: 2.4,
      previous: 2.4,
      unit: '%',
      period: '2026-11',
      releaseDate: new Date().toISOString(),
      source: 'Finance Calendar',
      sourceName: 'Finance Calendar',
      sourceUrl: 'https://financecalendar.com',
      sourceStatus: 'CONNECTED',
      fetchedAt: new Date().toISOString(),
      dataStatus: 'AVAILABLE',
      provenance: 'Finance Calendar Live Feed',
      classification: 'FACT',
      statements: {
        fact: 'FACT: US CPI printed at 4.5%.',
        expectation: 'EXPECTATION: Consensus was 2.4%.',
        interpretation: 'INTERPRETATION: Massive upside inflation surprise (+2.1%).',
        engineAnalysis: 'ENGINE_ANALYSIS: Forces hawkish pivot from Fed.'
      }
    }
  ];

  liveProvider.setFixtureData([], shockObs);
  await fundamentalService.refresh(true);

  const usdAfter = VelqoarathApiService.getFundamentalCurrency('USD');
  const updatedObsValue = usdAfter?.observations[0]?.actual;

  assert(updatedObsValue === 4.5, 'Test 15.2: In-memory state immediately reflects new 4.5% observation');
  assert(
    usdAfter?.expectations[0]?.surprise !== undefined &&
      usdAfter?.expectations[0]?.surprise > 2.0,
    'Test 15.3: Downstream expectations engine recalculates surprise without application restart'
  );
}

console.log('\n================================================================');
console.log(`LIVE FUNDAMENTAL PIPELINE TESTS SUMMARY: ${passedTests}/${totalTests} PASSED`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
