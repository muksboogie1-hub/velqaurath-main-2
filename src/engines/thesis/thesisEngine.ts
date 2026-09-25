/**
 * VELQOARATH — STRUCTURED THESIS ENGINE
 *
 * Synthesizes cross-cutting macroeconomic data, price momentum, monetary policy,
 * contradictions, and invalidation rules into an auditable structured thesis.
 *
 * STATUSES:
 * - SUPPORTED: High alignment across price, fundamentals, and policy with no major contradictions.
 * - MIXED: Cross-currents in data prints or mild contradictions present.
 * - WEAKENED: High-impact contradictions or non-fatal invalidation conditions triggered.
 * - INVALIDATED: Critical invalidation threshold crossed (e.g., strength delta reversed, policy guidance inverted).
 * - INSUFFICIENT_DATA: Feeds offline or required inputs missing.
 */

import { CurrencyPair, CurrencyState, PairOrientationDirection, FundamentalDifferential } from '../../types';
import {
  StructuredThesis,
  ThesisStatus,
  CatalystEvent,
  StructuredContradiction,
  StructuredInvalidationCondition
} from '../../types/intelligence';

export interface ThesisEvaluationParams {
  pair: CurrencyPair;
  baseState: CurrencyState;
  quoteState: CurrencyState;
  relativeStrengthDelta: number | null;
  orientationDirection: PairOrientationDirection;
  supportingEvidence: string[];
  counterEvidence: string[];
  catalysts: CatalystEvent[];
  contradictions: StructuredContradiction[];
  invalidationConditions: StructuredInvalidationCondition[];
  fundamentalDiff?: FundamentalDifferential;
  isDataFeedConnected?: boolean;
  now?: Date;
}

