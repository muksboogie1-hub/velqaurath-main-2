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

  // Edge Case: every evidence layer is genuinely unavailable.
  //
  // Missing or stale MARKET evidence alone is not a data deficiency. Live
  // fundamentals, policy, catalysts and session context remain independently
  // usable, so the opportunity state degrades instead of collapsing to
  // INSUFFICIENT_DATA.
  if (
    orientationDirection === 'DATA_UNAVAILABLE' ||
    !confluence ||
    confluence.directionalConfidence === 'DATA_UNAVAILABLE'
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
  /*
   * Only a spread backed by verified LIVE policy evidence counts as
   * independent evidence. A reference-profile spread does not.
   */
  const livePolicySpreadForEvidence =
    intelligence.fundamentalDifferential?.policyDifferential?.livePolicySpread ?? null;
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

  const marketEvidenceAvailable = relativeStrengthDelta !== null;
  const marketEvidenceStale =
    baseState.marketDataFreshness === 'STALE' ||
    quoteState.marketDataFreshness === 'STALE';

  if (!marketEvidenceAvailable) {
    dataGaps.push(
      `Live market-strength evidence for ${pair.symbol} is ${
        marketEvidenceStale ? 'stale' : 'unavailable'
      }`
    );
  }

  /*
   * Independent evidence is sufficient when any non-market layer carries a
   * verified signal. A missing market layer reduces conviction; it does not
   * make the pair unobservable.
   */
  const hasIndependentEvidence =
    fundDelta !== null ||
    livePolicySpreadForEvidence !== null ||
    catalystIntelligence.length > 0 ||
    (baseState.confidenceMetadata?.observationCount ?? 0) > 0 ||
    (quoteState.confidenceMetadata?.observationCount ?? 0) > 0;

  const hasNoEvidenceAtAll = !hasIndependentEvidence && !marketEvidenceAvailable;

  let state: OpportunityState = 'MONITOR';
  let whyThisPair = '';
  const watchFactors: string[] = [];

  // Populate structured watch factors transparently
  watchFactors.push(
    marketEvidenceAvailable
      ? `Market: ${pair.baseCurrency} (${baseState.marketStrength !== null ? `${baseState.marketStrength >= 0 ? '+' : ''}${baseState.marketStrength.toFixed(2)}%` : 'N/A'}) vs ${pair.quoteCurrency} (${quoteState.marketStrength !== null ? `${quoteState.marketStrength >= 0 ? '+' : ''}${quoteState.marketStrength.toFixed(2)}%` : 'N/A'}) [Relative Δ: ${relativeStrengthDelta! >= 0 ? '+' : ''}${relativeStrengthDelta!.toFixed(2)}%]`
      : `Market: live market-strength evidence is ${
          marketEvidenceStale ? 'stale' : 'unavailable'
        } for ${pair.symbol}; no relative Δ is claimed and the ${
          confluence?.components?.marketStrength?.points ?? 0
        }/${confluence?.components?.marketStrength?.maxPoints ?? 25} market layer is unearned rather than redistributed.`
  );

  if (fundDelta !== null) {
    watchFactors.push(
      `Fundamentals: Differential score of ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)} (${pair.baseCurrency} vs ${pair.quoteCurrency})`
    );
  } else {
    watchFactors.push(`Fundamentals: Partial or unpopulated statistical series for currency pair`);
  }

  /*
   * POLICY / CARRY
   *
   * Only a spread derived from verified LIVE policy evidence is presented as
   * current carry. A reference-profile spread is labelled as reference
   * context, and a missing policy layer is stated as unavailable. A null rate
   * is never rendered as "null%" and never as 0%.
   */
  const policyDifferential = intelligence.fundamentalDifferential?.policyDifferential;
  const livePolicySpread = policyDifferential?.livePolicySpread ?? null;
  const referencePolicySpread = policyDifferential?.rateSpread ?? null;

  const formatRate = (value: number | null | undefined): string =>
    typeof value === 'number' && Number.isFinite(value)
      ? `${value.toFixed(2)}%`
      : 'unavailable';

  if (livePolicySpread !== null) {
    watchFactors.push(
      `Policy / Carry (LIVE): Verified nominal rate spread of ${
        livePolicySpread >= 0 ? '+' : ''
      }${livePolicySpread.toFixed(2)}% (${policyDifferential?.baseSource || baseState.centralBank?.institution || pair.baseCurrency}: ${formatRate(
        policyDifferential?.baseRate
      )} vs ${policyDifferential?.quoteSource || quoteState.centralBank?.institution || pair.quoteCurrency}: ${formatRate(
        policyDifferential?.quoteRate
      )})`
    );
  } else if (referencePolicySpread !== null) {
    watchFactors.push(
      `Policy / Carry (REFERENCE ONLY, not live evidence): Reference-profile nominal rate spread of ${
        referencePolicySpread >= 0 ? '+' : ''
      }${referencePolicySpread.toFixed(2)}% (${baseState.centralBank?.institution || pair.baseCurrency}: ${formatRate(
        baseState.centralBank?.contextualPolicyRate ??
          baseState.centralBank?.currentPolicyRate
      )} vs ${quoteState.centralBank?.institution || pair.quoteCurrency}: ${formatRate(
        quoteState.centralBank?.contextualPolicyRate ??
          quoteState.centralBank?.currentPolicyRate
      )}). No verified live policy release is available for at least one leg, so this spread earns no confluence points and is not current carry.`
    );
  } else {
    watchFactors.push(
      `Policy / Carry: UNAVAILABLE — no verified live policy rate and no usable reference profile for ${pair.symbol}. The ${confluence?.components?.policy?.points ?? 0}/${confluence?.components?.policy?.maxPoints ?? 20} policy layer is unearned rather than redistributed.`
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

  if (hasNoEvidenceAtAll) {
    state = 'INSUFFICIENT_DATA';
    whyThisPair = 'INSUFFICIENT DATA: No verified market, fundamental, or policy evidence is available. Opportunity analysis cannot run without at least one usable layer.';
  } else if (dataQuality === 'UNAVAILABLE') {
    state = 'INSUFFICIENT_DATA';
    whyThisPair = 'INSUFFICIENT DATA: Market or macro feeds offline. Opportunity analysis cannot run without verified inputs.';
  } else if (severeContradictions.length > 0 || hasFundamentalDivergence) {
    state = 'WAIT';
    whyThisPair = `WAIT (CONTRADICTION / DIVERGENCE DETECTED): Opposing macroeconomic forces or severe price/fundamental divergence require caution.`;
  } else if (orientationDirection === 'NEUTRAL') {
    state = 'MONITOR';
    whyThisPair = marketEvidenceAvailable
      ? `MONITOR: Neutral directional orientation for ${pair.symbol} (Δ = ${relativeStrengthDelta!.toFixed(2)}%). Balanced cross-basket price action with no directional skew.`
      : `MONITOR: Neutral macro-derived orientation for ${pair.symbol}; live market-strength evidence is ${
          marketEvidenceStale ? 'stale' : 'unavailable'
        } and no price confirmation is claimed.`;
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
    marketEvidenceAvailable &&
    Math.abs(relativeStrengthDelta!) >= 0.10 &&
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
    whyThisPair = marketEvidenceAvailable
      ? `SECONDARY WATCH: Moderate confluence (${score}/100) with coherent macro alignment and manageable event risk.`
      : `SECONDARY WATCH (MACRO-ONLY): Macro/policy confluence of ${score}/100 with coherent independent evidence, but live market confirmation is ${
          marketEvidenceStale ? 'stale' : 'unavailable'
        }, so this is a macro-derived watch state rather than a market-confirmed one.`;
  } else if (
    !marketEvidenceAvailable &&
    hasIndependentEvidence &&
    livePolicySpreadForEvidence !== null &&
    (thesisStatus === 'SUPPORTED' ||
      thesisStatus === 'VALIDATED' ||
      thesisStatus === 'TENTATIVE' ||
      thesisStatus === 'MIXED') &&
    !hasFundamentalDivergence
  ) {
    /*
     * Macro-only watch state. The 100-point scale includes the 25 market
     * points this pair cannot earn, so the raw total understates the coherence
     * of the independent evidence that IS present. A pair with a verified live
     * policy spread and a directional macro-derived orientation is worth
     * watching on its own evidence; it is not range-bound, and it is not
     * insufficient. The missing market layer stays explicit and unearned.
     */
    state = 'SECONDARY_WATCH';
    whyThisPair = `SECONDARY WATCH (MACRO-ONLY): Verified live policy carry of ${
      livePolicySpreadForEvidence! >= 0 ? '+' : ''
    }${livePolicySpreadForEvidence!.toFixed(2)}% with a ${orientationDirection} macro-derived orientation, but live market confirmation is ${
      marketEvidenceStale ? 'stale' : 'unavailable'
    }. The ${score}/100 total leaves the 25 market points unearned and unredistributed.`;
  } else {
    state = 'MONITOR';
    whyThisPair = `MONITOR: Range-bound or neutral evidence profile (${score}/100 confluence). Watching for structural catalyst breakout.`;
  }

  // Derive Stage 2 Opportunity Classification
  let opportunityClassification: 'EXPANSION' | 'MEAN_REVERSION' | 'MONITOR_ONLY' | 'WAIT_FOR_CATALYST' | 'NO_SETUP' | 'DATA_DEFICIENT';
  if (hasNoEvidenceAtAll) {
    opportunityClassification = 'DATA_DEFICIENT';
  } else if (dataQuality === 'UNAVAILABLE') {
    opportunityClassification = 'DATA_DEFICIENT';
  } else if (imminentCatalysts.length > 0) {
    opportunityClassification = 'WAIT_FOR_CATALYST';
  } else if (
    hasFundamentalDivergence ||
    (severeContradictions.length > 0 &&
      marketEvidenceAvailable &&
      Math.abs(relativeStrengthDelta!) >= 0.15)
  ) {
    opportunityClassification = 'MEAN_REVERSION';
  } else if (
    score >= 65 &&
    (thesisStatus === 'SUPPORTED' || thesisStatus === 'VALIDATED') &&
    marketEvidenceAvailable &&
    Math.abs(relativeStrengthDelta!) >= 0.10
  ) {
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
    freshness: (
      intelligence.freshness === 'FRESH' ||
      intelligence.freshness === 'AGING' ||
      intelligence.freshness === 'STALE' ||
      intelligence.freshness === 'UNAVAILABLE'
        ? intelligence.freshness
        : marketEvidenceAvailable
        ? 'FRESH'
        : 'STALE'
    ) as 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE',
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
