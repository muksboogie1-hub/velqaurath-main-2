/**
 * VELQOARATH — FUNDAMENTAL DIFFERENTIAL & PAIR INTELLIGENCE (PHASE B)
 *
 * Deterministic comparative analysis between BASE and QUOTE currencies:
 * - marketStrengthDifferential = base.marketStrength - quote.marketStrength
 * - fundamentalDifferential = base.fundamentalScore - quote.fundamentalScore
 * - policyDifferential: policy rate spread (baseRate - quoteRate), stance divergence
 * - expectationsDifferential: comparative surprise profiles
 * - catalystDifferential: upcoming events for both currencies
 * - supportingEvidence vs contradictoryEvidence (counter-thesis risks)
 * - Invalidation conditions
 * - Mathematical orientation preserved: BASE minus QUOTE
 * - NEVER generates BUY/SELL execution signals
 */

import {
  FundamentalDifferential,
  CurrencyFundamentalIntelligence
} from '../../types/fundamentals';
import { CurrencyPair, EconomicEvent } from '../../types';
import {
  LivePolicyEvidence,
  evaluateLivePolicySpread
} from './policyEvidence';

export interface PairDifferentialParams {
  pair: CurrencyPair;
  baseIntel: CurrencyFundamentalIntelligence;
  quoteIntel: CurrencyFundamentalIntelligence;
  upcomingEvents?: EconomicEvent[];
  /**
   * Verified live policy evidence per leg. Required for a policy differential,
   * because a reference central-bank benchmark is contextual only.
   */
  basePolicyEvidence?: LivePolicyEvidence | null;
  quotePolicyEvidence?: LivePolicyEvidence | null;
}

