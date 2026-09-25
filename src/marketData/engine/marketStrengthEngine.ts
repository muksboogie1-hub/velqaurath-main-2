import {
  SUPPORTED_MAJOR_CURRENCIES,
  DEFAULT_LIQUID_PAIRS,
  MARKET_STRENGTH_SCALE_FACTOR
} from '../config';
import {
  MarketQuote,
  CurrencyMarketStrength,
  CurrencyCoverageInfo,
  PairContribution,
  StrengthThresholds,
  StrengthEngineOptions,
  StrengthClassification
} from '../types';

/**
 * Calculates a single pair's signed return contribution to a given currency.
 *
 * Orientation Rules:
 * - BASE currency: signed contribution = +pair daily return
 * - QUOTE currency: signed contribution = -pair daily return
 *
 * Daily Return Separation:
 * - Uses `dailyReturnPercent` if explicitly defined on the quote, falling back to `changePercent`.
 * - Ticks may update instantaneous price and timestamp, but the daily baseline remains preserved.
 */
export function calculatePairContribution(
  currencyCode: string,
  quote: MarketQuote
): PairContribution | null {
  const dailyReturn = quote.dailyReturnPercent ?? quote.changePercent;
  if (dailyReturn === null || dailyReturn === undefined || isNaN(dailyReturn)) {
    return null;
  }

  const cleanCode = currencyCode.toUpperCase();
  const base = quote.baseCurrency.toUpperCase();
  const quoteCurr = quote.quoteCurrency.toUpperCase();

  if (base === cleanCode) {
    return {
      pairSymbol: quote.symbol,
      pairReturnPercent: dailyReturn,
      role: 'BASE',
      signedContribution: dailyReturn,
      timestamp: quote.timestamp ?? Date.now()
    };
  }

  if (quoteCurr === cleanCode) {
    return {
      pairSymbol: quote.symbol,
      pairReturnPercent: dailyReturn,
      role: 'QUOTE',
      signedContribution: -dailyReturn,
      timestamp: quote.timestamp ?? Date.now()
    };
  }

  return null;
}

/**
 * Evaluates whether a quote has a valid daily return number.
 * Uses dailyReturnPercent if present, falling back to changePercent.
 */
export function hasValidQuoteReturn(quote: MarketQuote): boolean {
  const ret = quote.dailyReturnPercent ?? quote.changePercent;
  return ret !== null && ret !== undefined && typeof ret === 'number' && !isNaN(ret);
}

/**
 * Calculates deterministic currency market strengths across a relative currency basket.
 *
 * Transformation Pipeline:
 * 1. Calculate signed contribution per valid required pair for each currency.
 * 2. Calculate average signed return per currency: avgReturn = mean(signed contributions).
 * 3. Calculate basket mean return across all currencies with valid quotes: basketMean = mean(avgReturns).
 * 4. Basket-relative return: rawRelativeReturn = avgReturn - basketMean.
 * 5. Scale factor: scaledScore = rawRelativeReturn * scaleFactor (authoritative scaleFactor = 1.0, preserving true percentage points).
 * 6. Rounded score: marketStrength = Math.round(scaledScore * 100) / 100.
 * 7. Classification:
 *    - If no quotes or disconnected: DATA_UNAVAILABLE (marketStrength: null)
 *    - If coverage < minCoverageThreshold: INSUFFICIENT_COVERAGE (marketStrength: null)
 *    - If marketStrength >= strongThreshold (+0.10%): STRONG
 *    - If marketStrength <= weakThreshold (-0.10%): WEAK
 *    - Otherwise (-0.10% < marketStrength < +0.10%): NEUTRAL
 */
