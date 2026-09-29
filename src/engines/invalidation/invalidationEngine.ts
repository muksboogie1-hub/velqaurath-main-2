/**
 * VELQOARATH — STRUCTURED INVALIDATION ENGINE
 *
 * Implements machine-readable, testable invalidation conditions for currency pairs.
 *
 * GOVERNANCE:
 * - NO INVENTED NUMBERS: Invalidation must be linked to observable thresholds
 *   (e.g., relative strength delta crossing into neutral bounds, central bank stance change,
 *   binary catalyst print reversing terminal rate path).
 * - UNABLE_TO_EVALUATE: When upstream data is missing or disconnected, conditions are
 *   marked UNABLE_TO_EVALUATE rather than falsely confirmed as VALID.
 */

import { CurrencyPair, CurrencyState, PairOrientationDirection, FundamentalDifferential } from '../../types';
import {
  StructuredInvalidationCondition,
  InvalidationCategory,
  InvalidationEvaluationStatus
} from '../../types/intelligence';

export interface InvalidationEvaluationParams {
  pair: CurrencyPair;
  baseState: CurrencyState;
  quoteState: CurrencyState;
  relativeStrengthDelta: number | null;
  orientationDirection: PairOrientationDirection;
  fundamentalDiff?: FundamentalDifferential;
  isDataFeedConnected?: boolean;
  now?: Date;
}