export function evaluateFundamentalDifferential(
  params: PairDifferentialParams
): FundamentalDifferential {
  const {
    pair,
    baseIntel,
    quoteIntel,
    upcomingEvents = [],
    basePolicyEvidence = null,
    quotePolicyEvidence = null
  } = params;

  // 1. Market Strength Differential (BASE minus QUOTE)
  const baseMkt = baseIntel.marketStrength;
  const quoteMkt = quoteIntel.marketStrength;
  const marketStrengthDifferential =
    baseMkt !== null && quoteMkt !== null
      ? Math.round((baseMkt - quoteMkt) * 100) / 100
      : null;

  // 2. Fundamental Differential (BASE minus QUOTE)
  const baseScore = baseIntel.fundamentalScore;
  const quoteScore = quoteIntel.fundamentalScore;
  const fundDelta =
    baseScore !== null && quoteScore !== null
      ? Math.round((baseScore - quoteScore) * 100) / 100
      : null;

  const fundSummary =
    fundDelta !== null
      ? fundDelta > 0.04
        ? `Macroeconomic fundamentals favor ${pair.baseCurrency} over ${pair.quoteCurrency} (Fundamental Δ = +${fundDelta.toFixed(2)}).`
        : fundDelta < -0.04
        ? `Macroeconomic fundamentals favor ${pair.quoteCurrency} over ${pair.baseCurrency} (Fundamental Δ = ${fundDelta.toFixed(2)}).`
        : `Macroeconomic fundamentals between ${pair.baseCurrency} and ${pair.quoteCurrency} are broadly balanced (Fundamental Δ = ${fundDelta.toFixed(2)}).`
      : 'Insufficient fundamental release data to calculate comparative fundamental score.';

  // 3. Central Bank Policy Differential (BASE minus QUOTE)
  /*
   * Policy rates are LIVE evidence only when verified live policy evidence was
   * supplied for that leg. Otherwise the static central-bank profile is
   * reported as REFERENCE_ONLY context: the differential still describes the
   * profile, but it carries REFERENCE provenance so no downstream engine can
   * award live policy points or build a policy-derived orientation from it.
   */
  const basePolicy =
    basePolicyEvidence && basePolicyEvidence.availability === 'AVAILABLE'
      ? basePolicyEvidence
      : null;
  const quotePolicy =
    quotePolicyEvidence && quotePolicyEvidence.availability === 'AVAILABLE'
      ? quotePolicyEvidence
      : null;

  const baseRefRate = baseIntel.centralBankProfile?.currentPolicyRate ?? null;
  const quoteRefRate = quoteIntel.centralBankProfile?.currentPolicyRate ?? null;

  const baseRate = basePolicy?.policyRate ?? baseRefRate;
  const quoteRate = quotePolicy?.policyRate ?? quoteRefRate;

  const baseProvenance: 'LIVE' | 'REFERENCE' = basePolicy ? 'LIVE' : 'REFERENCE';
  const quoteProvenance: 'LIVE' | 'REFERENCE' = quotePolicy ? 'LIVE' : 'REFERENCE';

  const livePolicySpread = evaluateLivePolicySpread(basePolicy, quotePolicy);
  const rateSpread =
    baseRate !== null && quoteRate !== null
      ? Math.round((baseRate - quoteRate) * 100) / 100
      : null;

  const baseStance = basePolicy?.stance ?? baseIntel.centralBankProfile?.stance ?? 'UNAVAILABLE';
  const quoteStance = quotePolicy?.stance ?? quoteIntel.centralBankProfile?.stance ?? 'UNAVAILABLE';

  const baseInstitution = basePolicy?.institution || baseIntel.centralBankProfile.institution;
  const quoteInstitution = quotePolicy?.institution || quoteIntel.centralBankProfile.institution;

  let stanceDelta =
    baseStance === 'UNAVAILABLE' || quoteStance === 'UNAVAILABLE'
      ? 'Monetary stance direction is not established by current evidence for at least one leg.'
      : 'Aligned / Neutral policy balance';
  if (baseStance === 'HAWKISH' && quoteStance === 'DOVISH') {
    stanceDelta = `Maximum policy divergence favoring ${pair.baseCurrency} (${baseInstitution}: HAWKISH vs ${quoteInstitution}: DOVISH)`;
  } else if (baseStance === 'DOVISH' && quoteStance === 'HAWKISH') {
    stanceDelta = `Maximum policy divergence favoring ${pair.quoteCurrency} (${quoteInstitution}: HAWKISH vs ${baseInstitution}: DOVISH)`;
  } else if (baseStance === 'HAWKISH' && quoteStance !== 'HAWKISH') {
    stanceDelta = `${baseInstitution} retains hawkish tilt relative to ${quoteInstitution}`;
  } else if (quoteStance === 'HAWKISH' && baseStance !== 'HAWKISH') {
    stanceDelta = `${quoteInstitution} retains hawkish tilt relative to ${baseInstitution}`;
  } else if (baseStance === 'DOVISH' && quoteStance !== 'DOVISH') {
    stanceDelta = `${baseInstitution} is actively easing relative to ${quoteInstitution}`;
  } else if (quoteStance === 'DOVISH' && baseStance !== 'DOVISH') {
    stanceDelta = `${quoteInstitution} is actively easing relative to ${baseInstitution}`;
  }

  if (baseProvenance !== 'LIVE' || quoteProvenance !== 'LIVE') {
    stanceDelta +=
      ' [REFERENCE PROFILE: no verified live policy release was supplied for at least one leg, so this divergence carries no live policy points.]';
  }

  // 4. Expectations Differential
  const baseExp = baseIntel.expectationInformation;
  const quoteExp = quoteIntel.expectationInformation;

  const baseSummary = `${pair.baseCurrency}: ${baseExp.aboveCount} beats, ${baseExp.belowCount} misses, ${baseExp.inLineCount} in-line across ${baseExp.totalObservations} releases.`;
  const quoteSummary = `${pair.quoteCurrency}: ${quoteExp.aboveCount} beats, ${quoteExp.belowCount} misses, ${quoteExp.inLineCount} in-line across ${quoteExp.totalObservations} releases.`;

  const baseNet = baseExp.aboveCount - baseExp.belowCount;
  const quoteNet = quoteExp.aboveCount - quoteExp.belowCount;
  const hasRealizedSurprise =
    baseExp.aboveCount + baseExp.belowCount + quoteExp.aboveCount + quoteExp.belowCount > 0;

  const directionalEdge: 'BASE' | 'QUOTE' | 'BALANCED' | 'UNAVAILABLE' = !hasRealizedSurprise
    ? 'UNAVAILABLE'
    : baseNet > quoteNet
    ? 'BASE'
    : quoteNet > baseNet
    ? 'QUOTE'
    : 'BALANCED';

  let expComparison = '';
  if (!hasRealizedSurprise) {
    expComparison = `No realized consensus surprise is recorded for ${pair.baseCurrency} or ${pair.quoteCurrency}; surprise momentum is unavailable rather than balanced.`;
  } else if (baseExp.aboveCount > quoteExp.aboveCount && baseExp.belowCount <= quoteExp.belowCount) {
    expComparison = `Data surprise momentum skews positive for ${pair.baseCurrency} compared to ${pair.quoteCurrency} (net ${baseNet >= 0 ? '+' : ''}${baseNet} vs ${quoteNet >= 0 ? '+' : ''}${quoteNet}).`;
  } else if (quoteExp.aboveCount > baseExp.aboveCount && quoteExp.belowCount <= baseExp.belowCount) {
    expComparison = `Data surprise momentum skews positive for ${pair.quoteCurrency} compared to ${pair.baseCurrency} (net ${baseNet >= 0 ? '+' : ''}${baseNet} vs ${quoteNet >= 0 ? '+' : ''}${quoteNet}).`;
  } else {
    expComparison = `Data surprise momentum is balanced or cross-cutting between ${pair.baseCurrency} and ${pair.quoteCurrency} (net ${baseNet >= 0 ? '+' : ''}${baseNet} vs ${quoteNet >= 0 ? '+' : ''}${quoteNet}).`;
  }

  // 5. Catalyst Differential
  const baseCatalysts = upcomingEvents.filter(
    (e) => e.currency.toUpperCase() === pair.baseCurrency.toUpperCase() && e.status === 'UPCOMING'
  );
  const quoteCatalysts = upcomingEvents.filter(
    (e) => e.currency.toUpperCase() === pair.quoteCurrency.toUpperCase() && e.status === 'UPCOMING'
  );
  const upcomingPairEvents = [...baseCatalysts, ...quoteCatalysts].sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  );

  // 6. Supporting & Contradictory Evidence
  const supportingEvidence: string[] = [];
  const contradictoryEvidence: string[] = [];
  const invalidationConditions: string[] = [];

  // Market strength evidence
  if (marketStrengthDifferential !== null) {
    if (marketStrengthDifferential > 0.08) {
      supportingEvidence.push(
        `Relative market strength favors ${pair.baseCurrency} by +${marketStrengthDifferential.toFixed(2)} (${pair.baseCurrency}: ${baseMkt?.toFixed(2)} vs ${pair.quoteCurrency}: ${quoteMkt?.toFixed(2)}).`
      );
    } else if (marketStrengthDifferential < -0.08) {
      supportingEvidence.push(
        `Relative market strength favors ${pair.quoteCurrency} by +${Math.abs(marketStrengthDifferential).toFixed(2)} (${pair.quoteCurrency}: ${quoteMkt?.toFixed(2)} vs ${pair.baseCurrency}: ${baseMkt?.toFixed(2)}).`
      );
    } else {
      supportingEvidence.push(
        `Market strength differential between ${pair.baseCurrency} and ${pair.quoteCurrency} is neutral (Δ = ${marketStrengthDifferential.toFixed(2)}).`
      );
    }
  }

  // Policy carry spread evidence
  if (rateSpread !== null) {
    const carryQualifier =
      baseProvenance === 'LIVE' && quoteProvenance === 'LIVE'
        ? ''
        : ' [REFERENCE PROFILE RATES: not verified live policy evidence.]';

    if (rateSpread > 0) {
      supportingEvidence.push(
        `Nominal policy carry differential is +${rateSpread.toFixed(2)}% in favor of ${pair.baseCurrency} (${baseRate}% vs ${quoteRate}%).${carryQualifier}`
      );
    } else if (rateSpread < 0) {
      supportingEvidence.push(
        `Nominal policy carry differential is +${Math.abs(rateSpread).toFixed(2)}% in favor of ${pair.quoteCurrency} (${quoteRate}% vs ${baseRate}%).${carryQualifier}`
      );
    }
  }

  // Contradictory evidence (counter-thesis risks)
  if (marketStrengthDifferential !== null && fundDelta !== null) {
    if (marketStrengthDifferential > 0.05 && fundDelta < -0.02) {
      contradictoryEvidence.push(
        `Divergence: Market price momentum favors ${pair.baseCurrency} (+${marketStrengthDifferential.toFixed(2)}) despite fundamental data favoring ${pair.quoteCurrency} (Fund Δ: ${fundDelta.toFixed(2)}).`
      );
      invalidationConditions.push(
        `Downside repricing if ${pair.baseCurrency} fails to produce resilient macroeconomic prints to justify current price premium.`
      );
    } else if (marketStrengthDifferential < -0.05 && fundDelta > 0.02) {
      contradictoryEvidence.push(
        `Divergence: Market price momentum favors ${pair.quoteCurrency} (${marketStrengthDifferential.toFixed(2)}) despite fundamental trajectory favoring ${pair.baseCurrency} (Fund Δ: +${fundDelta.toFixed(2)}).`
      );
      invalidationConditions.push(
        `Upside recovery in ${pair.baseCurrency} if market price converges back toward structural fundamental advantage.`
      );
    }
  }

  // Stance conflicts
  if (baseStance === 'DOVISH' && rateSpread !== null && rateSpread > 0) {
    contradictoryEvidence.push(
      `${baseInstitution} is actively easing despite nominal carry advantage; rate cuts could compress spread.`
    );
  }
  if (quoteStance === 'HAWKISH' && rateSpread !== null && rateSpread > 0) {
    contradictoryEvidence.push(
      `${quoteInstitution} hawkish posture threatens to narrow the carry advantage held by ${pair.baseCurrency}.`
    );
  }

  // Add key risks from central banks as invalidation conditions
  baseIntel.centralBankProfile.majorRisks.slice(0, 1).forEach((r) => {
    invalidationConditions.push(`${pair.baseCurrency} risk: ${r}`);
  });
  quoteIntel.centralBankProfile.majorRisks.slice(0, 1).forEach((r) => {
    invalidationConditions.push(`${pair.quoteCurrency} risk: ${r}`);
  });

  // Data Quality & Provenance
  const baseStatus = baseIntel.fundamentalStatus;
  const quoteStatus = quoteIntel.fundamentalStatus;
  /*
   * A layer is "live" when it is AVAILABLE or PARTIAL. Only UNAVAILABLE
   * means no usable evidence. COMPLETE additionally requires verified live
   * policy evidence on at least one leg.
   */
  const hasLiveMacro =
    (baseStatus !== 'UNAVAILABLE' && quoteStatus !== 'UNAVAILABLE') &&
    (baseStatus === 'AVAILABLE' || quoteStatus === 'AVAILABLE' || baseStatus === 'PARTIAL' || quoteStatus === 'PARTIAL');
  const dataQuality =
    hasLiveMacro && (basePolicy !== null || quotePolicy !== null)
      ? 'COMPLETE'
      : hasLiveMacro
      ? 'PARTIAL'
      : 'UNAVAILABLE';

  return {
    pairSymbol: pair.symbol,
    baseCurrency: baseIntel.currency,
    quoteCurrency: quoteIntel.currency,
    marketStrengthDifferential,
    fundamentalDifferential: {
      baseScore,
      quoteScore,
      delta: fundDelta,
      summary: fundSummary
    },
    policyDifferential: {
      baseRate,
      quoteRate,
      rateSpread,
      baseStance,
      quoteStance,
      stanceDelta,
      baseProvenance,
      quoteProvenance,
      livePolicySpread,
      baseFreshness: basePolicy?.freshness ?? 'UNAVAILABLE',
      quoteFreshness: quotePolicy?.freshness ?? 'UNAVAILABLE',
      baseEffectiveAt: basePolicy?.effectiveAt ?? null,
      quoteEffectiveAt: quotePolicy?.effectiveAt ?? null,
      baseSource: basePolicy?.source ?? null,
      quoteSource: quotePolicy?.source ?? null
    },
    expectationsDifferential: {
      baseSummary,
      quoteSummary,
      comparison: expComparison,
      baseAboveCount: baseExp.aboveCount,
      baseBelowCount: baseExp.belowCount,
      baseInLineCount: baseExp.inLineCount,
      quoteAboveCount: quoteExp.aboveCount,
      quoteBelowCount: quoteExp.belowCount,
      quoteInLineCount: quoteExp.inLineCount,
      directionalEdge
    },
    catalystDifferential: {
      baseCatalysts,
      quoteCatalysts,
      upcomingEvents: upcomingPairEvents
    },
    supportingEvidence,
    contradictoryEvidence,
    invalidationConditions,
    dataQuality,
    provenance: `Comparative fundamental differential derived deterministically from ${pair.baseCurrency} and ${pair.quoteCurrency} verified macroeconomic releases.`
  };
}
