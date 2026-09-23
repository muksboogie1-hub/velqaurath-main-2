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

export interface PairDifferentialParams {
  pair: CurrencyPair;
  baseIntel: CurrencyFundamentalIntelligence;
  quoteIntel: CurrencyFundamentalIntelligence;
  upcomingEvents?: EconomicEvent[];
}

export function evaluateFundamentalDifferential(
  params: PairDifferentialParams
): FundamentalDifferential {
  const { pair, baseIntel, quoteIntel, upcomingEvents = [] } = params;

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
  const baseRate = baseIntel.centralBankProfile.policyRate;
  const quoteRate = quoteIntel.centralBankProfile.policyRate;
  const rateSpread =
    baseRate !== null && quoteRate !== null
      ? Math.round((baseRate - quoteRate) * 100) / 100
      : null;

  const baseStance = baseIntel.centralBankStance;
  const quoteStance = quoteIntel.centralBankStance;

  let stanceDelta = 'Aligned / Neutral policy balance';
  if (baseStance === 'HAWKISH' && quoteStance === 'DOVISH') {
    stanceDelta = `Maximum policy divergence favoring ${pair.baseCurrency} (${baseIntel.centralBankProfile.institution}: HAWKISH vs ${quoteIntel.centralBankProfile.institution}: DOVISH)`;
  } else if (baseStance === 'DOVISH' && quoteStance === 'HAWKISH') {
    stanceDelta = `Maximum policy divergence favoring ${pair.quoteCurrency} (${quoteIntel.centralBankProfile.institution}: HAWKISH vs ${baseIntel.centralBankProfile.institution}: DOVISH)`;
  } else if (baseStance === 'HAWKISH' && quoteStance !== 'HAWKISH') {
    stanceDelta = `${baseIntel.centralBankProfile.institution} retains hawkish tilt relative to ${quoteIntel.centralBankProfile.institution}`;
  } else if (quoteStance === 'HAWKISH' && baseStance !== 'HAWKISH') {
    stanceDelta = `${quoteIntel.centralBankProfile.institution} retains hawkish tilt relative to ${baseIntel.centralBankProfile.institution}`;
  } else if (baseStance === 'DOVISH' && quoteStance !== 'DOVISH') {
    stanceDelta = `${baseIntel.centralBankProfile.institution} is actively easing relative to ${quoteIntel.centralBankProfile.institution}`;
  } else if (quoteStance === 'DOVISH' && baseStance !== 'DOVISH') {
    stanceDelta = `${quoteIntel.centralBankProfile.institution} is actively easing relative to ${baseIntel.centralBankProfile.institution}`;
  }

  // 4. Expectations Differential
  const baseExp = baseIntel.expectationInformation;
  const quoteExp = quoteIntel.expectationInformation;

  const baseSummary = `${pair.baseCurrency}: ${baseExp.aboveCount} beats, ${baseExp.belowCount} misses, ${baseExp.inLineCount} in-line across ${baseExp.totalObservations} releases.`;
  const quoteSummary = `${pair.quoteCurrency}: ${quoteExp.aboveCount} beats, ${quoteExp.belowCount} misses, ${quoteExp.inLineCount} in-line across ${quoteExp.totalObservations} releases.`;

  let expComparison = '';
  if (baseExp.aboveCount > quoteExp.aboveCount && baseExp.belowCount <= quoteExp.belowCount) {
    expComparison = `Data surprise momentum skews positive for ${pair.baseCurrency} compared to ${pair.quoteCurrency}.`;
  } else if (quoteExp.aboveCount > baseExp.aboveCount && quoteExp.belowCount <= baseExp.belowCount) {
    expComparison = `Data surprise momentum skews positive for ${pair.quoteCurrency} compared to ${pair.baseCurrency}.`;
  } else {
    expComparison = `Data surprise momentum is balanced or cross-cutting between ${pair.baseCurrency} and ${pair.quoteCurrency}.`;
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
    if (rateSpread > 0) {
      supportingEvidence.push(
        `Nominal policy carry differential is +${rateSpread.toFixed(2)}% in favor of ${pair.baseCurrency} (${baseRate}% vs ${quoteRate}%).`
      );
    } else if (rateSpread < 0) {
      supportingEvidence.push(
        `Nominal policy carry differential is +${Math.abs(rateSpread).toFixed(2)}% in favor of ${pair.quoteCurrency} (${quoteRate}% vs ${baseRate}%).`
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
      `${baseIntel.centralBankProfile.institution} is actively easing despite nominal carry advantage; rate cuts could compress spread.`
    );
  }
  if (quoteStance === 'HAWKISH' && rateSpread !== null && rateSpread > 0) {
    contradictoryEvidence.push(
      `${quoteIntel.centralBankProfile.institution} hawkish posture threatens to narrow the carry advantage held by ${pair.baseCurrency}.`
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
  const dataQuality =
    baseStatus === 'AVAILABLE' && quoteStatus === 'AVAILABLE'
      ? 'COMPLETE'
      : baseStatus === 'UNAVAILABLE' || quoteStatus === 'UNAVAILABLE'
      ? 'UNAVAILABLE'
      : 'PARTIAL';

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
      stanceDelta
    },
    expectationsDifferential: {
      baseSummary,
      quoteSummary,
      comparison: expComparison
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