export function evaluateStructuredThesis(params: ThesisEvaluationParams): StructuredThesis {
  const {
    pair,
    baseState,
    quoteState,
    relativeStrengthDelta,
    orientationDirection,
    supportingEvidence,
    counterEvidence,
    catalysts,
    contradictions,
    invalidationConditions,
    fundamentalDiff,
    isDataFeedConnected = true,
    now = new Date()
  } = params;

  const nowIso = now.toISOString();

  // Edge case: Data disconnected or insufficient inputs
  if (
    !isDataFeedConnected ||
    orientationDirection === 'DATA_UNAVAILABLE' ||
    relativeStrengthDelta === null ||
    baseState.marketStrength === null ||
    quoteState.marketStrength === null
  ) {
    return {
      pair: pair.symbol,
      direction: 'DATA_UNAVAILABLE',
      summary: `DATA UNAVAILABLE: Connect verified market and fundamental feeds to construct a structured macro thesis for ${pair.symbol}.`,
      supportingEvidence: [],
      counterEvidence: ['Market strength or fundamental data feeds are disconnected.'],
      catalysts: [],
      contradictions: [],
      assumptions: ['Awaiting data feed initialization.'],
      invalidationConditions,
      dataGaps: ['Real-time FX tick & snapshot feed', 'Macroeconomic calendar observations'],
      evidenceQuality: 'UNAVAILABLE',
      status: 'INSUFFICIENT_DATA',
      createdAt: nowIso,
      calculatedAt: nowIso,
      provenance: ['Velqoarath Store Health Monitor']
    };
  }

  // Identify data gaps
  const dataGaps: string[] = [];
  if (baseState.confidenceMetadata?.observationCount === 0) {
    dataGaps.push(`${pair.baseCurrency} fundamental observation coverage is empty.`);
  }
  if (quoteState.confidenceMetadata?.observationCount === 0) {
    dataGaps.push(`${pair.quoteCurrency} fundamental observation coverage is empty.`);
  }
  if (!baseState.centralBank?.currentPolicyRate) {
    dataGaps.push(`${pair.baseCurrency} policy rate not configured.`);
  }
  if (!quoteState.centralBank?.currentPolicyRate) {
    dataGaps.push(`${pair.quoteCurrency} policy rate not configured.`);
  }

  // Assess evidence quality
  let evidenceQuality: 'COMPLETE' | 'PARTIAL' | 'DEGRADED' | 'UNAVAILABLE' = 'COMPLETE';
  if (dataGaps.length > 2) {
    evidenceQuality = 'DEGRADED';
  } else if (dataGaps.length > 0) {
    evidenceQuality = 'PARTIAL';
  }

  // Determine thesis status
  const hasTriggeredInvalidation = invalidationConditions.some(
    (c) => c.triggered && c.severity === 'HIGH'
  );
  const hasTriggeredWeakening = invalidationConditions.some(
    (c) => c.triggered && c.severity === 'MEDIUM'
  );
  const severeContradictions = contradictions.filter((c) => c.severity === 'HIGH');

  let status: ThesisStatus = 'SUPPORTED';
  if (hasTriggeredInvalidation) {
    status = 'INVALIDATED';
  } else if (hasTriggeredWeakening || severeContradictions.length > 0) {
    status = 'WEAKENED';
  } else if (contradictions.length > 0 || counterEvidence.length > supportingEvidence.length) {
    status = 'MIXED';
  } else if (dataGaps.length > 1) {
    status = 'INSUFFICIENT_DATA';
  } else {
    status = 'SUPPORTED';
  }

  // Thesis Summary Construction
  let summary = '';
  const dirLabel =
    orientationDirection === 'BULLISH_BASE'
      ? `Bullish ${pair.baseCurrency}`
      : orientationDirection === 'BEARISH_BASE'
      ? `Bearish ${pair.baseCurrency} / Bullish ${pair.quoteCurrency}`
      : 'Neutral / Range-Bound';

  const deltaStr = `${relativeStrengthDelta >= 0 ? '+' : ''}${relativeStrengthDelta.toFixed(2)}%`;

  if (orientationDirection === 'BULLISH_BASE') {
    summary = `Macro stance favors ${pair.baseCurrency} over ${pair.quoteCurrency}. Relative basket strength differential (+${deltaStr}) is supported by ${
      fundamentalDiff?.fundamentalDifferential?.summary || 'positive fundamental impulses'
    }. ${contradictions.length > 0 ? `Caution: ${contradictions.length} contradiction(s) active.` : 'Cross-asset indicators align with upward directional vector.'}`;
  } else if (orientationDirection === 'BEARISH_BASE') {
    summary = `Macro stance favors ${pair.quoteCurrency} over ${pair.baseCurrency}. Relative basket strength drag (${deltaStr}) reflects ${
      fundamentalDiff?.fundamentalDifferential?.summary || 'divergent macro trajectories'
    }. ${contradictions.length > 0 ? `Caution: ${contradictions.length} contradiction(s) active.` : 'Monetary and fundamental differential reinforce downward directional vector.'}`;
  } else {
    summary = `Balanced evidence for ${pair.symbol}: Symmetrical market strength differential (${deltaStr}) and cross-cutting fundamentals maintain a neutral, range-bound backdrop.`;
  }

  const assumptions = [
    'Central bank policy reaction function remains data-dependent.',
    'Market pricing reflects observable macroeconomic fundamentals without unannounced intervention.',
    'Liquidity conditions conform to active institutional trading session standards.'
  ];

  const provenance = [
    'Biquote Live Market Snapshots',
    'Finance Calendar Macroeconomic Prints',
    'Official Central Bank Communications',
    'Velqoarath Intelligence Engine'
  ];

  return {
    pair: pair.symbol,
    direction: orientationDirection,
    summary,
    supportingEvidence,
    counterEvidence,
    catalysts,
    contradictions,
    assumptions,
    invalidationConditions,
    dataGaps,
    evidenceQuality,
    status,
    createdAt: nowIso,
    calculatedAt: nowIso,
    provenance
  };
}
