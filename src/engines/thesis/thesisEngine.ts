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
    supportingEvidence = [],
    counterEvidence = [],
    catalysts = [],
    contradictions = [],
    invalidationConditions = [],
    fundamentalDiff,
    isDataFeedConnected = true,
    now = new Date()
  } = params;

  const nowIso = now.toISOString();

  // Edge case: every evidence layer is genuinely unavailable.
  //
  // Missing or stale MARKET evidence alone does not invalidate a thesis.
  // Live fundamentals, policy, catalysts or session evidence remain
  // independently usable, so only a truly disconnected feed set or a
  // DATA_UNAVAILABLE orientation short-circuits here.
  if (
    !isDataFeedConnected ||
    orientationDirection === 'DATA_UNAVAILABLE'
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
  if (baseState.centralBank?.currentPolicyRate === null || baseState.centralBank?.currentPolicyRate === undefined) {
    dataGaps.push(`${pair.baseCurrency} policy rate not configured.`);
  }
  if (quoteState.centralBank?.currentPolicyRate === null || quoteState.centralBank?.currentPolicyRate === undefined) {
    dataGaps.push(`${pair.quoteCurrency} policy rate not configured.`);
  }

  /*
   * Market evidence is tracked separately from macro evidence. An
   * unavailable market layer is a real gap, but it does not erase the
   * independent fundamental/policy/catalyst evidence.
   */
  const marketEvidenceMissing =
    relativeStrengthDelta === null ||
    baseState.marketStrength === null ||
    quoteState.marketStrength === null;

  const marketEvidenceStale =
    baseState.marketDataFreshness === 'STALE' ||
    quoteState.marketDataFreshness === 'STALE';

  if (marketEvidenceMissing) {
    dataGaps.push(
      `${pair.symbol} live market-strength evidence is ${
        marketEvidenceStale ? 'stale' : 'unavailable'
      }; the thesis is macro-derived.`
    );
  }

  // Assess evidence quality
  let evidenceQuality: 'COMPLETE' | 'PARTIAL' | 'DEGRADED' | 'UNAVAILABLE' = 'COMPLETE';
  if (dataGaps.length > 2) {
    evidenceQuality = 'DEGRADED';
  } else if (dataGaps.length > 0) {
    evidenceQuality = 'PARTIAL';
  }

  if (supportingEvidence.length === 0 && counterEvidence.length === 0) {
    evidenceQuality = 'DEGRADED';
  }

  // Determine thesis status
  /*
   * A non-directional (NEUTRAL) thesis has no directional edge that a
   * market-strength condition can invalidate. Only a non-market invalidation,
   * or an invalidation against a directional orientation, may claim that a
   * thesis was invalidated.
   */
  const hasDirectionalOrientation =
    orientationDirection === 'BULLISH_BASE' ||
    orientationDirection === 'BEARISH_BASE';

  const hasTriggeredInvalidation = invalidationConditions.some(
    (c) =>
      c.triggered &&
      c.severity === 'HIGH' &&
      c.evaluationStatus !== 'UNABLE_TO_EVALUATE' &&
      (hasDirectionalOrientation || c.category !== 'MARKET_STRENGTH')
  );
  const hasTriggeredWeakening = invalidationConditions.some(
    (c) => c.triggered && c.severity === 'MEDIUM'
  );
  const severeContradictions = contradictions.filter((c) => c.severity === 'HIGH');

  /*
   * Evidence is independent per layer. Valid market evidence IS evidence, so
   * it must count here: missing macro observations alone cannot collapse a
   * market-confirmed thesis into INSUFFICIENT_DATA.
   */
  const hasMarketEvidence =
    relativeStrengthDelta !== null &&
    baseState.marketStrength !== null &&
    quoteState.marketStrength !== null;

  const hasIndependentMacroEvidence =
    supportingEvidence.length > 0 ||
    counterEvidence.length > 0 ||
    (fundamentalDiff !== undefined &&
      fundamentalDiff !== null &&
      !!fundamentalDiff?.fundamentalDifferential);

  /*
   * INSUFFICIENT_DATA requires that BOTH the market layer and the independent
   * macro/policy layers are genuinely unavailable. Either one alone is enough
   * to construct a thesis, at a reduced status when data gaps remain.
   */
  const hasAnyEvidence = hasMarketEvidence || hasIndependentMacroEvidence;

  let status: ThesisStatus = 'SUPPORTED';
  if (!hasAnyEvidence) {
    status = 'INSUFFICIENT_DATA';
  } else if (hasTriggeredInvalidation) {
    status = 'INVALIDATED';
  } else if (hasTriggeredWeakening || severeContradictions.length > 0) {
    status = 'WEAKENED';
  } else if (contradictions.length > 0 || counterEvidence.length > supportingEvidence.length) {
    status = 'MIXED';
  } else if (
    marketEvidenceMissing ||
    !hasIndependentMacroEvidence ||
    dataGaps.length > 1
  ) {
    // Evidence exists, but layers are missing or partial: the thesis is
    // explicitly tentative rather than invalid or insufficient.
    status = 'TENTATIVE';
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

  const deltaStr =
    relativeStrengthDelta === null
      ? null
      : `${relativeStrengthDelta >= 0 ? '+' : ''}${relativeStrengthDelta.toFixed(2)}%`;

  /*
   * A missing market layer is never described as a 0.00% differential and
   * never described as balanced market evidence. The summary states the
   * market state and attributes the bias to the independent macro layers.
   */
  const marketClause =
    deltaStr === null
      ? `Live relative-strength evidence is ${
          marketEvidenceStale ? 'stale' : 'unavailable'
        }, so this bias is macro-derived rather than market-confirmed. `
      : `Relative basket strength differential (${deltaStr}) `;

  /*
   * The fundamental differential summary already ends with a full stop. It is
   * normalized here so the composed summary never emits doubled punctuation.
   */
  const macroClause = (
    fundamentalDiff?.fundamentalDifferential?.summary ||
    'verified fundamental and policy impulses'
  ).replace(/\.\s*$/, '');

  if (orientationDirection === 'BULLISH_BASE') {
    summary = `Macro stance favors ${pair.baseCurrency} over ${pair.quoteCurrency}. ${marketClause}is supported by ${macroClause}. ${
      contradictions.length > 0 ? `Caution: ${contradictions.length} contradiction(s) active.` : 'Cross-asset indicators align with upward directional vector.'}`;
  } else if (orientationDirection === 'BEARISH_BASE') {
    summary = `Macro stance favors ${pair.quoteCurrency} over ${pair.baseCurrency}. ${marketClause}reflects ${macroClause}. ${
      contradictions.length > 0 ? `Caution: ${contradictions.length} contradiction(s) active.` : 'Monetary and fundamental differential reinforce downward directional vector.'}`;
  } else if (deltaStr === null) {
    summary = `Balanced macro evidence for ${pair.symbol}: ${macroClause} does not establish a decisive directional differential, and live market-strength evidence is ${
      marketEvidenceStale ? 'stale' : 'unavailable'
    }.`;
  } else {
    summary = `Balanced evidence for ${pair.symbol}: Symmetrical market strength differential (${deltaStr}) and cross-cutting fundamentals maintain a neutral, range-bound backdrop.`;
  }

  const assumptions = [
    'Central bank policy reaction function remains data-dependent.',
    'Market pricing reflects observable macroeconomic fundamentals without unannounced intervention.',
    'Liquidity conditions conform to active institutional trading session standards.'
  ];

  if (deltaStr === null) {
    assumptions.push(
      `Restored live market data for ${pair.symbol} is required before any price-confirmation claim can be made.`
    );
  }

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
