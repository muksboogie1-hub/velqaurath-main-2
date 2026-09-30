/**
 * VELQOARATH — TRANSPARENT MULTI-FACTOR CONFLUENCE ENGINE
 *
 * Combines 9 distinct intelligence inputs into a documented, explainable
 * Directional Confidence / Confluence Assessment.
 *
 * PHILOSOPHY & GOVERNANCE:
 * - NO INVENTED PROBABILITIES: Does not calculate "win rate" or "profit probability".
 * - All weights are explicit, deterministic, and auditable.
 * - Components expose points scored, maximum points, and textual justification.
 * - Contradictions apply explicit penalization.
 * - Data freshness and quality adjust final confidence factor.
 * - FX Pair orientation (BASE vs QUOTE) strictly preserved.
 */

import {
  CurrencyPair,
  CurrencyState,
  EconomicEvent,
  PairOrientationDirection,
  ConfluenceAssessment,
  ConfluenceComponent,
  ConfluenceComponentAvailability,
  DirectionalConfidenceLevel,
  FundamentalDifferential
} from '../../types';
import { getPairSessionRelevance } from '../session/sessionEngine';
import { getActiveSessionOverview } from '../../data/sessions';
import { LivePolicyEvidence } from '../../fundamentals/engine/policyEvidence';

export interface ConfluenceEngineParams {
  pair: CurrencyPair;
  baseState: CurrencyState;
  quoteState: CurrencyState;
  relativeStrengthDelta: number | null;
  orientationDirection: PairOrientationDirection;
  events?: EconomicEvent[];
  fundamentalDiff?: FundamentalDifferential;
  marketDataTimestamp?: string | null;
  fundamentalDataTimestamp?: string | null;
  date?: Date;
  isDataFeedConnected?: boolean;
  /**
   * Verified live policy evidence per currency leg. Supplied when the live
   * fundamental feed published a monetary-policy release, because the static
   * central-bank record alone is contextual and never earns live points.
   */
  basePolicyEvidence?: LivePolicyEvidence | null;
  quotePolicyEvidence?: LivePolicyEvidence | null;
  /**
   * Truthful market evidence state resolved by the caller from provider
   * coverage/snapshot health. Distinguishes STALE from a disconnected feed.
   */
  marketEvidenceState?: 'AVAILABLE' | 'STALE' | 'UNAVAILABLE';
}

