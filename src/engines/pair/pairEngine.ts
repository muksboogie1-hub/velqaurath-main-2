import { getPairSessionRelevance, calculateWatchWindow } from '../session/sessionEngine';
import {
  CurrencyPair,
  CurrencyState,
  EconomicEvent,
  EconomicObservation,
  PairIntelligence,
  OrientationDirection,
  ConvergenceDivergenceType
} from '../../types';
import {
  FundamentalObservation,
  ExpectationSurpriseType,
  FundamentalCategory
} from '../../types/fundamentals';
import { evaluateFundamentalDifferential } from '../../fundamentals/engine/pairDifferentialEngine';
import {
  deriveLivePolicyEvidence,
  evaluateLivePolicySpread,
  LivePolicyEvidence
} from '../../fundamentals/engine/policyEvidence';
import { evaluateCurrencyFundamentalIntelligence } from '../../fundamentals/engine/currencyIntelligenceEngine';
import { buildCentralBankProfile } from '../../fundamentals/centralBank/centralBankProfiles';
import { calculatePairConfluence } from '../confluence/confluenceEngine';
import { evaluateCatalystIntelligence, transformToCatalystEvent } from '../catalyst/catalystEngine';
import { evaluateStructuredContradictions } from '../contradiction/contradictionEngine';
import { evaluateStructuredInvalidation } from '../invalidation/invalidationEngine';
import { evaluateStructuredThesis } from '../thesis/thesisEngine';
import { evaluatePairOpportunity } from '../opportunity/opportunityEngine';

function normalizeObservation(
  o: EconomicObservation | FundamentalObservation
): FundamentalObservation {
  const anyObservation = o as any;

  /*
   * A release with no category is unclassified, not a growth release. Defaulting
   * it to GROWTH let an unclassified print contribute directional growth evidence.
   */
  const rawCategory: string | null = anyObservation.category ?? null;

  /*
   * A missing surprise classification must never be promoted to IN_LINE. The
   * classification is derived from the released actual versus the consensus
   * forecast when both are finite, and is otherwise left explicitly unknown.
   */
  const rawActual: number | null = anyObservation.actual ?? null;
  const rawForecast: number | null = anyObservation.forecast ?? null;
  const derivedSurpriseType: ExpectationSurpriseType =
    anyObservation.surpriseType ??
    (rawActual !== null && rawForecast !== null
      ? rawActual > rawForecast
        ? 'ABOVE_EXPECTATION'
        : rawActual < rawForecast
          ? 'BELOW_EXPECTATION'
          : 'IN_LINE'
      : 'UNKNOWN');

  return {
    id: anyObservation.id,
    currency: String(anyObservation.currency).toUpperCase(),
    indicatorId: anyObservation.indicatorId,
    indicatorName: anyObservation.indicatorName,
    category: (rawCategory ?? 'UNKNOWN') as FundamentalCategory,
    value: anyObservation.actual ?? anyObservation.value ?? null,
    unit: anyObservation.unit || '%',
    period: anyObservation.period || 'Current',
    previous: anyObservation.previous ?? null,
    forecast: anyObservation.forecast ?? null,
    actual: anyObservation.actual ?? null,
    surprise: anyObservation.surprise ?? null,
    surpriseType: derivedSurpriseType,
    releaseDate:
      anyObservation.releaseDate ||
      new Date().toISOString(),
    source:
      anyObservation.sourceName ||
      anyObservation.source ||
      'Finance Calendar',
    sourceName: anyObservation.sourceName || anyObservation.source || null,
    sourceUrl: anyObservation.sourceUrl || '',
    /*
     * VERIFICATION FIELDS
     *
     * Live-evidence verification (policyEvidence.isVerifiedLiveRecord) requires
     * the upstream connection status, provider freshness and publication
     * timestamp. Dropping them here silently downgraded every genuine live
     * policy release to unavailable downstream, so they are preserved here.
     */
    sourceStatus: anyObservation.sourceStatus,
    publishedAt: anyObservation.publishedAt ?? null,
    freshness: anyObservation.freshness,
    fetchedAt:
      anyObservation.fetchedAt ||
      new Date().toISOString(),
    dataStatus:
      anyObservation.dataStatus ||
      'AVAILABLE',
    provenance:
      anyObservation.provenance ||
      'Fundamental live data',
    classification:
      anyObservation.classification ||
      'FACT',
    statements:
      anyObservation.statements || {
        fact:
          `FACT: ${anyObservation.indicatorName} print.`,
        expectation:
          `EXPECTATION: Consensus was ${anyObservation.forecast}.`,
        interpretation:
          'INTERPRETATION: Release recorded.',
        engineAnalysis:
          'ENGINE_ANALYSIS: Evaluated.'
      }
  };
}