export function calculateCurrencyMarketStrengths(
  quotes: MarketQuote[],
  thresholds: StrengthThresholds,
  options?: StrengthEngineOptions
): Map<string, CurrencyMarketStrength> {
  const currencies = options?.currencies ?? SUPPORTED_MAJOR_CURRENCIES;
  const requiredPairs = options?.requiredPairs ?? DEFAULT_LIQUID_PAIRS;
  const scaleFactor = options?.scaleFactor ?? MARKET_STRENGTH_SCALE_FACTOR;
  const minCoverageThreshold = options?.minCoverageThreshold ?? 0; // Default to 0 so any currency with valid pairs is calculated unless a strict threshold is requested
  const providerStatus = options?.providerStatus ?? (quotes.length > 0 ? 'CONNECTED' : 'NOT_CONFIGURED');
  const providerSource = options?.providerSource ?? (quotes.length > 0 ? quotes[0].source : 'Biquote');
  const snapshotHealth = options?.snapshotHealth;
  const isSnapshotUsable = snapshotHealth === 'FRESH' || snapshotHealth === 'AGING';

  const resultMap = new Map<string, CurrencyMarketStrength>();
  const nowIso = new Date().toISOString();

  // 1. Separate required quotes into fresh vs stale
  const requiredSet = new Set(requiredPairs);
  let freshQuotes = quotes.filter(
    (q) => requiredSet.has(q.symbol) && !q.stale && hasValidQuoteReturn(q)
  );

  // If live tick staleness flagged quotes as stale, but the daily snapshot itself is FRESH/AGING,
  // preserve daily relative strength calculation from the valid snapshot rather than collapsing to null
  if (freshQuotes.length === 0 && isSnapshotUsable) {
    freshQuotes = quotes.filter(
      (q) => requiredSet.has(q.symbol) && hasValidQuoteReturn(q)
    );
  }

  const staleQuotes = quotes.filter(
    (q) => requiredSet.has(q.symbol) && !freshQuotes.includes(q)
  );
  const stalePairSymbols = new Set(staleQuotes.map((q) => q.symbol));

  // Edge case: No usable fresh quotes provided, or provider is completely down/not configured
  if (
    freshQuotes.length === 0 ||
    quotes.length === 0 ||
    providerStatus === 'NOT_CONFIGURED' ||
    providerStatus === 'ERROR'
  ) {
    for (const code of currencies) {
      const requiredForCurrency = requiredPairs.filter((p) => {
        const [b, q] = p.split('/');
        return b === code || q === code;
      });

      const stalePairsForCode = requiredForCurrency.filter((p) => stalePairSymbols.has(p));
      const missingPairsForCode = requiredForCurrency.filter(
        (p) => !stalePairSymbols.has(p)
      );

      resultMap.set(code, {
        currency: code,
        marketStrength: null,
        classification: 'DATA_UNAVAILABLE',
        dailyMovementPercent: null,
        basketRelativeMovementPercent: null,
        rawRelativeReturn: null,
        avgReturn: null,
        momentum: null,
        coverage: {
          available: 0,
          required: requiredForCurrency.length,
          percent: 0,
          missingPairs: missingPairsForCode,
          stalePairs: stalePairsForCode,
          validPairs: [],
          status: 'INSUFFICIENT'
        },
        contributors: [],
        explanation:
          providerStatus === 'NOT_CONFIGURED'
            ? 'MARKET DATA NOT CONFIGURED: Primary provider is awaiting initialization. Market strength is unavailable.'
            : freshQuotes.length === 0 && staleQuotes.length > 0
            ? `MARKET DATA UNAVAILABLE: Zero fresh quotes available (${staleQuotes.length} pairs stale). Provider status is ${providerStatus}.`
            : `MARKET DATA UNAVAILABLE: Provider status is ${providerStatus}. No synthetic data substituted.`,
        calculatedAt: nowIso,
        providerStatus,
        source: providerSource
      });
    }
    return resultMap;
  }

  interface CurrencyIntermediate {
    code: string;
    requiredPairs: string[];
    validPairs: string[];
    stalePairs: string[];
    missingPairs: string[];
    contributors: PairContribution[];
    avgReturn: number | null;
    coveragePercent: number;
    coverageRatio: number;
    hasSufficientCoverage: boolean;
  }

  const intermediates: CurrencyIntermediate[] = [];

  for (const code of currencies) {
    const requiredForCurrency = requiredPairs.filter((p) => {
      const [b, q] = p.split('/');
      return b === code || q === code;
    });

    const contributors: PairContribution[] = [];
    const validPairs: string[] = [];

    for (const q of freshQuotes) {
      const contrib = calculatePairContribution(code, q);
      if (contrib !== null) {
        contributors.push(contrib);
        validPairs.push(q.symbol);
      }
    }

    const stalePairsForCode = requiredForCurrency.filter((p) => stalePairSymbols.has(p));
    const missingPairs = requiredForCurrency.filter(
      (p) => !validPairs.includes(p) && !stalePairSymbols.has(p)
    );
    const availableCount = contributors.length;
    const requiredCount = requiredForCurrency.length;
    const coverageRatio = requiredCount > 0 ? availableCount / requiredCount : 0;
    const coveragePercent = Math.round(coverageRatio * 1000) / 10;
    const hasSufficientCoverage =
      availableCount > 0 && (minCoverageThreshold === 0 || coverageRatio >= minCoverageThreshold);

    let avgReturn: number | null = null;
    if (contributors.length > 0) {
      const sum = contributors.reduce((acc, c) => acc + c.signedContribution, 0);
      avgReturn = sum / contributors.length;
    }

    intermediates.push({
      code,
      requiredPairs: requiredForCurrency,
      validPairs,
      stalePairs: stalePairsForCode,
      missingPairs,
      contributors,
      avgReturn,
      coveragePercent,
      coverageRatio,
      hasSufficientCoverage
    });
  }

  // 2. Basket Mean across valid currencies with sufficient coverage
  const validIntermediates = intermediates.filter((i) => i.hasSufficientCoverage && i.avgReturn !== null);
  const basketMean =
    validIntermediates.length > 0
      ? validIntermediates.reduce((acc, i) => acc + (i.avgReturn as number), 0) / validIntermediates.length
      : 0;

  // 3. Final calculations per currency
  for (const item of intermediates) {
    const availableCount = item.contributors.length;
    const requiredCount = item.requiredPairs.length;
    const coverageStatus =
      availableCount === requiredCount && item.stalePairs.length === 0
        ? 'COMPLETE'
        : item.hasSufficientCoverage
        ? 'PARTIAL'
        : 'INSUFFICIENT';

    const coverageInfo: CurrencyCoverageInfo = {
      available: availableCount,
      required: requiredCount,
      percent: item.coveragePercent,
      missingPairs: item.missingPairs,
      stalePairs: item.stalePairs,
      validPairs: item.validPairs,
      status: coverageStatus as 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT'
    };

    // If coverage is insufficient or zero quotes
    if (!item.hasSufficientCoverage || item.avgReturn === null) {
      const isZero = availableCount === 0;
      const classification: StrengthClassification = isZero
        ? 'DATA_UNAVAILABLE'
        : 'INSUFFICIENT_COVERAGE';

      const staleNotice = item.stalePairs.length > 0 ? ` Stale pairs excluded: ${item.stalePairs.join(', ')}.` : '';

      resultMap.set(item.code, {
        currency: item.code,
        marketStrength: null,
        classification,
        dailyMovementPercent: item.avgReturn !== null ? Math.round(item.avgReturn * 1000) / 1000 : null,
        basketRelativeMovementPercent: null,
        rawRelativeReturn: null,
        avgReturn: item.avgReturn,
        momentum: null,
        coverage: coverageInfo,
        contributors: item.contributors,
        explanation: isZero
          ? `MARKET DATA UNAVAILABLE: Zero fresh pair quotes observed for ${item.code} out of ${requiredCount} required pairs.${staleNotice}`
          : `INSUFFICIENT COVERAGE: Only ${availableCount}/${requiredCount} fresh pairs observed (${item.coveragePercent}% < minimum required ${(minCoverageThreshold * 100).toFixed(0)}%). Strength score withheld.${staleNotice}`,
        calculatedAt: nowIso,
        providerStatus,
        source: providerSource,
        basketMean: Math.round(basketMean * 1000) / 1000
      });
      continue;
    }

    // Relative basket score calculation in true percentage points
    const rawRelativeReturn = item.avgReturn - basketMean;
    const scaledScore = rawRelativeReturn * scaleFactor;
    const marketStrength = Math.round(scaledScore * 100) / 100;
    const momentum = Math.round(marketStrength * 0.4 * 100) / 100;

    let classification: StrengthClassification = 'NEUTRAL';
    if (marketStrength >= thresholds.strongThreshold) {
      classification = 'STRONG';
    } else if (marketStrength <= thresholds.weakThreshold) {
      classification = 'WEAK';
    }

    const sortedContributors = [...item.contributors].sort(
      (a, b) => Math.abs(b.signedContribution) - Math.abs(a.signedContribution)
    );

    const topGainers = sortedContributors
      .filter((c) => c.signedContribution > 0)
      .slice(0, 2)
      .map((c) => `${c.pairSymbol} (+${c.signedContribution.toFixed(2)}%)`)
      .join(', ');

    const topDraggers = sortedContributors
      .filter((c) => c.signedContribution < 0)
      .slice(0, 2)
      .map((c) => `${c.pairSymbol} (${c.signedContribution.toFixed(2)}%)`)
      .join(', ');

    const signPrefix = marketStrength >= 0 ? '+' : '';
    const staleNotice = item.stalePairs.length > 0 ? ` (Stale excluded: ${item.stalePairs.join(', ')})` : '';
    const coverageSummary = `Coverage: ${availableCount}/${requiredCount} pairs (${item.coveragePercent}%)${staleNotice}.`;

    let driverText = '';
    if (topGainers && topDraggers) {
      driverText = `Bolstered by ${topGainers}; dragged by ${topDraggers}.`;
    } else if (topGainers) {
      driverText = `Supported by ${topGainers}.`;
    } else if (topDraggers) {
      driverText = `Pressured by ${topDraggers}.`;
    } else {
      driverText = `Flat price action across basket.`;
    }

    let thresholdText = '';
    if (classification === 'STRONG') {
      thresholdText = `Classified STRONG because basket relative movement is ≥ +${thresholds.strongThreshold.toFixed(2)}%.`;
    } else if (classification === 'WEAK') {
      thresholdText = `Classified WEAK because basket relative movement is ≤ ${thresholds.weakThreshold.toFixed(2)}%.`;
    } else {
      thresholdText = `Classified NEUTRAL because basket relative movement is between ${thresholds.weakThreshold.toFixed(2)}% and +${thresholds.strongThreshold.toFixed(2)}%.`;
    }

    const movementSummary = `${item.code} daily relative movement = ${signPrefix}${marketStrength.toFixed(2)}% (raw basket avg: ${item.avgReturn >= 0 ? '+' : ''}${item.avgReturn.toFixed(2)}%, basket baseline: ${basketMean >= 0 ? '+' : ''}${basketMean.toFixed(2)}%).`;
    const explanation = `${movementSummary} ${thresholdText} ${driverText} ${coverageSummary}`;

    resultMap.set(item.code, {
      currency: item.code,
      marketStrength,
      classification,
      dailyMovementPercent: Math.round(item.avgReturn * 1000) / 1000,
      basketRelativeMovementPercent: Math.round(rawRelativeReturn * 1000) / 1000,
      rawRelativeReturn: Math.round(rawRelativeReturn * 1000) / 1000,
      avgReturn: Math.round(item.avgReturn * 1000) / 1000,
      momentum,
      coverage: coverageInfo,
      contributors: sortedContributors,
      explanation,
      calculatedAt: nowIso,
      providerStatus,
      source: providerSource,
      basketMean: Math.round(basketMean * 1000) / 1000,
      scaledScore: Math.round(scaledScore * 1000) / 1000
    });
  }

  return resultMap;
}
