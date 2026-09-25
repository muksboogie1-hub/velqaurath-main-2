import { BiquoteProvider, toBiquoteSymbol } from '../src/marketData/providers/BiquoteProvider';
import { MarketDataService } from '../src/marketData/service/marketDataService';
import { calculateCurrencyMarketStrengths } from '../src/marketData/engine/marketStrengthEngine';
import { CANONICAL_15_PAIRS, SUPPORTED_MAJOR_CURRENCIES } from '../src/marketData/config';
import { globalStore } from '../src/data/store';
import { VelqoarathApiService } from '../src/api/service';
import { MarketQuote } from '../src/marketData/types';

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}${detail ? ` (${detail})` : ''}`);
    process.exitCode = 1;
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  total++;
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg} | Expected: ${JSON.stringify(expected)} | Got: ${JSON.stringify(actual)}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('RUNNING VELQOARATH 15-PAIR MARKET DATA FULL PIPELINE VERIFICATION');
console.log('================================================================\n');

async function runPipelineVerification() {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // Distinct daily percentage returns to produce clear currency separations
  const pairReturns: Record<string, { bid: number; ask: number; ret: number }> = {
    'EUR/USD': { bid: 1.1390, ask: 1.1392, ret: 0.45 },
    'GBP/USD': { bid: 1.3235, ask: 1.3237, ret: 0.35 },
    'USD/JPY': { bid: 154.20, ask: 154.22, ret: -0.55 },
    'USD/CHF': { bid: 0.8920, ask: 0.8922, ret: -0.30 },
    'AUD/USD': { bid: 0.6720, ask: 0.6722, ret: 0.60 },
    'NZD/USD': { bid: 0.5980, ask: 0.5982, ret: -0.70 },
    'USD/CAD': { bid: 1.3650, ask: 1.3652, ret: 0.25 },
    'EUR/GBP': { bid: 0.8605, ask: 0.8607, ret: 0.10 },
    'EUR/JPY': { bid: 175.60, ask: 175.63, ret: -0.10 },
    'GBP/JPY': { bid: 204.10, ask: 204.13, ret: -0.20 },
    'EUR/CHF': { bid: 1.0160, ask: 1.0162, ret: 0.15 },
    'GBP/CHF': { bid: 1.1805, ask: 1.1808, ret: 0.05 },
    'AUD/JPY': { bid: 103.60, ask: 103.63, ret: 0.05 },
    'NZD/JPY': { bid: 92.20, ask: 92.23, ret: -1.25 },
    'CAD/JPY': { bid: 112.95, ask: 112.98, ret: -0.80 }
  };

  // Step 1: Biquote-like provider returns all 15 pairs
  const mockBiquoteJson: Record<string, any> = {};
  for (const sym of CANONICAL_15_PAIRS) {
    const bqSym = toBiquoteSymbol(sym);
    if (!bqSym) throw new Error(`Missing Biquote symbol mapping for ${sym}`);
    const data = pairReturns[sym];
    mockBiquoteJson[bqSym] = {
      symbol: bqSym,
      bid: data.bid,
      ask: data.ask,
      mid: Number(((data.bid + data.ask) / 2).toFixed(5)),
      high: Number((data.ask * 1.005).toFixed(5)),
      low: Number((data.bid * 0.995).toFixed(5)),
      dayDiffPercent: data.ret,
      timestamp: new Date(now - 4000).toISOString(),
      source: 'MetaTrader 5 (Broker 1)',
      exchange: 'FOREX',
      marketState: 'open',
      spread: Number((data.ask - data.bid).toFixed(5))
    };
  }

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => mockBiquoteJson
  } as Response);

  const provider = new BiquoteProvider({
    fetchFn: mockFetch as any,
    requiredPairs: [...CANONICAL_15_PAIRS]
  });

  const quotes = await provider.fetchDailyQuotes();
  assertEqual(quotes.length, 15, 'Step 1: Biquote provider returns exactly 15 pairs');
  assertEqual(CANONICAL_15_PAIRS.length, 15, 'Step 1: Canonical universe count is exactly 15');

  // Step 2: All 15 quotes normalize successfully
  for (const sym of CANONICAL_15_PAIRS) {
    const q = quotes.find((x) => x.symbol === sym);
    assert(Boolean(q), `Step 2: Quote ${sym} normalized successfully`);
  }

  // Step 3: Quotes contain price, timestamp, dailyReturnPercent/changePercent, provider timestamp, received timestamp, freshness/staleness info
  for (const q of quotes) {
    assert(typeof q.price === 'number' && q.price > 0, `Step 3: ${q.symbol} contains numeric price (${q.price})`);
    assert(typeof q.timestamp === 'number' && q.timestamp > 0, `Step 3: ${q.symbol} contains epoch timestamp`);
    assert(q.dailyReturnPercent !== null && typeof q.dailyReturnPercent === 'number', `Step 3: ${q.symbol} contains dailyReturnPercent (${q.dailyReturnPercent}%)`);
    assert(q.changePercent !== null && typeof q.changePercent === 'number', `Step 3: ${q.symbol} contains changePercent`);
    assert(typeof q.providerTimestamp === 'string' && q.providerTimestamp.length > 0, `Step 3: ${q.symbol} contains providerTimestamp`);
    assert(typeof q.receivedAt === 'string' && q.receivedAt.length > 0, `Step 3: ${q.symbol} contains receivedAt`);
    assert(typeof q.quoteAgeSeconds === 'number', `Step 3: ${q.symbol} contains quoteAgeSeconds`);
    assert(typeof q.stale === 'boolean', `Step 3: ${q.symbol} contains stale boolean flag`);
  }

  // Step 4: MarketDataService accepts the snapshot
  const mdService = new MarketDataService(provider);
  const serviceQuotes = await mdService.getQuotes(true);
  assertEqual(serviceQuotes.length, 15, 'Step 4: MarketDataService accepts and caches 15 quotes');
  const serviceStatus = mdService.getStatus();
  assert(serviceStatus.quotesCount === 15, 'Step 4: MarketDataService reports quotesCount 15');
  assertEqual(serviceStatus.snapshotHealth, 'FRESH', 'Step 4: MarketDataService reports snapshotHealth FRESH');

  // Step 5: Currency strength calculates for the 8 currencies
  const strengthsMap = await mdService.getCurrencyStrengths({ strongThreshold: 0.1, weakThreshold: -0.1 }, false);
  assertEqual(strengthsMap.size, 8, 'Step 5: Strengths calculated for all 8 currencies');
  for (const code of SUPPORTED_MAJOR_CURRENCIES) {
    const s = strengthsMap.get(code);
    assert(Boolean(s), `Step 5: Currency ${code} present in strengths map`);
    assert(s?.marketStrength !== null && typeof s?.marketStrength === 'number', `Step 5: Currency ${code} has numeric marketStrength (${s?.marketStrength}%)`);
    assert(s?.classification === 'STRONG' || s?.classification === 'NEUTRAL' || s?.classification === 'WEAK', `Step 5: ${code} has valid classification (${s?.classification})`);
  }

  // Step 6: globalStore receives the market snapshot
  globalStore.setMarketData(serviceQuotes, strengthsMap, serviceStatus);
  const storeState = globalStore.getState();
  assertEqual(storeState.marketQuotes.length, 15, 'Step 6: globalStore received 15 quotes');
  assertEqual(storeState.marketStrengths.size, 8, 'Step 6: globalStore received 8 currency strengths');

  // Step 7: CurrencyState receives marketStrength
  const eurState = globalStore.getCurrencyState('EUR');
  assert(Boolean(eurState), 'Step 7: EUR CurrencyState retrieved');
  assert(eurState?.marketStrength !== null, `Step 7: EUR CurrencyState receives marketStrength (${eurState?.marketStrength}%)`);
  assert(eurState?.marketState !== 'DATA_UNAVAILABLE', `Step 7: EUR CurrencyState marketState is ${eurState?.marketState} (not DATA_UNAVAILABLE)`);

  const usdState = globalStore.getCurrencyState('USD');
  assert(Boolean(usdState), 'Step 7: USD CurrencyState retrieved');
  assert(usdState?.marketStrength !== null, `Step 7: USD CurrencyState receives marketStrength (${usdState?.marketStrength}%)`);

  // Step 8: PairIntelligence receives base and quote strength
  const eurUsdIntel = globalStore.getPairIntelligence('EUR/USD');
  assert(Boolean(eurUsdIntel), 'Step 8: EUR/USD PairIntelligence retrieved');
  assert(eurUsdIntel?.baseState.marketStrength !== null, `Step 8: baseState EUR has marketStrength (${eurUsdIntel?.baseState.marketStrength}%)`);
  assert(eurUsdIntel?.quoteState.marketStrength !== null, `Step 8: quoteState USD has marketStrength (${eurUsdIntel?.quoteState.marketStrength}%)`);

  // Step 9: relativeStrengthDelta is calculated
  assert(eurUsdIntel?.relativeStrengthDelta !== null, `Step 9: relativeStrengthDelta is calculated (${eurUsdIntel?.relativeStrengthDelta}%)`);
  const expectedDelta = Number(((eurUsdIntel?.baseState.marketStrength ?? 0) - (eurUsdIntel?.quoteState.marketStrength ?? 0)).toFixed(2));
  assertEqual(eurUsdIntel?.relativeStrengthDelta, expectedDelta, 'Step 9: relativeStrengthDelta equals baseStrength - quoteStrength');

  // Step 10: orientationDirection is calculated
  assert(eurUsdIntel?.orientationDirection !== 'DATA_UNAVAILABLE', `Step 10: orientationDirection is ${eurUsdIntel?.orientationDirection} (not DATA_UNAVAILABLE)`);
  assert(
    eurUsdIntel?.orientationDirection === 'BULLISH_BASE' ||
    eurUsdIntel?.orientationDirection === 'BEARISH_BASE' ||
    eurUsdIntel?.orientationDirection === 'NEUTRAL',
    'Step 10: orientationDirection is valid directional bias'
  );

  // Step 11: confluence is calculated
  assert(Boolean(eurUsdIntel?.confluence), 'Step 11: confluence object is populated');
  assert(typeof eurUsdIntel?.confluence?.confluenceScore === 'number', `Step 11: confluenceScore is numeric (${eurUsdIntel?.confluence?.confluenceScore})`);
  assert(eurUsdIntel?.confluence?.components.marketStrength !== undefined, 'Step 11: confluence contains marketStrength component');

  // Step 12: structured thesis is calculated
  assert(Boolean(eurUsdIntel?.structuredThesis), 'Step 12: structuredThesis is populated');
  assert(eurUsdIntel?.structuredThesis?.status !== 'INSUFFICIENT_DATA', `Step 12: structuredThesis status is ${eurUsdIntel?.structuredThesis?.status} (not INSUFFICIENT_DATA)`);
  assert(typeof eurUsdIntel?.structuredThesis?.summary === 'string', 'Step 12: structuredThesis contains summary text');

  // Step 13: structured invalidation is calculated
  assert(Array.isArray(eurUsdIntel?.structuredInvalidation), 'Step 13: structuredInvalidation is array');
  assert((eurUsdIntel?.structuredInvalidation?.length ?? 0) > 0, `Step 13: structuredInvalidation contains conditions (${eurUsdIntel?.structuredInvalidation?.length})`);

  // Step 14: structured contradictions are calculated
  assert(Array.isArray(eurUsdIntel?.structuredContradictions), 'Step 14: structuredContradictions is array');

  // Step 15: structured opportunity is calculated
  assert(Boolean(eurUsdIntel?.structuredOpportunity), 'Step 15: structuredOpportunity is populated');
  assert(eurUsdIntel?.structuredOpportunity?.state !== 'INSUFFICIENT_DATA', `Step 15: structuredOpportunity state is ${eurUsdIntel?.structuredOpportunity?.state} (not INSUFFICIENT_DATA)`);

  // Step 16: dashboard can identify valid intelligence
  const dashboard = VelqoarathApiService.getDashboard();
  assert(dashboard.allCurrencies.every((c) => c.marketStrength !== null), 'Step 16: All 8 currencies in dashboard have non-null marketStrength');
  assert(dashboard.allCurrencies.some((c) => c.marketState === 'STRONG'), 'Step 16: Dashboard includes STRONG currencies');
  assert(dashboard.topPairToWatch !== null, `Step 16: Dashboard topPairToWatch identified (${dashboard.topPairToWatch?.pair.symbol})`);
  assert(dashboard.topPairToWatch?.relativeStrengthDelta !== null, 'Step 16: Dashboard topPairToWatch has valid relativeStrengthDelta');
  assert(dashboard.marketProviderStatus.quotesCount === 15, 'Step 16: Dashboard marketProviderStatus reflects 15 quotes');

  console.log('\n================================================================');
  console.log(`FULL MARKET DATA PIPELINE VERIFICATION COMPLETED: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runPipelineVerification().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