export function evaluatePairIntelligence(
  pair: CurrencyPair,
  baseState: CurrencyState,
  quoteState: CurrencyState,
  events: EconomicEvent[],
  date: Date = new Date(),
  isDataFeedConnected: boolean = true,
  observations: (EconomicObservation | FundamentalObservation)[] = []
): PairIntelligence {
  // ---------------------------------------------------------------------------
  // NORMALIZE OBSERVATIONS
  // ---------------------------------------------------------------------------

  const normalizedObservations =
    observations.map(normalizeObservation);

  const normBaseObs = normalizedObservations.filter(
    (o) =>
      o.currency.toUpperCase() ===
      pair.baseCurrency.toUpperCase()
  );

  const normQuoteObs = normalizedObservations.filter(
    (o) =>
      o.currency.toUpperCase() ===
      pair.quoteCurrency.toUpperCase()
  );

  // ---------------------------------------------------------------------------
  // MARKET EVIDENCE
  //
  // Market data is no longer a hard prerequisite for pair intelligence.
  // ---------------------------------------------------------------------------

  const baseMarketStrength = baseState.marketStrength;
  const quoteMarketStrength = quoteState.marketStrength;

  const marketEvidenceAvailable =
    baseMarketStrength !== null &&
    quoteMarketStrength !== null;

  const relativeStrengthDelta = marketEvidenceAvailable
    ? Math.round(
        (baseMarketStrength! - quoteMarketStrength!) * 100
      ) / 100
    : null;

  /*
   * Stale market quotes and a disconnected market provider are different
   * states and are reported as such. Neither is silently upgraded to FRESH.
   *
   * Staleness here means the market evidence itself rests on stale input: the
   * currency feed is flagged STALE, or no market strength is available at all.
   * A basket that is merely narrower because stale contributing quotes were
   * excluded is reduced-breadth evidence, not stale evidence; that caveat is
   * reported by the confluence market layer as AGING/PARTIAL with the stale
   * contributor count, and the pair's own market evidence stays AVAILABLE.
   */
  const stalePairCount =
    (baseState.relativeStrengthBreakdown?.coverage?.stalePairs?.length ?? 0) +
    (quoteState.relativeStrengthBreakdown?.coverage?.stalePairs?.length ?? 0);

  const marketDataFreshness = [
    baseState.marketDataFreshness,
    quoteState.marketDataFreshness
  ].find((value) => value === 'STALE');

  const marketEvidenceState: 'AVAILABLE' | 'STALE' | 'UNAVAILABLE' =
    !marketEvidenceAvailable
      ? marketDataFreshness === 'STALE' || stalePairCount > 0
        ? 'STALE'
        : 'UNAVAILABLE'
      : marketDataFreshness === 'STALE'
      ? 'STALE'
      : 'AVAILABLE';

  // ---------------------------------------------------------------------------
  // LIVE POLICY EVIDENCE (independent of market quotes)
  //
  // Policy evidence is resolved from verified live central-bank records and,
  // when the live fundamental feed published a monetary-policy release, from
  // that release. Missing policy evidence stays null and is never 0%.
  // ---------------------------------------------------------------------------

  const basePolicyEvidence: LivePolicyEvidence = deriveLivePolicyEvidence(
    pair.baseCurrency,
    normBaseObs,
    baseState.centralBank,
    baseState.centralBank?.institution
  );

  const quotePolicyEvidence: LivePolicyEvidence = deriveLivePolicyEvidence(
    pair.quoteCurrency,
    normQuoteObs,
    quoteState.centralBank,
    quoteState.centralBank?.institution
  );

  // ---------------------------------------------------------------------------
  // CENTRAL BANK PROFILES
  // ---------------------------------------------------------------------------

  const baseCb = buildCentralBankProfile(
    pair.baseCurrency,
    {
      institution: baseState.centralBank?.institution,
      policyRate:
        baseState.centralBank?.currentPolicyRate,
      previousPolicyRate:
        baseState.centralBank?.previousPolicyRate,
      stance:
        baseState.centralBank?.stance as any,
      latestDecisionDate:
        baseState.centralBank?.latestDecisionDate,
      nextKnownDecisionDate:
        baseState.centralBank?.nextKnownDecisionDate,
      guidanceSummary:
        baseState.centralBank?.guidanceSummary
    }
  );

  const quoteCb = buildCentralBankProfile(
    pair.quoteCurrency,
    {
      institution: quoteState.centralBank?.institution,
      policyRate:
        quoteState.centralBank?.currentPolicyRate,
      previousPolicyRate:
        quoteState.centralBank?.previousPolicyRate,
      stance:
        quoteState.centralBank?.stance as any,
      latestDecisionDate:
        quoteState.centralBank?.latestDecisionDate,
      nextKnownDecisionDate:
        quoteState.centralBank?.nextKnownDecisionDate,
      guidanceSummary:
        quoteState.centralBank?.guidanceSummary
    }
  );

  // ---------------------------------------------------------------------------
  // FUNDAMENTAL INTELLIGENCE
  // ---------------------------------------------------------------------------

  const baseIntel =
    evaluateCurrencyFundamentalIntelligence({
      currency: baseState.currency,
      observations: normBaseObs,
      centralBank: baseCb,
      marketStrength: baseMarketStrength,
      upcomingEvents: events,
      isDataFeedConnected
    });

  if (
    normBaseObs.length === 0 &&
    baseState.fundamentalState?.fundamentalScore != null
  ) {
    baseIntel.fundamentalScore =
      baseState.fundamentalState.fundamentalScore;

    baseIntel.overallCondition =
      baseState.fundamentalState.overallCondition;
  }

  const quoteIntel =
    evaluateCurrencyFundamentalIntelligence({
      currency: quoteState.currency,
      observations: normQuoteObs,
      centralBank: quoteCb,
      marketStrength: quoteMarketStrength,
      upcomingEvents: events,
      isDataFeedConnected
    });

  if (
    normQuoteObs.length === 0 &&
    quoteState.fundamentalState?.fundamentalScore != null
  ) {
    quoteIntel.fundamentalScore =
      quoteState.fundamentalState.fundamentalScore;

    quoteIntel.overallCondition =
      quoteState.fundamentalState.overallCondition;
  }

  const fundamentalDifferential =
    evaluateFundamentalDifferential({
      pair,
      baseIntel,
      quoteIntel,
      upcomingEvents: events,
      basePolicyEvidence: basePolicyEvidence,
      quotePolicyEvidence: quotePolicyEvidence
    });

  // ---------------------------------------------------------------------------
  // FUNDAMENTAL DIFFERENTIAL
  // NEVER use missing score ?? 0.
  // ---------------------------------------------------------------------------

  const baseFundScore =
    baseState.fundamentalState?.fundamentalScore ??
    baseIntel.fundamentalScore ??
    null;

  const quoteFundScore =
    quoteState.fundamentalState?.fundamentalScore ??
    quoteIntel.fundamentalScore ??
    null;

  const fundDelta =
    baseFundScore !== null &&
    quoteFundScore !== null
      ? Math.round(
          (baseFundScore - quoteFundScore) * 100
        ) / 100
      : fundamentalDifferential?.fundamentalDifferential
          ?.delta ?? null;

  // ---------------------------------------------------------------------------
  // POLICY
  // NEVER convert unavailable policy rates into 0%.
  // Only verified LIVE policy evidence may drive a directional spread.
  // ---------------------------------------------------------------------------

  const baseRate = basePolicyEvidence.policyRate;
  const quoteRate = quotePolicyEvidence.policyRate;

  const policyRateSpread = evaluateLivePolicySpread(
    basePolicyEvidence,
    quotePolicyEvidence
  );

  const baseStanceIsKnown = basePolicyEvidence.stance !== 'UNAVAILABLE';
  const quoteStanceIsKnown = quotePolicyEvidence.stance !== 'UNAVAILABLE';

  // ---------------------------------------------------------------------------
  // ORIENTATION
  //
  // Priority:
  // 1. Market strength when available.
  // 2. Meaningful live fundamental differential when market is unavailable.
  // 3. Meaningful live policy/carry differential when fundamentals are
  //    inconclusive.
  // 4. NEUTRAL when real evidence exists but is balanced.
  // 5. DATA_UNAVAILABLE only when there is genuinely no directional evidence.
  //
  // Session and catalyst layers never manufacture a directional bias.
  // This preserves BASE vs QUOTE orientation without pretending market
  // confirmation exists.
  // ---------------------------------------------------------------------------

  const hasLiveMacroEvidence =
    fundDelta !== null ||
    policyRateSpread !== null ||
    (basePolicyEvidence.availability === 'AVAILABLE' &&
      quotePolicyEvidence.availability === 'AVAILABLE');

  let orientationDirection: OrientationDirection = 'NEUTRAL';

  let orientationExplanation = '';

  if (!isDataFeedConnected) {
    /*
     * A globally disconnected feed set is a genuine total data outage, not a
     * missing single layer. This is the only case that forces
     * DATA_UNAVAILABLE for the whole pair.
     */
    orientationDirection = 'DATA_UNAVAILABLE';

    orientationExplanation =
      `DATA UNAVAILABLE: upstream data feeds are disconnected for ${pair.symbol}. ` +
      'No evidence layer can be verified until the feeds reconnect.';
  } else if (relativeStrengthDelta !== null) {
    if (relativeStrengthDelta >= 0.08) {
      orientationDirection = 'BULLISH_BASE';

      orientationExplanation =
        `Market-confirmed orientation: base currency ` +
        `(${pair.baseCurrency}: ${baseMarketStrength! >= 0 ? '+' : ''}${baseMarketStrength!.toFixed(2)}) ` +
        `is stronger than quote currency ` +
        `(${pair.quoteCurrency}: ${quoteMarketStrength! >= 0 ? '+' : ''}${quoteMarketStrength!.toFixed(2)}), ` +
        `producing Δ = +${relativeStrengthDelta.toFixed(2)}.`;
    } else if (relativeStrengthDelta <= -0.08) {
      orientationDirection = 'BEARISH_BASE';

      orientationExplanation =
        `Market-confirmed orientation: base currency ` +
        `(${pair.baseCurrency}: ${baseMarketStrength! >= 0 ? '+' : ''}${baseMarketStrength!.toFixed(2)}) ` +
        `is weaker than quote currency ` +
        `(${pair.quoteCurrency}: ${quoteMarketStrength! >= 0 ? '+' : ''}${quoteMarketStrength!.toFixed(2)}), ` +
        `producing Δ = ${relativeStrengthDelta.toFixed(2)}.`;
    } else {
      orientationDirection = 'NEUTRAL';

      orientationExplanation =
        `Market strength is relatively balanced: ` +
        `${pair.baseCurrency} vs ${pair.quoteCurrency} has Δ = ` +
        `${relativeStrengthDelta >= 0 ? '+' : ''}${relativeStrengthDelta.toFixed(2)}.`;
    }
  } else if (
    fundDelta !== null &&
    Math.abs(fundDelta) >= 0.06
  ) {
    orientationDirection =
      fundDelta > 0
        ? 'BULLISH_BASE'
        : 'BEARISH_BASE';

    orientationExplanation =
      `MARKET CONFIRMATION ${marketEvidenceState === 'STALE' ? 'STALE' : 'UNAVAILABLE'}: ` +
      `directional orientation is derived from the verified fundamental ` +
      `differential instead. ` +
      `${pair.baseCurrency}/${pair.quoteCurrency} Fund Δ = ` +
      `${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}. ` +
      `This is a macro-derived bias, not live market-strength confirmation.`;
  } else if (
    policyRateSpread !== null &&
    Math.abs(policyRateSpread) >= 0.5
  ) {
    orientationDirection =
      policyRateSpread > 0
        ? 'BULLISH_BASE'
        : 'BEARISH_BASE';

    orientationExplanation =
      `MARKET CONFIRMATION ${marketEvidenceState === 'STALE' ? 'STALE' : 'UNAVAILABLE'}: ` +
      `directional orientation is derived from the verified live policy-rate ` +
      `differential. ` +
      `${pair.baseCurrency} ${basePolicyEvidence.institution} at ` +
      `${baseRate?.toFixed(2)}% vs ${pair.quoteCurrency} ` +
      `${quotePolicyEvidence.institution} at ${quoteRate?.toFixed(2)}%, ` +
      `policy spread = ${policyRateSpread >= 0 ? '+' : ''}${policyRateSpread.toFixed(2)}%. ` +
      `This is a policy-derived carry bias, not live market-strength confirmation.`;
  } else if (!hasLiveMacroEvidence) {
    orientationDirection = 'DATA_UNAVAILABLE';

    orientationExplanation =
      `No verified directional evidence is available for ${pair.symbol}. ` +
      `Live market strength is ${marketEvidenceState === 'STALE' ? 'stale' : 'unavailable'}, ` +
      'and no live fundamental or policy differential could be verified. ' +
      'Session and catalyst evidence is intentionally excluded from directional bias.';
  } else {
    orientationDirection = 'NEUTRAL';

    orientationExplanation =
      `Live market strength is ${marketEvidenceState === 'STALE' ? 'stale' : 'unavailable'} ` +
      `and the available verified fundamental and policy evidence between ` +
      `${pair.baseCurrency} and ${pair.quoteCurrency} is balanced rather than decisive.`;
  }

  // ---------------------------------------------------------------------------
  // CONVERGENCE / DIVERGENCE
  // ---------------------------------------------------------------------------

  let convergenceDivergence:
    ConvergenceDivergenceType = 'MIXED';

  let convergenceExplanation = '';

  if (
    relativeStrengthDelta !== null &&
    fundDelta !== null
  ) {
    if (
      (relativeStrengthDelta > 0.05 &&
        fundDelta > 0.02) ||
      (relativeStrengthDelta < -0.05 &&
        fundDelta < -0.02)
    ) {
      convergenceDivergence = 'CONVERGENCE';

      convergenceExplanation =
        `Market strength (Δ = ${relativeStrengthDelta >= 0 ? '+' : ''}${relativeStrengthDelta.toFixed(2)}) ` +
        `and fundamentals (Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}) ` +
        'point in the same directional vector.';
    } else if (
      (relativeStrengthDelta > 0.05 &&
        fundDelta < -0.02) ||
      (relativeStrengthDelta < -0.05 &&
        fundDelta > 0.02)
    ) {
      convergenceDivergence = 'DIVERGENCE';

      convergenceExplanation =
        `Market strength (Δ = ${relativeStrengthDelta >= 0 ? '+' : ''}${relativeStrengthDelta.toFixed(2)}) ` +
        `conflicts with fundamentals (Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}).`;
    } else {
      convergenceDivergence = 'MIXED';

      convergenceExplanation =
        'Market and fundamental evidence are not sufficiently aligned for a clear convergence classification.';
    }
  } else if (fundDelta !== null) {
    convergenceDivergence = 'MIXED';

    convergenceExplanation =
      `Market strength confirmation is unavailable. ` +
      `Fundamental differential remains ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}, ` +
      'so macro evidence can be evaluated independently.';
  } else {
    convergenceDivergence = 'DATA_UNAVAILABLE';

    convergenceExplanation =
      'Insufficient independent market/fundamental differential evidence for convergence analysis.';
  }

  // ---------------------------------------------------------------------------
  // SUPPORTING / COUNTER EVIDENCE
  // ---------------------------------------------------------------------------

  const supporting: string[] = [];
  const counter: string[] = [];

  const marketConfirmationNote =
    marketEvidenceState === 'STALE'
      ? 'live market quotes are stale, so price confirmation is unavailable.'
      : marketEvidenceAvailable
      ? ''
      : 'live market strength is currently unavailable.';

  if (orientationDirection === 'DATA_UNAVAILABLE') {
    counter.push(
      `No verified directional evidence is available for ${pair.symbol}: ` +
      `market strength is ${marketEvidenceState === 'STALE' ? 'stale' : 'unavailable'} and ` +
      'no live fundamental or policy differential could be verified.'
    );
  } else if (orientationDirection === 'BULLISH_BASE') {
    if (relativeStrengthDelta !== null) {
      supporting.push(
        `${pair.baseCurrency} has superior live relative strength ` +
        `versus ${pair.quoteCurrency} (Δ = ${relativeStrengthDelta >= 0 ? '+' : ''}${relativeStrengthDelta.toFixed(2)}%).`
      );
    } else if (fundDelta !== null && Math.abs(fundDelta) >= 0.06) {
      supporting.push(
        `Verified fundamental differential favors ${pair.baseCurrency} ` +
        `(Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}); ` +
        `${marketConfirmationNote}`
      );
    } else if (policyRateSpread !== null) {
      supporting.push(
        `Verified live policy carry favors ${pair.baseCurrency} ` +
        `(${basePolicyEvidence.institution} ${baseRate?.toFixed(2)}% vs ` +
        `${quotePolicyEvidence.institution} ${quoteRate?.toFixed(2)}%, ` +
        `spread +${policyRateSpread.toFixed(2)}%); ${marketConfirmationNote}`
      );
    }

    if (
      (baseStanceIsKnown && basePolicyEvidence.stance === 'HAWKISH') ||
      (quoteStanceIsKnown && quotePolicyEvidence.stance === 'DOVISH')
    ) {
      supporting.push(
        `Verified monetary-policy divergence favors ${pair.baseCurrency} ` +
        `(${basePolicyEvidence.institution}: ${basePolicyEvidence.stance} ` +
        `vs ${quotePolicyEvidence.institution}: ${quotePolicyEvidence.stance}).`
      );
    }

    if (
      quoteStanceIsKnown &&
      quotePolicyEvidence.stance === 'HAWKISH'
    ) {
      counter.push(
        `${quotePolicyEvidence.institution} is tightening (${quotePolicyEvidence.stance} ` +
        `from the ${quotePolicyEvidence.effectiveAt ?? 'latest'} decision), which works ` +
        `against the ${pair.baseCurrency} carry advantage.`
      );
    }

    if (policyRateSpread !== null) {
      if (policyRateSpread > 0) {
        supporting.push(
          `Positive nominal policy-rate differential of +${policyRateSpread.toFixed(
            2
          )}% favors ${pair.baseCurrency}.`
        );
      } else {
        counter.push(
          `Negative policy-rate differential of ${policyRateSpread.toFixed(
            2
          )}% works against ${pair.baseCurrency}.`
        );
      }
    }
  } else if (orientationDirection === 'BEARISH_BASE') {
    if (relativeStrengthDelta !== null) {
      supporting.push(
        `${pair.quoteCurrency} has superior live relative strength ` +
        `versus ${pair.baseCurrency} (Δ = ${relativeStrengthDelta >= 0 ? '+' : ''}${relativeStrengthDelta.toFixed(2)}%).`
      );
    } else if (fundDelta !== null && Math.abs(fundDelta) >= 0.06) {
      supporting.push(
        `Verified fundamental differential favors ${pair.quoteCurrency} ` +
        `(Fund Δ = ${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}); ` +
        `${marketConfirmationNote}`
      );
    } else if (policyRateSpread !== null) {
      supporting.push(
        `Verified live policy carry favors ${pair.quoteCurrency} ` +
        `(${quotePolicyEvidence.institution} ${quoteRate?.toFixed(2)}% vs ` +
        `${basePolicyEvidence.institution} ${baseRate?.toFixed(2)}%, ` +
        `spread ${policyRateSpread.toFixed(2)}%); ${marketConfirmationNote}`
      );
    }

    if (
      (quoteStanceIsKnown && quotePolicyEvidence.stance === 'HAWKISH') ||
      (baseStanceIsKnown && basePolicyEvidence.stance === 'DOVISH')
    ) {
      supporting.push(
        `Verified monetary-policy divergence favors ${pair.quoteCurrency} ` +
        `(${quotePolicyEvidence.institution}: ${quotePolicyEvidence.stance} ` +
        `vs ${basePolicyEvidence.institution}: ${basePolicyEvidence.stance}).`
      );
    }

    if (policyRateSpread !== null) {
      if (policyRateSpread < 0) {
        supporting.push(
          `Policy-rate spread favors ${pair.quoteCurrency} by +${Math.abs(
            policyRateSpread
          ).toFixed(2)}%.`
        );
      } else {
        counter.push(
          `Policy-rate differential of +${policyRateSpread.toFixed(
            2
          )}% favors ${pair.baseCurrency}.`
        );
      }
    }
  } else {
    if (relativeStrengthDelta !== null) {
      supporting.push(
        `Live market evidence is relatively balanced for ${pair.symbol}.`
      );
    }

    if (fundDelta !== null || policyRateSpread !== null) {
      supporting.push(
        `Verified macro evidence is present but balanced between ` +
        `${pair.baseCurrency} and ${pair.quoteCurrency} ` +
        `(Fund Δ = ${fundDelta === null ? 'unavailable' : `${fundDelta >= 0 ? '+' : ''}${fundDelta.toFixed(2)}`}, ` +
        `policy spread = ${policyRateSpread === null ? 'unavailable' : `${policyRateSpread >= 0 ? '+' : ''}${policyRateSpread.toFixed(2)}%`}).`
      );
    }

    if (!marketEvidenceAvailable) {
      counter.push(
        `Live market confirmation is ${
          marketEvidenceState === 'STALE' ? 'stale' : 'unavailable'
        } for ${pair.symbol}; the balance above is macro-derived.`
      );
    }
  }

  if (
    baseState.conflictingEvidence?.length > 0
  ) {
    counter.push(
      `${pair.baseCurrency}: ${baseState.conflictingEvidence[0]}`
    );
  }

  if (
    quoteState.conflictingEvidence?.length > 0
  ) {
    counter.push(
      `${pair.quoteCurrency}: ${quoteState.conflictingEvidence[0]}`
    );
  }

  // ---------------------------------------------------------------------------
  // CATALYSTS
  // ---------------------------------------------------------------------------

  const pairEvents = events.filter(
    (e: EconomicEvent) =>
      e.currency === pair.baseCurrency ||
      e.currency === pair.quoteCurrency
  );

  const { catalysts: catalystIntelligence } =
    evaluateCatalystIntelligence(
      pairEvents,
      undefined,
      date
    );

  // ---------------------------------------------------------------------------
  // STRUCTURED CONTRADICTIONS
  // ---------------------------------------------------------------------------

  const {
    contradictions: structuredContradictions
  } = evaluateStructuredContradictions({
    pair,
    baseState,
    quoteState,
    relativeStrengthDelta,
    orientationDirection,
    fundamentalDiff: fundamentalDifferential,
    now: date
  });

  // ---------------------------------------------------------------------------
  // INVALIDATION
  // ---------------------------------------------------------------------------

  const {
    conditions: structuredInvalidation
  } = evaluateStructuredInvalidation({
    pair,
    baseState,
    quoteState,
    relativeStrengthDelta,
    orientationDirection,
    fundamentalDiff: fundamentalDifferential,
    isDataFeedConnected,
    now: date
  });

  // ---------------------------------------------------------------------------
  // THESIS
  // ---------------------------------------------------------------------------

  const structuredThesis =
    evaluateStructuredThesis({
      pair,
      baseState,
      quoteState,
      relativeStrengthDelta,
      orientationDirection,
      supportingEvidence: supporting,
      counterEvidence: counter,
      catalysts: catalystIntelligence,
      contradictions: structuredContradictions,
      invalidationConditions: structuredInvalidation,
      fundamentalDiff: fundamentalDifferential,
      isDataFeedConnected,
      now: date
    });

  // ---------------------------------------------------------------------------
  // CONFLUENCE
  // ---------------------------------------------------------------------------

  const confluence =
    calculatePairConfluence({
      pair,
      baseState,
      quoteState,
      relativeStrengthDelta,
      orientationDirection,
      events,
      fundamentalDiff: fundamentalDifferential,
      marketDataTimestamp: null,
      fundamentalDataTimestamp:
        basePolicyEvidence.fetchedAt ?? quotePolicyEvidence.fetchedAt,
      date,
      isDataFeedConnected,
      basePolicyEvidence,
      quotePolicyEvidence,
      marketEvidenceState
    });

  // ---------------------------------------------------------------------------
  // DETAILED ORIENTATION
  // ---------------------------------------------------------------------------

  let detailedOrientation:
    | 'DIRECTIONAL_STRENGTH_ALIGNMENT'
    | 'DIRECTIONAL_FUNDAMENTAL_ALIGNMENT'
    | 'COMPLETE_CONFLUENCE'
    | 'DIVERGENT'
    | 'CONTRADICTORY'
    | 'UNRESOLVED'
    | 'DATA_INSUFFICIENT';

  const macroDifferentialScore =
    fundamentalDifferential
      ?.fundamentalDifferential?.delta ??
    fundDelta ??
    null;

  if (
    orientationDirection === 'NEUTRAL' &&
    relativeStrengthDelta === null &&
    (
      macroDifferentialScore === null ||
      Math.abs(macroDifferentialScore) < 0.06
    )
  ) {
    detailedOrientation =
      'DATA_INSUFFICIENT';
  } else if (
    structuredContradictions.some(
      (c) => c.severity === 'HIGH'
    )
  ) {
    detailedOrientation =
      'CONTRADICTORY';
  } else if (
    relativeStrengthDelta !== null &&
    macroDifferentialScore !== null &&
    (
      (relativeStrengthDelta >= 0.10 &&
        macroDifferentialScore < -0.04) ||
      (relativeStrengthDelta <= -0.10 &&
        macroDifferentialScore > 0.04)
    )
  ) {
    detailedOrientation = 'DIVERGENT';
  } else if (
    relativeStrengthDelta !== null &&
    macroDifferentialScore !== null &&
    (
      (relativeStrengthDelta >= 0.10 &&
        macroDifferentialScore >= 0.04) ||
      (relativeStrengthDelta <= -0.10 &&
        macroDifferentialScore <= -0.04)
    )
  ) {
    detailedOrientation =
      'COMPLETE_CONFLUENCE';
  } else if (
    relativeStrengthDelta !== null &&
    Math.abs(relativeStrengthDelta) >= 0.10
  ) {
    detailedOrientation =
      'DIRECTIONAL_STRENGTH_ALIGNMENT';
  } else if (
    macroDifferentialScore !== null &&
    Math.abs(macroDifferentialScore) >= 0.06
  ) {
    detailedOrientation =
      'DIRECTIONAL_FUNDAMENTAL_ALIGNMENT';
  } else {
    detailedOrientation =
      'UNRESOLVED';
  }

  // ---------------------------------------------------------------------------
  // THESIS TEXT
  // ---------------------------------------------------------------------------

  let thesis = '';

  if (
    orientationDirection === 'BULLISH_BASE'
  ) {
    thesis =
      relativeStrengthDelta !== null
        ? `Macro and market evidence currently favor ${pair.baseCurrency} against ${pair.quoteCurrency}. ` +
          `Live relative strength differential is +${relativeStrengthDelta.toFixed(
            2
          )}.`
        : `Available macro and policy evidence favor ${pair.baseCurrency} against ${pair.quoteCurrency}. ` +
          `Live market-strength confirmation is ${
            marketEvidenceState === 'STALE' ? 'stale' : 'unavailable'
          }.`;
  } else if (
    orientationDirection === 'BEARISH_BASE'
  ) {
    thesis =
      relativeStrengthDelta !== null
        ? `Macro and market evidence currently favor ${pair.quoteCurrency} over ${pair.baseCurrency}. ` +
          `Live relative strength differential is ${relativeStrengthDelta.toFixed(
            2
          )}.`
        : `Available macro and policy evidence favor ${pair.quoteCurrency} over ${pair.baseCurrency}. ` +
          `Live market-strength confirmation is ${
            marketEvidenceState === 'STALE' ? 'stale' : 'unavailable'
          }.`;
  } else if (orientationDirection === 'DATA_UNAVAILABLE') {
    thesis =
      `No verified directional evidence is available for ${pair.symbol}. ` +
      `Live market strength is ${
        marketEvidenceState === 'STALE' ? 'stale' : 'unavailable'
      } and no live fundamental or policy differential could be verified.`;
  } else {
    thesis =
      `No decisive directional differential is currently established for ${pair.symbol}. ` +
      'Available evidence remains balanced or incomplete.';
  }

  // ---------------------------------------------------------------------------
  // RISKS / INVALIDATION
  // ---------------------------------------------------------------------------

  const invalidationConditions = [
    `Shift in ${pair.baseCurrency} central-bank stance during the next scheduled decision.`,
    `Significant surprise on upcoming ${pair.quoteCurrency} inflation or employment data altering the expected policy path.`,
    ...(relativeStrengthDelta !== null
      ? [
          `Relative strength differential reverting toward neutral bounds (|Δ| < 0.05).`
        ]
      : [
          'Restoration of live market data should be used to confirm or challenge the macro-derived directional bias.'
        ])
  ];

  const risks = [
    'Unscheduled central-bank intervention or emergency communication.',
    'Abrupt global risk-sentiment pivot affecting funding currencies.',
    'Carry unwinds in high-yielding cross allocations.',
    ...(relativeStrengthDelta === null
      ? [
          `Live market-strength confirmation is ${
            marketEvidenceState === 'STALE' ? 'stale' : 'unavailable'
          }; price confirmation may differ from the macro-derived bias.`
        ]
      : [])
  ];

  // ---------------------------------------------------------------------------
  // SESSION / WATCH WINDOW
  // ---------------------------------------------------------------------------

  const sessionRel =
    getPairSessionRelevance(pair.symbol);

  const watchWindow =
    calculateWatchWindow(
      pair,
      events,
      date,
      marketEvidenceAvailable
    );

  // ---------------------------------------------------------------------------
  // SOURCES
  // ---------------------------------------------------------------------------

  const sources = [
    {
      name:
        baseState.centralBank?.sourceMetadata
          ?.sourceName || 'Central Bank',
      url:
        baseState.centralBank?.sourceMetadata
          ?.sourceUrl || '',
      classification: 'FACT' as const
    },
    {
      name:
        quoteState.centralBank?.sourceMetadata
          ?.sourceName || 'Central Bank',
      url:
        quoteState.centralBank?.sourceMetadata
          ?.sourceUrl || '',
      classification: 'FACT' as const
    }
  ];

  // ---------------------------------------------------------------------------
  // PAIR INTELLIGENCE
  // ---------------------------------------------------------------------------

  const pairIntel: PairIntelligence = {
    pair,
    symbol: pair.symbol,

    baseCurrency: baseState.currency,
    quoteCurrency: quoteState.currency,

    baseState,
    quoteState,

    baseMarketStrength,
    quoteMarketStrength,

    marketStrengthDifferential:
      relativeStrengthDelta,

    baseFundamentalEvidence:
      baseState.supportingEvidence || [],

    quoteFundamentalEvidence:
      quoteState.supportingEvidence || [],

    fundamentalDifferential,

    baseCentralBank:
      baseState.centralBank,

    quoteCentralBank:
      quoteState.centralBank,

    policyDifferential:
      fundamentalDifferential?.policyDifferential,

    expectationDifferential:
      fundamentalDifferential?.expectationsDifferential,

    sessionContext: sessionRel,

    relativeStrengthDelta,

    orientationDirection,

    orientation:
      detailedOrientation,

    orientationExplanation,

    convergenceDivergence,

    convergenceExplanation,

    supportingEvidence: supporting,

    opposingEvidence: counter,

    counterEvidence: counter,

    catalysts: pairEvents,

    catalystIntelligence,

    contradictions:
      structuredContradictions,

    risks,

    thesis,

    structuredThesis,

    invalidationConditions,

    structuredInvalidation,

    structuredContradictions,

    sessionRelevance: {
      primarySession:
        sessionRel.primarySession,
      relevantSessions:
        sessionRel.relevantSessions,
      structuralRationale:
        sessionRel.structuralRationale
    },

    watchWindow,

    lastUpdated:
      new Date().toISOString(),

    sources,

    confluence,

    confidence:
      confluence?.directionalConfidence ||
      'LOW',

    dataQuality:
      (confluence?.dataQuality as any) ||
      'UNAVAILABLE',

    /*
     * Pair freshness reflects the pair/market evidence state. Macro or policy
     * component aging stays visible through that component's own freshness and
     * through confluence.agingComponents, and must not relabel a live market
     * pair as STALE.
     */
    freshness: (() => {
      if (marketEvidenceState === 'STALE') return 'STALE';
      if (marketEvidenceState === 'UNAVAILABLE') return 'UNAVAILABLE';
      if (confluence?.staleComponents?.length) return 'STALE';
      if (confluence?.dataQuality === 'DEGRADED') return 'AGING';
      if (confluence?.agingComponents?.length) return 'AGING';
      return 'FRESH';
    })(),

    marketEvidenceState,

    evidenceFreshness: {
      market: marketEvidenceState,
      fundamental:
        confluence?.components?.fundamentals?.availability === 'UNAVAILABLE'
          ? 'UNAVAILABLE'
          : confluence?.components?.fundamentals?.freshness === 'FRESH'
          ? 'AVAILABLE'
          : 'STALE',
      policy:
        confluence?.components?.policy?.availability === 'UNAVAILABLE'
          ? 'UNAVAILABLE'
          : confluence?.components?.policy?.freshness === 'FRESH'
          ? 'AVAILABLE'
          : 'STALE',
      catalysts:
        confluence?.components?.catalysts?.availability === 'UNAVAILABLE'
          ? 'UNAVAILABLE'
          : 'AVAILABLE',
      session:
        confluence?.components?.session?.availability === 'UNAVAILABLE'
          ? 'UNAVAILABLE'
          : 'AVAILABLE'
    }
  };

  pairIntel.structuredOpportunity =
    evaluatePairOpportunity(pairIntel);

  return pairIntel;
}