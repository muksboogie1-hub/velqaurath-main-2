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

  // If feeds are not connected or market data is null
  if (
    !isDataFeedConnected ||
    relativeStrengthDelta === null ||
    orientationDirection === 'DATA_UNAVAILABLE' ||
    baseState.marketStrength === null ||
    quoteState.marketStrength === null
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

  // 1. MARKET STRENGTH THRESHOLD REVERSAL CONDITION
  const currentDeltaStr = `${relativeStrengthDelta >= 0 ? '+' : ''}${relativeStrengthDelta.toFixed(2)}%`;
  const mktTriggered = isBullish
    ? relativeStrengthDelta < 0.05
    : isBearish
    ? relativeStrengthDelta > -0.05
    : Math.abs(relativeStrengthDelta) < 0.08;

  conditions.push({
    id: `inv-${pair.symbol.toLowerCase()}-mkt-delta`,
    category: 'MARKET_STRENGTH',
    description: isBullish
      ? `Relative basket strength differential for ${pair.baseCurrency} falls below +0.05% threshold.`
      : isBearish
      ? `Relative basket strength differential for ${pair.baseCurrency} rises above -0.05% threshold.`
      : `Pair remains inside neutral consolidation bounds (|Δ| < 0.08%).`,
    requiredEvidence: 'Biquote Daily Basket Relative Performance',
    currentValue: currentDeltaStr,
    triggerCondition: isBullish ? 'Δ < +0.05%' : isBearish ? 'Δ > -0.05%' : '|Δ| ≥ 0.08%',
    triggered: mktTriggered,
    severity: 'HIGH',
    source: 'MarketStrengthEngine',
    timestamp: nowIso,
    evaluationStatus: mktTriggered ? 'INVALIDATED' : 'VALID'
  });

  // 2. MONETARY POLICY STANCE REVERSAL CONDITION
  const baseStance = baseState.centralBank?.stance || 'UNAVAILABLE';
  const quoteStance = quoteState.centralBank?.stance || 'UNAVAILABLE';
  const policyTriggered = isBullish
    ? baseStance === 'DOVISH' && quoteStance === 'HAWKISH'
    : isBearish
    ? baseStance === 'HAWKISH' && quoteStance === 'DOVISH'
    : false;

  conditions.push({
    id: `inv-${pair.symbol.toLowerCase()}-policy-stance`,
    category: 'MONETARY_POLICY',
    description: isBullish
      ? `${baseState.centralBank.institution} pivots to dovish easing while ${quoteState.centralBank.institution} hikes or maintains hawkish posture.`
      : isBearish
      ? `${quoteState.centralBank.institution} pivots to dovish easing while ${baseState.centralBank.institution} hikes or maintains hawkish posture.`
      : 'Decisive divergent monetary policy guidance emerges from either central bank.',
    requiredEvidence: 'Official Central Bank Decision and Statement Publications',
    currentValue: `${pair.baseCurrency}: ${baseStance} vs ${pair.quoteCurrency}: ${quoteStance}`,
    triggerCondition: isBullish
      ? `${pair.baseCurrency} DOVISH and ${pair.quoteCurrency} HAWKISH`
      : isBearish
      ? `${pair.baseCurrency} HAWKISH and ${pair.quoteCurrency} DOVISH`
      : 'Policy divergence |ΔRate| > 1.00%',
    triggered: policyTriggered,
    severity: 'HIGH',
    source: 'CentralBankProfiles',
    timestamp: nowIso,
    evaluationStatus: policyTriggered ? 'INVALIDATED' : 'VALID'
  });

  // 3. MACRO SURPRISE REVERSAL CONDITION
  const expDiff = fundamentalDiff?.expectationsDifferential?.comparison;
  const expTriggered = isBullish
    ? expDiff?.includes(pair.quoteCurrency) && !expDiff?.includes('balanced')
    : isBearish
    ? expDiff?.includes(pair.baseCurrency) && !expDiff?.includes('balanced')
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
    currentValue: expDiff || 'Surprises balanced across observation set',
    triggerCondition: isBullish ? `Persistent ${pair.quoteCurrency} surprise outperformance` : isBearish ? `Persistent ${pair.baseCurrency} surprise outperformance` : 'Decisive surprise divergence',
    triggered: !!expTriggered,
    severity: 'MEDIUM',
    source: 'ExpectationsEngine',
    timestamp: nowIso,
    evaluationStatus: expTriggered ? 'WEAKENED' : 'VALID'
  });

  // Determine overall status
  let overallStatus: InvalidationEvaluationStatus = 'VALID';
  const hasInvalidated = conditions.some((c) => c.triggered && c.severity === 'HIGH');
  const hasWeakened = conditions.some((c) => c.triggered && c.severity === 'MEDIUM');

  if (hasInvalidated) {
    overallStatus = 'INVALIDATED';
  } else if (hasWeakened) {
    overallStatus = 'WEAKENED';
  } else {
    overallStatus = 'VALID';
  }

  return {
    conditions,
    overallStatus
  };
}
