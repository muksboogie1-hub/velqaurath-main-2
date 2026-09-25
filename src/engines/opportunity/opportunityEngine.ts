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
      directionalBias: 'DATA_UNAVAILABLE',
      confluenceScore: 0,
      directionalConfidence: 'DATA_UNAVAILABLE',
      whyThisPair: 'DATA UNAVAILABLE: Connect verified market and fundamental feeds to calculate opportunity watch states.',
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
  const imminentCatalysts = catalystIntelligence.filter((c) => c.lifecycle === 'IMMINENT' && c.importance === 'HIGH');

  let state: OpportunityState = 'MONITOR';
  let whyThisPair = '';

  if (hasInvalidated || thesisStatus === 'INVALIDATED') {
    state = 'WAIT';
    whyThisPair = `WAIT: Thesis invalidation conditions triggered for ${pair.symbol}. Awaiting stabilization or new structural regime.`;
  } else if (imminentCatalysts.length > 0) {
    state = 'MONITOR';
    whyThisPair = `MONITOR (EVENT RISK): Imminent high-impact release (${imminentCatalysts[0].name}) within execution window. Elevated binary risk.`;
  } else if (severeContradictions.length > 0 || hasWeakened || thesisStatus === 'WEAKENED') {
    state = 'WAIT';
    whyThisPair = `WAIT (CONTRADICTION DETECTED): Opposing macroeconomic forces or severe price/fundamental divergence require caution.`;
  } else if (orientationDirection === 'NEUTRAL') {
    state = 'MONITOR';
    whyThisPair = `MONITOR: Neutral directional orientation for ${pair.symbol} (Δ = ${relativeStrengthDelta.toFixed(2)}%). Balanced cross-basket price action with no directional skew.`;
  } else if (score >= 70 && thesisStatus === 'SUPPORTED' && Math.abs(relativeStrengthDelta) >= 0.10) {
    state = 'PRIMARY_WATCH';
    whyThisPair = `PRIMARY WATCH: High multi-factor confluence (${score}/100) aligned with ${orientationDirection} orientation and zero severe contradictions.`;
  } else if (score >= 50 && (thesisStatus === 'SUPPORTED' || thesisStatus === 'MIXED')) {
    state = 'SECONDARY_WATCH';
    whyThisPair = `SECONDARY WATCH: Moderate confluence (${score}/100) with coherent macro alignment and manageable event risk.`;
  } else {
    state = 'MONITOR';
    whyThisPair = `MONITOR: Range-bound or neutral evidence profile (${score}/100 confluence). Watching for structural catalyst breakout.`;
  }

  const supportingFactors = intelligence.supportingEvidence || [];
  const counterFactors = intelligence.counterEvidence || [];
  const currentRisks = [
    ...(intelligence.risks || []),
    ...structuredContradictions.map((c) => c.conflictDescription)
  ];

  return {
    pair: pair.symbol,
    state,
    directionalBias: orientationDirection,
    confluenceScore: score,
    directionalConfidence: confluence.directionalConfidence,
    whyThisPair,
    supportingFactors,
    counterFactors,
    currentRisks,
    catalysts: catalystIntelligence,
    thesisState: thesisStatus,
    invalidationState: hasInvalidated ? 'INVALIDATED' : hasWeakened ? 'WEAKENED' : 'VALID',
    dataQuality: (confluence.dataQuality as any) || 'COMPLETE',
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