export function evaluateStructuredInvalidation(
  params: InvalidationEvaluationParams
): {
  conditions: StructuredInvalidationCondition[];
  overallStatus: InvalidationEvaluationStatus;
} {
  const {
    pair,
    baseState,
    quoteState,
    relativeStrengthDelta,
    orientationDirection,
    fundamentalDiff,
    isDataFeedConnected = true,
    now = new Date()
  } = params;

  const conditions: StructuredInvalidationCondition[] = [];
  const nowIso = now.toISOString();

  // Every layer is genuinely unavailable: nothing can be evaluated at all.
  if (
    !isDataFeedConnected ||
    orientationDirection === 'DATA_UNAVAILABLE'
  ) {
    const unavailCond: StructuredInvalidationCondition = {
      id: `inv-${pair.symbol.toLowerCase()}-data-unavail`,
      category: 'DATA_QUALITY',
      description: 'Upstream market or macroeconomic feeds disconnected.',
      requiredEvidence: 'Active live market feed & macroeconomic observations',
      currentValue: 'FEEDS_OFFLINE',
      triggerCondition: 'Data connection restored and verified',
      triggered: true,
      severity: 'HIGH',
      source: 'DataStore Health Monitor',
      timestamp: nowIso,
      evaluationStatus: 'UNABLE_TO_EVALUATE'
    };

    return {
      conditions: [unavailCond],
      overallStatus: 'UNABLE_TO_EVALUATE'
    };
  }

  const isBullish = orientationDirection === 'BULLISH_BASE';
  const isBearish = orientationDirection === 'BEARISH_BASE';
  const isNeutral = orientationDirection === 'NEUTRAL';

  const marketEvidenceAvailable =
    relativeStrengthDelta !== null &&
    baseState.marketStrength !== null &&
    quoteState.marketStrength !== null;

  const marketEvidenceStale =
    baseState.marketDataFreshness === 'STALE' ||
    quoteState.marketDataFreshness === 'STALE';

  // 1. MARKET STRENGTH THRESHOLD REVERSAL CONDITION
  //
  // An unavailable market layer is reported as UNABLE_TO_EVALUATE with
  // triggered=false. It is never counted as a triggered HIGH invalidation
  // and never silently treated as a valid 0.00% differential.
  const mktDescription = isBullish
    ? `Relative basket strength differential for ${pair.baseCurrency} falls below +0.05% threshold.`
    : isBearish
    ? `Relative basket strength differential for ${pair.baseCurrency} rises above -0.05% threshold.`
    : `Pair remains inside neutral consolidation bounds (|Δ| < 0.08%).`;

  const mktTriggerCondition = isBullish
    ? 'Δ < +0.05%'
    : isBearish
    ? 'Δ > -0.05%'
    : '|Δ| < 0.08%';

  if (marketEvidenceAvailable) {
    const currentDeltaStr = `${relativeStrengthDelta! >= 0 ? '+' : ''}${relativeStrengthDelta!.toFixed(2)}%`;

    /*
     * NEUTRAL / RANGE-BOUND ORIENTATION
     *
     * A non-directional thesis has no directional edge to invalidate. Being
     * inside the neutral band is the thesis itself, so this is reported as a
     * confirmed LOW-severity state rather than a triggered HIGH invalidation
     * that would contradict the neutral orientation.
     */
    if (isNeutral) {
      const insideNeutralBand = Math.abs(relativeStrengthDelta!) < 0.08;
      conditions.push({
        id: `inv-${pair.symbol.toLowerCase()}-mkt-delta`,
        category: 'MARKET_STRENGTH',
        description: `${mktDescription} This confirms the range-bound state of a non-directional thesis; it does not invalidate a directional view.`,
        requiredEvidence: 'Biquote Daily Basket Relative Performance',
        currentValue: currentDeltaStr,
        triggerCondition: mktTriggerCondition,
        triggered: insideNeutralBand,
        severity: 'LOW',
        source: 'MarketStrengthEngine',
        timestamp: nowIso,
        evaluationStatus: 'VALID'
      });
    } else {
      const mktTriggered = isBullish
        ? relativeStrengthDelta! < 0.05
        : relativeStrengthDelta! > -0.05;

      conditions.push({
        id: `inv-${pair.symbol.toLowerCase()}-mkt-delta`,
        category: 'MARKET_STRENGTH',
        description: mktDescription,
        requiredEvidence: 'Biquote Daily Basket Relative Performance',
        currentValue: currentDeltaStr,
        triggerCondition: mktTriggerCondition,
        triggered: mktTriggered,
        severity: 'HIGH',
        source: 'MarketStrengthEngine',
        timestamp: nowIso,
        evaluationStatus: mktTriggered ? 'INVALIDATED' : 'VALID'
      });
    }
  } else {
    conditions.push({
      id: `inv-${pair.symbol.toLowerCase()}-mkt-delta`,
      category: 'MARKET_STRENGTH',
      description: mktDescription,
      requiredEvidence: 'Biquote Daily Basket Relative Performance',
      currentValue: marketEvidenceStale
        ? 'LIVE MARKET FEED STALE'
        : 'LIVE MARKET FEED UNAVAILABLE',
      triggerCondition: mktTriggerCondition,
      triggered: false,
      severity: 'LOW',
      source: 'MarketStrengthEngine',
      timestamp: nowIso,
      evaluationStatus: 'UNABLE_TO_EVALUATE'
    });
  }

  // 2. MONETARY POLICY STANCE REVERSAL CONDITION
  const baseStance = baseState.centralBank?.stance || 'UNAVAILABLE';
  const quoteStance = quoteState.centralBank?.stance || 'UNAVAILABLE';
  const policyEvaluable = baseStance !== 'UNAVAILABLE' || quoteStance !== 'UNAVAILABLE';
  const policyTriggered = isBullish
    ? baseStance === 'DOVISH' && quoteStance === 'HAWKISH'
    : isBearish
    ? baseStance === 'HAWKISH' && quoteStance === 'DOVISH'
    : false;

  conditions.push({
    id: `inv-${pair.symbol.toLowerCase()}-policy-stance`,
    category: 'MONETARY_POLICY',
    description: isBullish
      ? `${baseState.centralBank?.institution || pair.baseCurrency + ' central bank'} pivots to dovish easing while ${quoteState.centralBank?.institution || pair.quoteCurrency + ' central bank'} hikes or maintains hawkish posture.`
      : isBearish
      ? `${quoteState.centralBank?.institution || pair.quoteCurrency + ' central bank'} pivots to dovish easing while ${baseState.centralBank?.institution || pair.baseCurrency + ' central bank'} hikes or maintains hawkish posture.`
      : 'Decisive divergent monetary policy guidance emerges from either central bank.',
    requiredEvidence: 'Official Central Bank Decision and Statement Publications',
    currentValue: `${pair.baseCurrency}: ${baseStance} vs ${pair.quoteCurrency}: ${quoteStance}`,
    triggerCondition: isBullish
      ? `${pair.baseCurrency} DOVISH and ${pair.quoteCurrency} HAWKISH`
      : isBearish
      ? `${pair.baseCurrency} HAWKISH and ${pair.quoteCurrency} DOVISH`
      : 'Policy divergence |ΔRate| > 1.00%',
    triggered: policyEvaluable ? policyTriggered : false,
    severity: 'HIGH',
    source: 'CentralBankProfiles',
    timestamp: nowIso,
    evaluationStatus: policyEvaluable
      ? policyTriggered
        ? 'INVALIDATED'
        : 'VALID'
      : 'UNABLE_TO_EVALUATE'
  });

  // 3. MACRO SURPRISE REVERSAL CONDITION
  //
  // The trigger is evaluated from COUNTED realized surprises. The comparison
  // prose names both currencies regardless of direction, so matching against it
  // reported a surprise reversal for a record in which the base currency had
  // only beaten expectations.
  const expDiff = fundamentalDiff?.expectationsDifferential?.comparison ?? null;
  const expCounts = fundamentalDiff?.expectationsDifferential ?? null;
  const baseAboveCount = expCounts?.baseAboveCount ?? 0;
  const baseBelowCount = expCounts?.baseBelowCount ?? 0;
  const quoteAboveCount = expCounts?.quoteAboveCount ?? 0;
  const quoteBelowCount = expCounts?.quoteBelowCount ?? 0;
  const baseNetSurprise = baseAboveCount - baseBelowCount;
  const quoteNetSurprise = quoteAboveCount - quoteBelowCount;
  const surpriseEvaluable =
    baseAboveCount + baseBelowCount + quoteAboveCount + quoteBelowCount > 0;
  const expTriggered = !surpriseEvaluable
    ? false
    : isBullish
    ? quoteNetSurprise > baseNetSurprise
    : isBearish
    ? baseNetSurprise > quoteNetSurprise
    : false;

  conditions.push({
    id: `inv-${pair.symbol.toLowerCase()}-macro-surprise`,
    category: 'EXPECTATION',
    description: isBullish
      ? `Persistent economic release downside surprises across ${pair.baseCurrency} combined with strong beats in ${pair.quoteCurrency}.`
      : isBearish
      ? `Persistent economic release upside surprises across ${pair.baseCurrency} combined with downside misses in ${pair.quoteCurrency}.`
      : 'Asymmetric macro surprises force re-evaluation of relative terminal interest rates.',
    requiredEvidence: 'Finance Calendar Consensus vs Actual Print Statistics',
    currentValue: surpriseEvaluable
      ? `Realized surprises: ${pair.baseCurrency} net ${baseNetSurprise >= 0 ? '+' : ''}${baseNetSurprise} (${baseAboveCount} beats / ${baseBelowCount} misses) vs ${pair.quoteCurrency} net ${quoteNetSurprise >= 0 ? '+' : ''}${quoteNetSurprise} (${quoteAboveCount} beats / ${quoteBelowCount} misses)`
      : 'UNABLE_TO_EVALUATE: no verified realized surprise record available',
    triggerCondition: isBullish ? `Persistent ${pair.quoteCurrency} surprise outperformance` : isBearish ? `Persistent ${pair.baseCurrency} surprise outperformance` : 'Decisive surprise divergence',
    triggered: expTriggered,
    severity: 'MEDIUM',
    source: 'ExpectationsEngine',
    timestamp: nowIso,
    evaluationStatus: surpriseEvaluable
      ? expTriggered
        ? 'WEAKENED'
        : 'VALID'
      : 'UNABLE_TO_EVALUATE'
  });

  // Determine overall status
  let overallStatus: InvalidationEvaluationStatus = 'VALID';
  const hasInvalidated = conditions.some(
    (c) => c.triggered && c.severity === 'HIGH' && c.evaluationStatus !== 'UNABLE_TO_EVALUATE'
  );
  const hasWeakened = conditions.some(
    (c) => c.triggered && c.severity === 'MEDIUM' && c.evaluationStatus !== 'UNABLE_TO_EVALUATE'
  );
  const marketCondition = conditions.find((c) => c.category === 'MARKET_STRENGTH');
  const marketUnevaluable =
    marketCondition?.evaluationStatus === 'UNABLE_TO_EVALUATE';
  const allUnevaluable = conditions.every(
    (c) => c.evaluationStatus === 'UNABLE_TO_EVALUATE'
  );

  if (hasInvalidated) {
    overallStatus = 'INVALIDATED';
  } else if (hasWeakened) {
    overallStatus = 'WEAKENED';
  } else if (allUnevaluable || marketUnevaluable) {
    /*
     * The core market layer could not be evaluated, so the set is disclosed
     * as unevaluable rather than presented as confirmed valid.
     */
    overallStatus = 'UNABLE_TO_EVALUATE';
  } else {
    overallStatus = 'VALID';
  }

  return {
    conditions,
    overallStatus
  };
}