export function calculatePairConfluence(params: ConfluenceEngineParams): ConfluenceAssessment {
  const {
    pair,
    baseState,
    quoteState,
    relativeStrengthDelta,
    orientationDirection,
    events = [],
    fundamentalDiff,
    marketDataTimestamp = null,
    fundamentalDataTimestamp = null,
    date = new Date(),
    isDataFeedConnected = true,
    basePolicyEvidence = null,
    quotePolicyEvidence = null,
    marketEvidenceState
  } = params;

  const nowIso = new Date().toISOString();

  /*
   * EVIDENCE LAYER INDEPENDENCE
   *
   * Only a fully disconnected data pipeline (every feed off) can invalidate the
   * whole assessment. A missing or stale MARKET layer no longer discards live
   * fundamental, policy, expectations, catalyst or session evidence, and the
   * score is never renormalized to hide the missing market points.
   */
  if (!isDataFeedConnected) {
    const emptyComponent = (
      name: string,
      maxPoints: number,
      weight: number
    ): ConfluenceComponent => ({
      points: 0,
      maxPoints,
      weightPercent: weight,
      availability: 'UNAVAILABLE',
      evidenceCount: 0,
      freshness: 'UNAVAILABLE',
      explanation: `${name} evidence unavailable: the verified data pipeline is disconnected.`
    });

    return {
      confluenceScore: 0,
      directionalConfidence: 'DATA_UNAVAILABLE',
      direction: orientationDirection,
      components: {
        marketStrength: emptyComponent('Market Strength', 25, 25),
        fundamentals: emptyComponent('Macro Fundamentals', 20, 20),
        policy: emptyComponent('Monetary Policy & Carry', 20, 20),
        expectations: emptyComponent('Macro Expectations', 15, 15),
        catalysts: emptyComponent('Catalysts & Events', 10, 10),
        session: emptyComponent('Session Relevance', 10, 10),
        contradictionPenalty: {
          penaltyPoints: 0,
          reasons: ['Data feeds offline; contradiction check suspended.']
        },
        dataQualityAdjustment: {
          factor: 0.0,
          quality: 'UNAVAILABLE',
          reason: 'Verified data feeds are disconnected or awaiting provider initialization.'
        }
      },
      dataQualityAdjustment: {
        factor: 0.0,
        quality: 'UNAVAILABLE',
        reason: 'Verified data feeds are disconnected or awaiting provider initialization.'
      },
      rawScoreBeforeAdjustments: 0,
      explanation:
        'DATA UNAVAILABLE: The verified data pipeline is disconnected, so no evidence layer can be scored. Maximum possible score remains 100; no points are awarded.',
      calculatedAt: nowIso,
      marketDataTimestamp,
      fundamentalDataTimestamp,
      dataQuality: 'UNAVAILABLE'
    };
  }


  // ----------------------------------------------------
  // COMPONENT 1: MARKET STRENGTH CONTRIBUTION (Weight: 25 pts)
  // Evaluates signed percentage-based divergence between BASE and QUOTE relative movements.
  // The market layer is evaluated INDEPENDENTLY. When it is unavailable the 25
  // available points stay unearned; they are never redistributed or reweighted.
  // ----------------------------------------------------
  const baseCoverage = baseState.relativeStrengthBreakdown?.coverage;
  const quoteCoverage = quoteState.relativeStrengthBreakdown?.coverage;
  const baseMkt = baseState.marketStrength ?? null;
  const quoteMkt = quoteState.marketStrength ?? null;
  const delta = relativeStrengthDelta;
  const marketHasValue = delta !== null && baseMkt !== null && quoteMkt !== null;
  const absDelta = delta === null ? null : Math.abs(delta);
  const baseStalePairs = baseCoverage?.stalePairs?.length ?? 0;
  const quoteStalePairs = quoteCoverage?.stalePairs?.length ?? 0;
  const baseMissingPairs = baseCoverage?.missingPairs?.length ?? 0;
  const quoteMissingPairs = quoteCoverage?.missingPairs?.length ?? 0;

  let mktPoints = 0;
  let mktExplanation = '';
  let mktAvailability: ConfluenceComponentAvailability = 'AVAILABLE';
  let mktFreshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE' = 'UNAVAILABLE';

  const isBullishBase = orientationDirection === 'BULLISH_BASE';
  const isBearishBase = orientationDirection === 'BEARISH_BASE';

  if (!marketHasValue) {
    /*
     * Market strength is genuinely missing. Zero points, maximum stays 25 so the
     * denominator remains honest, and the explanation states the real reason.
     */
    mktPoints = 0;
    mktAvailability = 'UNAVAILABLE';
    mktFreshness = 'UNAVAILABLE';
    mktExplanation =
      marketEvidenceState === 'STALE'
        ? 'Market Strength UNAVAILABLE (STALE QUOTES): the provider returned only stale FX quotes, so no current relative-strength differential can be computed. The 25 market points remain unearned and are not redistributed to other layers.'
        : 'Market Strength UNAVAILABLE: no current FX quote evidence is available for this pair. The 25 market points remain unearned and are not redistributed to other layers.';
  } else {
    const hasStaleQuotes = baseStalePairs > 0 || quoteStalePairs > 0;
    const hasMissingQuotes = baseMissingPairs > 0 || quoteMissingPairs > 0;
    mktFreshness = hasStaleQuotes ? 'AGING' : 'FRESH';
    mktAvailability = hasStaleQuotes || hasMissingQuotes ? 'PARTIAL' : 'AVAILABLE';

    // Check if delta reinforces the direction
    const deltaAligns =
      (isBullishBase && delta! > 0) || (isBearishBase && delta! < 0);

    if (deltaAligns) {
      if (absDelta! >= 0.30) {
        mktPoints = 25;
        mktExplanation = `Strong relative basket divergence (Δ = ${delta! >= 0 ? '+' : ''}${delta!.toFixed(2)}% ≥ 0.30%): Base ${pair.baseCurrency} (${baseMkt! >= 0 ? '+' : ''}${baseMkt!.toFixed(2)}%) decisively outpaces Quote ${pair.quoteCurrency} (${quoteMkt! >= 0 ? '+' : ''}${quoteMkt!.toFixed(2)}%).`;
      } else if (absDelta! >= 0.20) {
        mktPoints = 22;
        mktExplanation = `Substantial relative basket divergence (Δ = ${delta! >= 0 ? '+' : ''}${delta!.toFixed(2)}% ≥ 0.20%): ${pair.baseCurrency} (${baseMkt! >= 0 ? '+' : ''}${baseMkt!.toFixed(2)}%) vs ${pair.quoteCurrency} (${quoteMkt! >= 0 ? '+' : ''}${quoteMkt!.toFixed(2)}%).`;
      } else if (absDelta! >= 0.10) {
        mktPoints = 18;
        mktExplanation = `Confirmed relative divergence crossing key threshold (Δ = ${delta! >= 0 ? '+' : ''}${delta!.toFixed(2)}% ≥ 0.10%): ${pair.baseCurrency} (${baseMkt! >= 0 ? '+' : ''}${baseMkt!.toFixed(2)}%) vs ${pair.quoteCurrency} (${quoteMkt! >= 0 ? '+' : ''}${quoteMkt!.toFixed(2)}%).`;
      } else if (absDelta! >= 0.05) {
        mktPoints = 12;
        mktExplanation = `Moderate relative divergence (Δ = ${delta! >= 0 ? '+' : ''}${delta!.toFixed(2)}%): ${pair.baseCurrency} (${baseMkt! >= 0 ? '+' : ''}${baseMkt!.toFixed(2)}%) vs ${pair.quoteCurrency} (${quoteMkt! >= 0 ? '+' : ''}${quoteMkt!.toFixed(2)}%).`;
      } else {
        mktPoints = 6;
        mktExplanation = `Tight relative divergence (Δ = ${delta! >= 0 ? '+' : ''}${delta!.toFixed(2)}%): limited directional separation between ${pair.baseCurrency} and ${pair.quoteCurrency}.`;
      }
    } else {
      mktPoints = 0;
      mktExplanation = `Neutral market strength differential (Δ = ${delta! >= 0 ? '+' : ''}${delta!.toFixed(2)}%): price action is balanced across the basket.`;
    }

    if (hasStaleQuotes) {
      mktExplanation += ` WARNING: ${baseStalePairs + quoteStalePairs} contributing quote(s) are stale and were excluded from the basket.`;
    }
  }

  const marketStrengthComponent: ConfluenceComponent = {
    points: mktPoints,
    maxPoints: 25,
    weightPercent: 25,
    explanation: mktExplanation,
    availability: mktAvailability,
    evidenceCount: marketHasValue
      ? (baseCoverage?.available ?? 0) + (quoteCoverage?.available ?? 0)
      : 0,
    source: 'Biquote',
    freshness: mktFreshness,
    provenance: marketHasValue
      ? 'Biquote live market basket relative strength calculation'
      : 'No current timestamped market evidence',
    supportingData: {
      baseCurrency: pair.baseCurrency,
      quoteCurrency: pair.quoteCurrency,
      baseDailyMovementPercent: baseMkt,
      quoteDailyMovementPercent: quoteMkt,
      relativeStrengthDeltaPercent: delta,
      stalePairCount: baseStalePairs + quoteStalePairs,
      missingPairCount: baseMissingPairs + quoteMissingPairs
    }
  };


  // ----------------------------------------------------
  // COMPONENT 2: FUNDAMENTAL DIFFERENTIAL CONTRIBUTION (Weight: 20 pts)
  // Macroeconomic score comparison between Base and Quote.
  // ----------------------------------------------------
  const baseScore =
    (baseState.fundamentalState as any).fundamentalScore ?? null;
  const quoteScore =
    (quoteState.fundamentalState as any).fundamentalScore ?? null;

  let fundDelta: number | null = null;
  if (baseScore !== null && quoteScore !== null) {
    fundDelta = Math.round((baseScore - quoteScore) * 100) / 100;
  } else if (fundamentalDiff?.fundamentalDifferential?.delta !== undefined) {
    fundDelta = fundamentalDiff.fundamentalDifferential.delta;
  }

  const baseObsCount = baseState.confidenceMetadata?.observationCount ?? 0;
  const quoteObsCount = quoteState.confidenceMetadata?.observationCount ?? 0;
  const totalObsCount = baseObsCount + quoteObsCount;

  let fundPoints = 0;
  let fundExplanation = '';
  let fundAvailability: ConfluenceComponentAvailability = 'AVAILABLE';
  let fundFreshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE' = 'FRESH';

  // Strict non-fabrication rule: if no macro observations or scores exist, points MUST be 0 and availability UNAVAILABLE!
  if (fundDelta === null || (baseScore === null && quoteScore === null && totalObsCount === 0)) {
    fundPoints = 0;
    fundAvailability = 'UNAVAILABLE';
    fundFreshness = 'UNAVAILABLE';
    fundExplanation = 'No verified live macro observations available for this comparison.';
  } else {
    /*
     * Freshness is taken from the resolved fundamental evidence layer. It is
     * never assumed from a successful request or a connected provider.
     */
    const reportedFreshness =
      baseState.fundamentalDataFreshness ?? quoteState.fundamentalDataFreshness ?? null;
    fundFreshness =
      reportedFreshness === 'FRESH' || reportedFreshness === 'AGING' || reportedFreshness === 'STALE'
        ? reportedFreshness
        : totalObsCount > 0
        ? 'AGING'
        : 'UNAVAILABLE';
    if (fundFreshness === 'STALE') {
      fundAvailability = 'PARTIAL';
      fundExplanation =
        'Macro fundamental observations exist but are stale; they remain historical context only.';
    }

    const fundAligns =
      (isBullishBase && fundDelta > 0) || (isBearishBase && fundDelta < 0);
    const absFundDelta = Math.abs(fundDelta);

    if (fundAligns) {
      if (absFundDelta >= 0.15) {
        fundPoints = 20;
        fundExplanation = `Macro fundamentals strongly favor the directional thesis (Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}).`;
      } else if (absFundDelta >= 0.08) {
        fundPoints = 16;
        fundExplanation = `Macro fundamentals provide solid directional support (Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}).`;
      } else if (absFundDelta >= 0.04) {
        fundPoints = 12;
        fundExplanation = `Macro fundamentals lean constructively with the directional skew (Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}).`;
      } else {
        fundPoints = 6;
        fundExplanation = `Macro fundamentals are broadly balanced with slight directional lean (Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}).`;
      }
    } else if (absFundDelta <= 0.03) {
      fundPoints = 5;
      fundExplanation = `Macro fundamentals are balanced between ${pair.baseCurrency} and ${pair.quoteCurrency} (Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}).`;
    } else {
      fundPoints = 0;
      fundExplanation = `Fundamentals contradict the thesis: Macro fundamentals conflict with current directional skew (Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}).`;
    }

    if (fundFreshness === 'STALE') {
      fundPoints = Math.min(fundPoints, 12);
      fundExplanation += ' Observation freshness is degraded, so the awarded points are capped.';
    }
  }

  const fundamentalsComponent: ConfluenceComponent = {
    points: fundPoints,
    maxPoints: 20,
    weightPercent: 20,
    explanation: fundExplanation,
    availability: fundAvailability,
    evidenceCount: totalObsCount,
    source: 'Finance Calendar',
    freshness: fundFreshness,
    provenance: fundAvailability === 'UNAVAILABLE' ? 'No authenticated releases' : 'Macroeconomic released observations',
    supportingData: {
      baseScore,
      quoteScore,
      fundamentalDelta: fundDelta
    }
  };

  // ----------------------------------------------------
  // COMPONENT 3: CENTRAL BANK POLICY & CARRY SPREAD (Weight: 20 pts)
  // Nominal policy rate spread (max 12 pts) + Stance divergence (max 8 pts).
  //
  // Policy evidence may come from a verified LIVE central-bank record OR from a
  // verified, source-bound monetary-policy release published by the live
  // fundamental feed. Reference/static benchmarks never earn live points.
  // ----------------------------------------------------
  const baseCb = baseState.centralBank;
  const quoteCb = quoteState.centralBank;

  const releasePolicyFor = (
    evidence: LivePolicyEvidence | null | undefined
  ): LivePolicyEvidence | null =>
    evidence && evidence.availability === 'AVAILABLE' && evidence.policyRate !== null
      ? evidence
      : null;

  const baseReleasePolicy = releasePolicyFor(basePolicyEvidence);
  const quoteReleasePolicy = releasePolicyFor(quotePolicyEvidence);

  // Determine source type for both central banks
  const baseSourceType = baseReleasePolicy
    ? 'LIVE'
    : baseCb?.sourceType ??
      (baseCb?.sourceMetadata?.status === 'CONNECTED' ? 'LIVE' : 'REFERENCE');
  const quoteSourceType = quoteReleasePolicy
    ? 'LIVE'
    : quoteCb?.sourceType ??
      (quoteCb?.sourceMetadata?.status === 'CONNECTED' ? 'LIVE' : 'REFERENCE');

  const baseRate = baseReleasePolicy
    ? baseReleasePolicy.policyRate
    : baseCb?.currentPolicyRate ?? null;
  const quoteRate = quoteReleasePolicy
    ? quoteReleasePolicy.policyRate
    : quoteCb?.currentPolicyRate ?? null;

  const baseStance = baseReleasePolicy
    ? baseReleasePolicy.stance
    : baseCb?.stance ?? 'UNAVAILABLE';
  const quoteStance = quoteReleasePolicy
    ? quoteReleasePolicy.stance
    : quoteCb?.stance ?? 'UNAVAILABLE';

  let policySpread: number | null = null;
  if (baseRate !== null && quoteRate !== null) {
    policySpread = Math.round((baseRate - quoteRate) * 100) / 100;
  }

  let carryPoints = 0;
  if (policySpread !== null) {
    const carryFavorsThesis =
      (isBullishBase && policySpread > 0) || (isBearishBase && policySpread < 0);
    const absSpread = Math.abs(policySpread);

    if (carryFavorsThesis) {
      if (absSpread >= 3.0) carryPoints = 12;
      else if (absSpread >= 1.5) carryPoints = 9;
      else if (absSpread >= 0.5) carryPoints = 6;
      else carryPoints = 3;
    } else if (absSpread <= 0.25) {
      carryPoints = 2; // Flat carry
    } else {
      carryPoints = 0; // Carry cost works against thesis
    }
  }

  let stancePoints = 0;
  const stanceAligns =
    (isBullishBase && baseStance === 'HAWKISH' && quoteStance === 'DOVISH') ||
    (isBearishBase && quoteStance === 'HAWKISH' && baseStance === 'DOVISH');

  const stanceModerate =
    (isBullishBase && (baseStance === 'HAWKISH' || quoteStance === 'DOVISH')) ||
    (isBearishBase && (quoteStance === 'HAWKISH' || baseStance === 'DOVISH'));

  /*
   * Stance points require an actual stance on both legs. An unknown stance is
   * missing evidence, not a neutral stance, and earns nothing.
   */
  const stanceIsKnown =
    baseStance !== 'UNAVAILABLE' && quoteStance !== 'UNAVAILABLE';

  if (stanceIsKnown) {
    if (stanceAligns) {
      stancePoints = 8;
    } else if (stanceModerate) {
      stancePoints = 5;
    } else if (baseStance === 'NEUTRAL' && quoteStance === 'NEUTRAL') {
      stancePoints = 2;
    } else {
      stancePoints = 0;
    }
  }

  const rawPolicyPoints = carryPoints + stancePoints;

  let policyPoints = 0;
  let policyAvailability: ConfluenceComponentAvailability = 'AVAILABLE';
  let policyFreshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE' | 'REFERENCE' = 'UNAVAILABLE';
  let policySource = 'Official central-bank wire';
  let policyProvenance = 'Live official central bank policy rate announcements';
  let policyExplanation = '';

  const carryText =
    policySpread !== null
      ? `Policy carry spread: ${policySpread >= 0 ? '+' : ''}${policySpread.toFixed(2)}% (${carryPoints}/12 pts).`
      : 'Policy rate data unavailable.';
  const stanceText = stanceIsKnown
    ? `Monetary posture: ${baseReleasePolicy?.institution || baseCb?.institution || pair.baseCurrency} (${baseStance}) vs ${quoteReleasePolicy?.institution || quoteCb?.institution || pair.quoteCurrency} (${quoteStance}) (${stancePoints}/8 pts).`
    : `Monetary posture: stance direction is not established by current evidence for at least one leg (${stancePoints}/8 pts).`;

  if (
    baseSourceType === 'UNAVAILABLE' ||
    quoteSourceType === 'UNAVAILABLE' ||
    baseRate === null ||
    quoteRate === null
  ) {
    policyAvailability = 'UNAVAILABLE';
    policyPoints = 0;
    policyFreshness = 'UNAVAILABLE';
    policySource = 'Official central-bank archive';
    policyProvenance = 'No authenticated policy release record (UNAVAILABLE)';
    policyExplanation = 'Official central bank policy rate data unavailable for this comparison.';
  } else if (baseSourceType === 'STATIC' || quoteSourceType === 'STATIC') {
    policyAvailability = 'STATIC';
    policyPoints = 0;
    policyFreshness = 'REFERENCE';
    policySource = 'Official central-bank archive';
    policyProvenance = 'Static policy benchmarks (STATIC - contextual only)';
    policyExplanation = `${carryText} ${stanceText} [STATIC: Baseline contextual data only; zero live points awarded].`;
  } else if (baseSourceType === 'REFERENCE' || quoteSourceType === 'REFERENCE') {
    policyAvailability = 'REFERENCE_ONLY';
    policyPoints = 0;
    policyFreshness = 'REFERENCE';
    policySource = 'Official central-bank archive';
    policyProvenance = 'Official central-bank benchmark archive (REFERENCE)';
    policyExplanation = `${carryText} ${stanceText} [REFERENCE_ONLY: Historical policy benchmarks provide contextual baseline; zero live points awarded].`;
  } else {
    // Both legs carry current, verified policy evidence.
    policyAvailability = 'AVAILABLE';
    policyPoints = rawPolicyPoints;
    const policyFreshnessValues = [
      baseReleasePolicy?.freshness ?? baseCb?.freshness ?? null,
      quoteReleasePolicy?.freshness ?? quoteCb?.freshness ?? null
    ];
    policyFreshness = policyFreshnessValues.includes('STALE')
      ? 'STALE'
      : policyFreshnessValues.includes('AGING')
      ? 'AGING'
      : policyFreshnessValues.includes('FRESH')
      ? 'FRESH'
      : 'UNAVAILABLE';
    if (baseReleasePolicy || quoteReleasePolicy) {
      policyProvenance =
        'Verified monetary-policy releases from the live fundamental feed';
      policySource = baseReleasePolicy?.source || quoteReleasePolicy?.source || 'Finance Calendar';
    }
    policyExplanation = `${carryText} ${stanceText}`;
  }

  const policyComponent: ConfluenceComponent = {
    points: policyPoints,
    maxPoints: 20,
    weightPercent: 20,
    explanation: policyExplanation,
    availability: policyAvailability,
    evidenceCount: policyAvailability === 'UNAVAILABLE' ? 0 : 2,
    source: policySource,
    freshness: policyFreshness,
    provenance: policyProvenance,
    supportingData: {
      basePolicyRate: baseRate,
      quotePolicyRate: quoteRate,
      policyRateSpread: policySpread,
      baseStance,
      quoteStance,
      baseSourceType,
      quoteSourceType
    }
  };

  // ----------------------------------------------------
  // COMPONENT 4: MACRO EXPECTATIONS & SURPRISES (Weight: 15 pts)
  // Economic indicator consensus surprise momentum.
  //
  // Points are derived from REAL, counted surprises. A prose summary that
  // merely mentions a currency code is never treated as directional evidence.
  // ----------------------------------------------------
  const baseObs = baseObsCount;
  const quoteObs = quoteObsCount;
  const expDiff = fundamentalDiff?.expectationsDifferential;

  let expPoints = 0;
  let expExplanation = '';
  let expAvailability: ConfluenceComponentAvailability = 'AVAILABLE';
  let expFreshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE' = 'UNAVAILABLE';
  let expEvidenceCount = baseObs + quoteObs;

  const baseAbove = expDiff?.baseAboveCount ?? 0;
  const baseBelow = expDiff?.baseBelowCount ?? 0;
  const quoteAbove = expDiff?.quoteAboveCount ?? 0;
  const quoteBelow = expDiff?.quoteBelowCount ?? 0;
  const baseNet = baseAbove - baseBelow;
  const quoteNet = quoteAbove - quoteBelow;
  const hasRealizedSurprise = baseAbove + baseBelow + quoteAbove + quoteBelow > 0;

  if (hasRealizedSurprise) {
    expAvailability = 'AVAILABLE';
    const directionalEdge = baseNet - quoteNet;

    if (isBullishBase && directionalEdge > 0) {
      expPoints = 14;
      expExplanation = `Verified economic surprises favor ${pair.baseCurrency} (${pair.baseCurrency} net ${baseNet >= 0 ? '+' : ''}${baseNet} vs ${pair.quoteCurrency} net ${quoteNet >= 0 ? '+' : ''}${quoteNet}).`;
    } else if (isBearishBase && directionalEdge < 0) {
      expPoints = 14;
      expExplanation = `Verified economic surprises favor ${pair.quoteCurrency} (${pair.baseCurrency} net ${baseNet >= 0 ? '+' : ''}${baseNet} vs ${pair.quoteCurrency} net ${quoteNet >= 0 ? '+' : ''}${quoteNet}).`;
    } else if (directionalEdge === 0) {
      expPoints = 7;
      expExplanation = `Verified economic surprises are balanced between ${pair.baseCurrency} and ${pair.quoteCurrency} (both net 0).`;
    } else {
      expPoints = 2;
      expExplanation = `Verified economic surprises lean against the current directional skew (${pair.baseCurrency} net ${baseNet >= 0 ? '+' : ''}${baseNet} vs ${pair.quoteCurrency} net ${quoteNet >= 0 ? '+' : ''}${quoteNet}).`;
    }

    expFreshness =
      baseState.fundamentalDataFreshness === 'STALE' || quoteState.fundamentalDataFreshness === 'STALE'
        ? 'STALE'
        : 'FRESH';
  } else if (totalObsCount > 0) {
    /*
     * Observations exist but none carry a realized consensus surprise.
     * That is incomplete evidence, not neutral evidence. Only a limited
     * verification credit is awarded for confirmed coverage; the layer is
     * never treated as directional support for the thesis.
     */
    expAvailability = 'PARTIAL';
    expFreshness = 'AGING';
    expPoints = 5;
    expExplanation = `Macroeconomic observation coverage verified across ${totalObsCount} releases, but no release carries a realized consensus surprise; no directional expectation points are awarded and this layer is not treated as support.`;
  } else {
    // Missing! Zero points awarded!
    expPoints = 0;
    expAvailability = 'UNAVAILABLE';
    expFreshness = 'UNAVAILABLE';
    expEvidenceCount = 0;
    expExplanation = 'Evidence unavailable: No macroeconomic consensus expectations or release surprises recorded.';
  }

  const expectationsComponent: ConfluenceComponent = {
    points: expPoints,
    maxPoints: 15,
    weightPercent: 15,
    explanation: expExplanation,
    availability: expAvailability,
    evidenceCount: expEvidenceCount,
    source: 'Finance Calendar',
    freshness: expFreshness,
    provenance: expAvailability === 'UNAVAILABLE' ? 'No consensus expectations record' : 'Economic indicator consensus surprise momentum',
    supportingData: {
      baseObservations: baseObs,
      quoteObservations: quoteObs,
      expectationsComparison: expDiff?.comparison
    }
  };

  // ----------------------------------------------------
  // COMPONENT 5: SESSION LIQUIDITY RELEVANCE (Weight: 10 pts)
  // Structural relevance to active financial centers.
  // ----------------------------------------------------
  const sessionOverview = getActiveSessionOverview(date);
  const sessionRel = getPairSessionRelevance(pair.symbol);

  const openSessionNames = sessionOverview.openSessions.map((s) => s.session.name);
  const isPrimarySessionOpen = openSessionNames.some((name) =>
    name.toLowerCase().includes(sessionRel.primarySession.toLowerCase())
  );
  const isRelevantSessionOpen = sessionRel.relevantSessions.some((rel) =>
    openSessionNames.some((name) => name.toLowerCase().includes(rel.toLowerCase()))
  );
  const hasActiveOverlap = sessionOverview.activeOverlaps.length > 0;

  let sessionPoints = 0;
  let sessionExplanation = '';

  if (isPrimarySessionOpen && hasActiveOverlap) {
    sessionPoints = 10;
    sessionExplanation = `Prime liquidity window: Primary session (${sessionRel.primarySession}) is OPEN during an active market overlap. Peak liquidity condition.`;
  } else if (isPrimarySessionOpen) {
    sessionPoints = 8;
    sessionExplanation = `Primary liquidity session (${sessionRel.primarySession}) is currently ACTIVE. Optimal execution depth for ${pair.symbol}.`;
  } else if (isRelevantSessionOpen) {
    sessionPoints = 6;
    sessionExplanation = `Secondary relevant session is open (${openSessionNames.join(', ')}). Normal trading conditions.`;
  } else {
    sessionPoints = 3;
    sessionExplanation = `Off-peak session for ${pair.symbol}. Primary trading center (${sessionRel.primarySession}) is currently closed.`;
  }

  const sessionComponent: ConfluenceComponent = {
    points: sessionPoints,
    maxPoints: 10,
    weightPercent: 10,
    explanation: sessionExplanation,
    availability: 'AVAILABLE',
    evidenceCount: openSessionNames.length,
    source: 'Session Intelligence',
    freshness: 'FRESH',
    provenance: 'DERIVED',
    supportingData: {
      primarySession: sessionRel.primarySession,
      activeSessions: openSessionNames,
      activeOverlaps: sessionOverview.activeOverlaps
    }
  };

  // ----------------------------------------------------
  // COMPONENT 6: ECONOMIC CATALYSTS & EVENT RISK (Weight: 10 pts)
  // Calendar releases within active monitoring window.
  // ----------------------------------------------------
  const upcomingPairEvents = events.filter(
    (e) =>
      (e.currency === pair.baseCurrency || e.currency === pair.quoteCurrency) &&
      e.status === 'UPCOMING'
  );

  const highImpactEvents = upcomingPairEvents.filter((e) => e.importance === 'HIGH');

  let catalystPoints = 0;
  let catalystExplanation = '';
  let catalystAvailability: ConfluenceComponentAvailability = 'AVAILABLE';
  let catalystFreshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE' = 'FRESH';

  if (upcomingPairEvents.length === 0 && !isDataFeedConnected) {
    catalystAvailability = 'UNAVAILABLE';
    catalystFreshness = 'UNAVAILABLE';
    catalystPoints = 0;
    catalystExplanation = 'Evidence unavailable: Economic calendar feed disconnected or unpopulated.';
  } else if (highImpactEvents.length > 0) {
    const nextEvent = highImpactEvents[0];
    const msUntilEvent = new Date(nextEvent.scheduledTime).getTime() - date.getTime();
    const hoursUntil = msUntilEvent / (1000 * 60 * 60);

    if (hoursUntil > 0 && hoursUntil <= 2) {
      catalystPoints = 3;
      catalystExplanation = `High binary event risk: ${nextEvent.name} (${nextEvent.currency}) scheduled in ${hoursUntil.toFixed(1)}h. Elevated volatility window.`;
    } else if (hoursUntil > 2 && hoursUntil <= 24) {
      catalystPoints = 7;
      catalystExplanation = `Scheduled catalyst ahead: ${nextEvent.name} (${nextEvent.currency}) in ${hoursUntil.toFixed(1)}h provides potential macro driver.`;
    } else {
      catalystPoints = 6;
      catalystExplanation = `High-impact release scheduled: ${nextEvent.name} (${nextEvent.currency}).`;
    }
  } else if (upcomingPairEvents.length > 0) {
    catalystPoints = 8;
    catalystExplanation = `Moderate catalyst backdrop: ${upcomingPairEvents.length} scheduled release(s) with no immediate binary event risk.`;
  } else {
    catalystPoints = 6;
    catalystExplanation = `Clear economic runway: no high-impact macroeconomic releases scheduled in immediate window.`;
  }

  const catalystsComponent: ConfluenceComponent = {
    points: catalystPoints,
    maxPoints: 10,
    weightPercent: 10,
    explanation: catalystExplanation,
    availability: catalystAvailability,
    evidenceCount: upcomingPairEvents.length,
    source: 'Finance Calendar',
    freshness: catalystFreshness,
    provenance: catalystAvailability === 'UNAVAILABLE' ? 'Feed disconnected' : 'Finance Calendar upcoming schedule',
    supportingData: {
      totalUpcomingCount: upcomingPairEvents.length,
      highImpactCount: highImpactEvents.length
    }
  };

  const allComponentsForSummary = [
    { name: 'Market Strength', comp: marketStrengthComponent },
    { name: 'Fundamentals', comp: fundamentalsComponent },
    { name: 'Policy', comp: policyComponent },
    { name: 'Expectations', comp: expectationsComponent },
    { name: 'Session', comp: sessionComponent },
    { name: 'Catalysts', comp: catalystsComponent }
  ];

  // ----------------------------------------------------
  // CONTRADICTION PENALTY (Deductions: 0 to -30 pts)
  // Penalizes opposing evidence, market-fundamental divergence, or carry conflicts.
  // ----------------------------------------------------
  let contradictionPenalty = 0;
  const contradictionReasons: string[] = [];

  /*
   * 1. Price Momentum vs Fundamental Divergence
   * This check requires BOTH sides of the conflict to exist. A macro-derived
   * orientation is not evidence of price momentum.
   */
  if (fundDelta !== null && marketHasValue) {
    if (isBullishBase && fundDelta < -0.04) {
      contradictionPenalty += 15;
      contradictionReasons.push(
        `Fundamental Divergence: Market price momentum favors ${pair.baseCurrency}, but structural macro fundamentals favor ${pair.quoteCurrency} (Fund Δ: ${fundDelta.toFixed(2)}).`
      );
    } else if (isBearishBase && fundDelta > 0.04) {
      contradictionPenalty += 15;
      contradictionReasons.push(
        `Fundamental Divergence: Market price momentum favors ${pair.quoteCurrency}, but structural macro fundamentals favor ${pair.baseCurrency} (Fund Δ: +${fundDelta.toFixed(2)}).`
      );
    }
  }

  // 2. Policy Stance / Carry Conflict (requires verified policy evidence)
  const policyInstitutionFor = (releasePolicy: LivePolicyEvidence | null, cb: typeof baseCb) =>
    releasePolicy?.institution || cb?.institution || '';

  if (policyAvailability === 'AVAILABLE' && isBullishBase && baseStance === 'DOVISH') {
    contradictionPenalty += 8;
    contradictionReasons.push(
      `Monetary Policy Conflict: ${policyInstitutionFor(baseReleasePolicy, baseCb)} is actively pursuing monetary accommodation (DOVISH), conflicting with bullish orientation.`
    );
  } else if (policyAvailability === 'AVAILABLE' && isBearishBase && quoteStance === 'DOVISH') {
    contradictionPenalty += 8;
    contradictionReasons.push(
      `Monetary Policy Conflict: ${policyInstitutionFor(quoteReleasePolicy, quoteCb)} is actively pursuing monetary accommodation (DOVISH), conflicting with bearish orientation.`
    );
  } else if (policySpread !== null) {
    if (isBullishBase && policySpread < -2.0) {
      contradictionPenalty += 5;
      contradictionReasons.push(
        `Negative Carry Friction: the ${pair.baseCurrency} leg carries a significant rate disadvantage of ${policySpread.toFixed(2)}% against the ${pair.quoteCurrency} leg.`
      );
    } else if (isBearishBase && policySpread > 2.0) {
      contradictionPenalty += 5;
      contradictionReasons.push(
        `Negative Carry Friction: the ${pair.baseCurrency} leg carries a significant rate disadvantage of +${policySpread.toFixed(2)}% relative to the ${pair.quoteCurrency} leg.`
      );
    }
  }

  // 3. Excess Opposing Evidence
  const counterCount = (baseState.conflictingEvidence?.length ?? 0) + (quoteState.conflictingEvidence?.length ?? 0);
  if (counterCount >= 2) {
    contradictionPenalty += 5;
    contradictionReasons.push(
      `Multiple counter-thesis macroeconomic observations recorded across ${pair.baseCurrency} and ${pair.quoteCurrency}.`
    );
  }

  // ----------------------------------------------------
  // DATA QUALITY ADJUSTMENT FACTOR (0.50 to 1.00 multiplier)
  //
  // The adjustment reflects real evidence gaps. It NEVER redistributes the
  // points of an unavailable layer: the denominator stays 100 and an
  // unavailable layer simply remains unearned.
  // ----------------------------------------------------
  let qualityFactor = 1.0;
  let qualityStatus: 'COMPLETE' | 'PARTIAL' | 'DEGRADED' | 'UNAVAILABLE' = 'COMPLETE';
  let qualityReason = 'Full pair basket quotes and verified macroeconomic datasets active.';

  const anyEvidenceLayerAvailable =
    marketStrengthComponent.availability === 'AVAILABLE' ||
    marketStrengthComponent.availability === 'PARTIAL' ||
    fundamentalsComponent.availability === 'AVAILABLE' ||
    fundamentalsComponent.availability === 'PARTIAL' ||
    policyComponent.availability === 'AVAILABLE' ||
    expectationsComponent.availability === 'AVAILABLE' ||
    expectationsComponent.availability === 'PARTIAL' ||
    catalystsComponent.availability === 'AVAILABLE';

  const isDegraded =
    baseState.overallState === 'INSUFFICIENT_COVERAGE' ||
    quoteState.overallState === 'INSUFFICIENT_COVERAGE' ||
    !marketHasValue ||
    baseStalePairs > 0 ||
    quoteStalePairs > 0;

  if (!anyEvidenceLayerAvailable) {
    qualityFactor = 0.0;
    qualityStatus = 'UNAVAILABLE';
    qualityReason =
      'No verified evidence layer is available for this pair; no points can be earned.';
  } else if (!marketHasValue) {
    qualityFactor = 0.75;
    qualityStatus = 'DEGRADED';
    qualityReason =
      marketEvidenceState === 'STALE'
        ? 'Market quotes are stale, so the 25 market-strength points are unearned. Remaining macro and context layers are scored at 0.75×; the denominator stays 100.'
        : 'Live market strength is unavailable, so the 25 market-strength points are unearned. Remaining macro and context layers are scored at 0.75×; the denominator stays 100.';
  } else if (isDegraded) {
    qualityFactor = 0.75;
    qualityStatus = 'DEGRADED';
    qualityReason = 'Partial or stale pair quotes in relative basket. Confluence adjusted by 0.75×.';
  } else if (
    (baseCoverage?.percent ?? 100) < 100 ||
    (quoteCoverage?.percent ?? 100) < 100
  ) {
    qualityFactor = 0.90;
    qualityStatus = 'PARTIAL';
    qualityReason = 'Partial pair coverage observed in currency basket. Confluence adjusted by 0.90×.';
  }

  // ----------------------------------------------------
  // TOTAL CALCULATION (denominator always 100, never renormalized)
  // ----------------------------------------------------
  const rawSum =
    mktPoints +
    fundPoints +
    policyPoints +
    expPoints +
    sessionPoints +
    catalystPoints;

  const maxAvailablePoints = 100;
  const scoreAfterPenalty = Math.max(0, rawSum - contradictionPenalty);
  const finalScore = Math.max(0, Math.min(maxAvailablePoints, Math.round(scoreAfterPenalty * qualityFactor)));

  // Directional Confidence Level Classification
  let confidenceLevel: DirectionalConfidenceLevel = 'NEUTRAL';
  if (orientationDirection === 'NEUTRAL' || (absDelta !== null && absDelta < 0.05)) {
    confidenceLevel = 'NEUTRAL';
  } else if (finalScore >= 80) {
    confidenceLevel = 'VERY_HIGH';
  } else if (finalScore >= 65) {
    confidenceLevel = 'HIGH';
  } else if (finalScore >= 50) {
    confidenceLevel = 'MODERATE';
  } else if (finalScore >= 35) {
    confidenceLevel = 'LOW';
  } else {
    confidenceLevel = 'NEUTRAL';
  }

  // Final human-readable explanation
  const dirLabel =
    orientationDirection === 'BULLISH_BASE'
      ? `BULLISH ${pair.baseCurrency}`
      : orientationDirection === 'BEARISH_BASE'
      ? `BEARISH ${pair.baseCurrency} (BULLISH ${pair.quoteCurrency})`
      : 'NEUTRAL / BALANCED';

  const contradictionText =
    contradictionPenalty > 0
      ? ` Contradiction deductions (-${contradictionPenalty} pts) applied due to opposing macro evidence.`
      : ' Evidence alignment across market strength and macro fundamentals.';

  const missingLayerText = allComponentsForSummary
    .filter((component) => component.comp.availability === 'UNAVAILABLE')
    .map((component) => `${component.name} (+0/${component.comp.maxPoints})`)
    .join(', ');

  const explanation = `Confluence Score: ${finalScore}/100 [${confidenceLevel} Directional Confidence for ${dirLabel}]. Component breakdown: Market Strength (+${mktPoints}/25), Fundamentals (+${fundPoints}/20), Policy & Carry (+${policyPoints}/20), Expectations (+${expPoints}/15), Session (+${sessionPoints}/10), Catalysts (+${catalystPoints}/10).${contradictionText} Data Quality factor: ${qualityFactor.toFixed(2)}× (${qualityStatus}).${
    missingLayerText
      ? ` Unavailable layers are NOT redistributed: ${missingLayerText} remain unearned against the fixed 100-point maximum.`
      : ''
  }`;

  const threeDimensionalModel = {
    directionalEvidence: {
      score: mktPoints + fundPoints + policyPoints + expPoints,
      maxScore: 80,
      factors: [
        {
          name: 'Market Strength Divergence',
          rawDelta: delta,
          contribution: mktPoints,
          explanation: mktExplanation
        },
        {
          name: 'Macro Fundamentals',
          rawDelta: fundDelta,
          contribution: fundPoints,
          explanation: fundExplanation
        },
        {
          name: 'Monetary Policy & Carry',
          rawDelta: policySpread,
          contribution: policyPoints,
          explanation: policyComponent.explanation
        },
        {
          name: 'Expectations & Surprises',
          rawDelta: null,
          contribution: expPoints,
          explanation: expExplanation
        }
      ]
    },
    context: {
      score: sessionPoints + catalystPoints,
      maxScore: 20,
      factors: [
        {
          name: 'Active Session & Overlap',
          contribution: sessionPoints,
          explanation: sessionExplanation
        },
        {
          name: 'Catalyst Runway & Timing',
          contribution: catalystPoints,
          explanation: catalystExplanation
        }
      ]
    },
    riskAndUncertainty: {
      penaltyScore: contradictionPenalty + (qualityFactor < 1.0 ? Math.round(scoreAfterPenalty * (1 - qualityFactor)) : 0),
      riskLevel: (contradictionPenalty >= 15 ? 'HIGH' : contradictionPenalty > 0 ? 'MODERATE' : 'LOW') as 'HIGH' | 'MODERATE' | 'LOW',
      factors: [
        ...contradictionReasons.map((r) => ({
          name: 'Contradiction',
          deduction: contradictionPenalty,
          explanation: r
        })),
        ...(qualityFactor < 1.0
          ? [
              {
                name: 'Data Quality / Stale Quotes',
                deduction: Math.round(scoreAfterPenalty * (1 - qualityFactor)),
                explanation: qualityReason
              }
            ]
          : [])
      ]
    }
  };

  const availableComponents = allComponentsForSummary
    .filter((c) => c.comp.availability === 'AVAILABLE' || c.comp.availability === 'PARTIAL')
    .map((c) => c.name);

  const missingComponents = allComponentsForSummary
    .filter((c) => c.comp.availability === 'UNAVAILABLE')
    .map((c) => c.name);

  const referenceOnlyComponents = allComponentsForSummary
    .filter((c) => c.comp.availability === 'REFERENCE_ONLY' || c.comp.availability === 'STATIC')
    .map((c) => c.name);

  /*
   * Layer freshness is tracked separately per component. AGING macro evidence
   * is aging, not stale, and must not be reported as a stale component; a
   * truly STALE layer remains listed.
   */
  const staleComponents = allComponentsForSummary
    .filter((c) => c.comp.freshness === 'STALE')
    .map((c) => c.name);

  const agingComponents = allComponentsForSummary
    .filter((c) => c.comp.freshness === 'AGING')
    .map((c) => c.name);

  return {
    confluenceScore: finalScore,
    directionalConfidence: confidenceLevel,
    direction: orientationDirection,
    components: {
      marketStrength: marketStrengthComponent,
      fundamentals: fundamentalsComponent,
      policy: policyComponent,
      expectations: expectationsComponent,
      catalysts: catalystsComponent,
      session: sessionComponent,
      contradictionPenalty: {
        penaltyPoints: contradictionPenalty,
        reasons: contradictionReasons
      },
      dataQualityAdjustment: {
        factor: qualityFactor,
        quality: qualityStatus,
        reason: qualityReason
      }
    },
    availableComponents,
    missingComponents,
    staleComponents,
    agingComponents,
    referenceOnlyComponents,
    dataQualityAdjustment: {
      factor: qualityFactor,
      quality: qualityStatus,
      reason: qualityReason
    },
    rawScoreBeforeAdjustments: rawSum,
    explanation,
    calculatedAt: nowIso,
    marketDataTimestamp,
    fundamentalDataTimestamp,
    dataQuality: qualityStatus,
    threeDimensionalModel
  };
}
