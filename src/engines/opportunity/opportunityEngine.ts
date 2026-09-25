/**
 * VELQOARATH — OPPORTUNITY INTELLIGENCE ENGINE
 *
 * Evaluates pairs across confluence, thesis validity, contradiction severity,
 * event risk, and session context to determine operational watch states.
 *
 * PHILOSOPHY:
 * - NOT a trade execution bot, buy/sell signal generator, or probability calculator.
 * - Identifies "Which pairs deserve analytical attention right now?"
 * - States:
 *   - PRIMARY_WATCH: High confluence, clean thesis (SUPPORTED), active session, minimal binary event risk.
 *   - SECONDARY_WATCH: Strong directional evidence, but with minor contradictions or pending watch window.
 *   - MONITOR: Range-bound, mixed thesis, or imminent binary catalyst ahead requiring observation.
 *   - WAIT: Invalidation triggered or severe contradiction present.
 *   - INSUFFICIENT_DATA: Missing quotes or disconnected upstream feeds.
 */

import { PairIntelligence } from '../../types';
import {
  StructuredOpportunity,
  OpportunityState,
  CatalystEvent
} from '../../types/intelligence';

export function evaluatePairOpportunity(intelligence: PairIntelligence): StructuredOpportunity {
  const {
    pair,
    baseState,
    quoteState,
    orientationDirection,
    confluence,
    structuredThesis,
    structuredInvalidation,
    structuredContradictions = [],
    catalystIntelligence = [],
    sessionRelevance,
    relativeStrengthDelta
  } = intelligence;

  const nowIso = new Date().toISOString();

  // Edge Case: Feeds offline or missing market strength
  if (
    orientationDirection === 'DATA_UNAVAILABLE' ||
    !confluence ||
    confluence.directionalConfidence === 'DATA_UNAVAILABLE' ||
    relativeStrengthDelta === null
  ) {
    return {
      pair: pair.symbol,
      state: 'INSUFFICIENT_DATA',
      opportunityClassification: 'DATA_DEFICIENT',
      directionalBias: 'DATA_UNAVAILABLE',
      confluenceScore: 0,
      directionalConfidence: 'DATA_UNAVAILABLE',
      whyThisPair: 'DATA UNAVAILABLE: Connect verified market and fundamental feeds to calculate opportunity watch states.',
      watchReason: 'DATA UNAVAILABLE: Connect verified market and fundamental feeds to calculate opportunity watch states.',
      watchFactors: ['Upstream market or fundamental provider feeds disconnected.'],
      keyCatalysts: [],
      risks: ['Data feed offline; monitoring suspended.'],
      invalidationRules: ['Data feeds disconnected.'],
      supportingFactors: [],
      counterFactors: ['Upstream market or fundamental provider feeds disconnected.'],
      currentRisks: ['Data feed offline; monitoring suspended.'],
      catalysts: [],
      thesisState: 'INSUFFICIENT_DATA',
      invalidationState: 'UNABLE_TO_EVALUATE',
      dataQuality: 'UNAVAILABLE',
      freshness: 'UNAVAILABLE',
      sessionRelevance: sessionRelevance?.primarySession || 'N/A',
      generatedAt: nowIso
    };
  }

  const score = confluence.confluenceScore;
  const thesisStatus = structuredThesis?.status || 'MIXED';
  const hasInvalidated = structuredInvalidation?.some((c) => c.triggered && c.severity === 'HIGH');
  const hasWeakened = structuredInvalidation?.some((c) => c.triggered && c.severity === 'MEDIUM');
  const severeContradictions = structuredContradictions.filter((c) => c.severity === 'HIGH');
  const moderateContradictions = structuredContradictions.filter((c) => c.severity === 'MEDIUM');
  const imminentCatalysts = catalystIntelligence.filter((c) => c.lifecycle === 'IMMINENT' && c.importance === 'HIGH');
  const fundDelta = intelligence.fundamentalDifferential?.fundamentalDifferential?.delta ?? null;
  const policySpread = intelligence.fundamentalDifferential?.policyDifferential?.rateSpread ?? null;
  const dataQuality = (confluence.dataQuality as any) || 'COMPLETE';

  const dataGaps: string[] = [];
  if (confluence?.missingComponents && confluence.missingComponents.length > 0) {
    dataGaps.push(...confluence.missingComponents.map((c) => `Missing ${c} component`));
  }
  if ((baseState.confidenceMetadata?.observationCount ?? 0) === 0) {
    dataGaps.push(`No live macroeconomic observations for ${pair.baseCurrency}`);
  }
  if ((quoteState.confidenceMetadata?.observationCount ?? 0) === 0) {
    dataGaps.push(`No live macroeconomic observations for ${pair.quoteCurrency}`);
  }

  let state: OpportunityState = 'MONITOR';
  let whyThisPair = '';
  const watchFactors: string[] = [];

  // Populate structured watch factors transparently
  watchFactors.push(
    `Market: ${pair.baseCurrency} (${baseState.marketStrength !== null ? `${baseState.marketStrength >= 0 ? '+' : ''}${baseState.marketStrength.toFixed(2)}%` : 'N/A'}) vs ${pair.quoteCurrency} (${quoteState.marketStrength !== null ? `${quoteState.marketStrength >= 0 ? '+' : ''}${quoteState.marketStrength.toFixed(2)}%` : 'N/A'}) [Relative Δ: ${relativeStrengthDelta >= 0 ? '+' : ''}${relativeStrengthDelta.toFixed(2)}%]`
  );

  if (fundDelta !== null) {
    watchFactors.push(
      `Fundamentals: Differential score of ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)} (${pair.baseCurrency} vs ${pair.quoteCurrency})`
    );
  } else {
    watchFactors.push(`Fundamentals: Partial or unpopulated statistical series for currency pair`);
  }

  if (policySpread !== null) {
    watchFactors.push(
      `Policy / Carry: Nominal rate spread of ${policySpread >= 0 ? '+' : ''}${policySpread.toFixed(2)}% (${baseState.centralBank?.institution}: ${baseState.centralBank?.currentPolicyRate}% vs ${quoteState.centralBank?.institution}: ${quoteState.centralBank?.currentPolicyRate}%)`
    );
  }

  watchFactors.push(`Session: Primary financial center is ${sessionRelevance?.primarySession || 'N/A'}`);

  if (imminentCatalysts.length > 0) {
    watchFactors.push(`Catalyst Alert: High binary event risk ahead (${imminentCatalysts[0].name})`);
  } else {
    watchFactors.push(`Catalyst: Clean event runway (${catalystIntelligence.length} events scheduled in window)`);
  }

  if (structuredContradictions.length > 0) {
    watchFactors.push(`Contradictions: ${structuredContradictions.length} cross-current conflict(s) detected`);
  }

  watchFactors.push(`Data Quality: Evaluated at ${dataQuality} provenance grade`);

  // Decision logic considering combined intelligence
  // Rule: A pair with huge market movement but weak/contradictory fundamental evidence should NOT automatically become PRIMARY_WATCH.
  const hasFundamentalDivergence =
    fundDelta !== null &&
    ((orientationDirection === 'BULLISH_BASE' && fundDelta < -0.04) ||
      (orientationDirection === 'BEARISH_BASE' && fundDelta > 0.04));

  if (dataQuality === 'UNAVAILABLE') {
    state = 'INSUFFICIENT_DATA';
    whyThisPair = 'INSUFFICIENT DATA: Market or macro feeds offline. Opportunity analysis cannot run without verified inputs.';
  } else if (severeContradictions.length > 0 || hasFundamentalDivergence) {
    state = 'WAIT';
    whyThisPair = `WAIT (CONTRADICTION / DIVERGENCE DETECTED): Opposing macroeconomic forces or severe price/fundamental divergence require caution.`;
  } else if (orientationDirection === 'NEUTRAL') {
    state = 'MONITOR';
    whyThisPair = `MONITOR: Neutral directional orientation for ${pair.symbol} (Δ = ${relativeStrengthDelta.toFixed(2)}%). Balanced cross-basket price action with no directional skew.`;
  } else if (hasInvalidated || thesisStatus === 'INVALIDATED') {
    state = 'WAIT';
    whyThisPair = `WAIT: Thesis invalidation conditions triggered for ${pair.symbol}. Awaiting stabilization or new structural regime.`;
  } else if (hasWeakened || thesisStatus === 'WEAKENED') {
    state = 'WAIT';
    whyThisPair = `WAIT: Thesis weakened by emerging macro cross-currents or moderate invalidation triggers.`;
  } else if (imminentCatalysts.length > 0) {
    state = 'MONITOR';
    whyThisPair = `MONITOR (EVENT RISK): Imminent high-impact release (${imminentCatalysts[0].name}) within execution window. Elevated binary risk.`;
  } else if (
    score >= 70 &&
    (thesisStatus === 'SUPPORTED' || thesisStatus === 'VALIDATED') &&
    Math.abs(relativeStrengthDelta) >= 0.10 &&
    moderateContradictions.length === 0 &&
    !hasFundamentalDivergence
  ) {
    state = 'PRIMARY_WATCH';
    whyThisPair = `PRIMARY WATCH: High multi-factor confluence (${score}/100) aligned with ${orientationDirection} orientation and zero severe contradictions.`;
  } else if (
    score >= 50 &&
    (thesisStatus === 'SUPPORTED' || thesisStatus === 'VALIDATED' || thesisStatus === 'TENTATIVE' || thesisStatus === 'MIXED') &&
    !hasFundamentalDivergence
  ) {
    state = 'SECONDARY_WATCH';
    whyThisPair = `SECONDARY WATCH: Moderate confluence (${score}/100) with coherent macro alignment and manageable event risk.`;
  } else {
    state = 'MONITOR';
    whyThisPair = `MONITOR: Range-bound or neutral evidence profile (${score}/100 confluence). Watching for structural catalyst breakout.`;
  }

  // Derive Stage 2 Opportunity Classification
  let opportunityClassification: 'EXPANSION' | 'MEAN_REVERSION' | 'MONITOR_ONLY' | 'WAIT_FOR_CATALYST' | 'NO_SETUP' | 'DATA_DEFICIENT';
  if (dataQuality === 'UNAVAILABLE' || relativeStrengthDelta === null) {
    opportunityClassification = 'DATA_DEFICIENT';
  } else if (imminentCatalysts.length > 0) {
    opportunityClassification = 'WAIT_FOR_CATALYST';
  } else if (hasFundamentalDivergence || (severeContradictions.length > 0 && Math.abs(relativeStrengthDelta) >= 0.15)) {
    opportunityClassification = 'MEAN_REVERSION';
  } else if (score >= 65 && (thesisStatus === 'SUPPORTED' || thesisStatus === 'VALIDATED') && Math.abs(relativeStrengthDelta) >= 0.10) {
    opportunityClassification = 'EXPANSION';
  } else if (hasInvalidated || thesisStatus === 'INVALIDATED' || severeContradictions.length > 0) {
    opportunityClassification = 'NO_SETUP';
  } else {
    opportunityClassification = 'MONITOR_ONLY';
  }

  const supportingFactors = intelligence.supportingEvidence || [];
  const counterFactors = intelligence.counterEvidence || [];
  const currentRisks = [
    ...(intelligence.risks || []),
    ...structuredContradictions.map((c) => c.conflictDescription)
  ];
  const invalidationRules = (structuredInvalidation || []).map(
    (c: any) => `${c.triggerCondition || c.condition || c.description} [${c.severity}]: ${c.description || c.invalidationImplication || 'Invalidates current thesis'}`
  );

  return {
    pair: pair.symbol,
    state,
    opportunityClassification,
    directionalBias: orientationDirection,
    confluenceScore: score,
    directionalConfidence: confluence.directionalConfidence,
    whyThisPair,
    watchReason: whyThisPair,
    watchFactors,
    dataGaps,
    keyCatalysts: imminentCatalysts.length > 0 ? imminentCatalysts : catalystIntelligence.slice(0, 3),
    risks: currentRisks,
    invalidationRules,
    supportingFactors,
    counterFactors,
    currentRisks,
    catalysts: catalystIntelligence,
    thesisState: thesisStatus,
    invalidationState: hasInvalidated ? 'INVALIDATED' : hasWeakened ? 'WEAKENED' : 'VALID',
    dataQuality,
    freshness: 'FRESH',
    sessionRelevance: sessionRelevance?.primarySession || 'N/A',
    generatedAt: nowIso
  };
}

export function evaluateAllOpportunities(intelligences: PairIntelligence[]): StructuredOpportunity[] {
  return intelligences
    .map(evaluatePairOpportunity)
    .sort((a, b) => {
      // Priority ordering: PRIMARY_WATCH > SECONDARY_WATCH > MONITOR > WAIT > INSUFFICIENT_DATA
      const order: Record<OpportunityState, number> = {
        PRIMARY_WATCH: 1,
        SECONDARY_WATCH: 2,
        MONITOR: 3,
        WAIT: 4,
        INSUFFICIENT_DATA: 5
      };

      if (order[a.state] !== order[b.state]) {
        return order[a.state] - order[b.state];
      }
      return b.confluenceScore - a.confluenceScore;
    });
}
