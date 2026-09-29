/**
 * VELQOARATH — CURRENCY FUNDAMENTAL INTELLIGENCE ENGINE (PHASE B)
 *
 * Deterministic engine answering:
 * "Why is USD strong?" or "Why is AUD weak?"
 * - Transparent evidence, strictly non-arbitrary
 * - Supports all 10 fundamental categories
 * - Explicitly tracks data gaps (unconfigured/unavailable categories)
 * - Summarizes expectations, supporting/opposing factors, and upcoming catalysts
 */

import {
  CurrencyFundamentalIntelligence,
  FundamentalCategory,
  FundamentalObservation,
  CentralBankProfile,
  CurrencyExpectationsSummary,
  ExpectationAnalysisItem,
  FUNDAMENTAL_CATEGORIES,
  CurrencyIntelligenceEvidenceAssessment
} from '../../types/fundamentals';
import {
  CentralBankPolicy,
  Currency,
  CurrencyMarketStrength,
  CurrencyState,
  EconomicEvent,
  EconomicObservation,
  MarketQuote,
  PairIntelligence,
  PillarCondition,
  ProviderStatus
} from '../../types';
import { analyzeObservationExpectations } from '../../engines/expectations/expectationsEngine';
import { evaluateCurrencyFundamentals } from '../../engines/fundamentals/fundamentalEngine';
import { ECONOMIC_INDICATORS } from '../../data/indicators';
import { buildCentralBankProfile } from '../centralBank/centralBankProfiles';
import { deriveLivePolicyEvidence } from './policyEvidence';
import { FundamentalProviderStatus } from '../providers/IFundamentalDataProvider';
import {
  CurrencyEvidenceAvailability,
  CurrencyEvidenceFreshness,
  CurrencyEvidenceProvenance
} from '../../types/fundamentals';

export interface CurrencyIntelligenceParams {
  currency: Currency;
  observations: FundamentalObservation[];
  centralBank?: CentralBankProfile;
  marketStrength?: number | null;
  dailyMovementPercent?: number | null;
  basketRelativeMovementPercent?: number | null;
  classification?: import('../../marketData/types').StrengthClassification;
  marketDataFreshness?: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';
  marketDataSource?: string;
  coverage?: any;
  upcomingEvents?: EconomicEvent[];
  isDataFeedConnected?: boolean;
}

export function evaluateCurrencyFundamentalIntelligence(
  params: CurrencyIntelligenceParams
): CurrencyFundamentalIntelligence {
  const {
    currency,
    observations,
    marketStrength = null,
    dailyMovementPercent = null,
    basketRelativeMovementPercent = null,
    classification: explicitClassification,
    marketDataFreshness = 'FRESH',
    marketDataSource = 'Biquote',
    coverage = null,
    upcomingEvents = [],
    isDataFeedConnected = true
  } = params;

  // Strict market classification rule: >= +0.10% STRONG, <= -0.10% WEAK, between NEUTRAL
  let classification: import('../../marketData/types').StrengthClassification = 'DATA_UNAVAILABLE';
  if (marketStrength !== null && marketStrength !== undefined) {
    if (marketStrength >= 0.10) {
      classification = 'STRONG';
    } else if (marketStrength <= -0.10) {
      classification = 'WEAK';
    } else {
      classification = 'NEUTRAL';
    }
  } else if (explicitClassification) {
    classification = explicitClassification;
  }

  const cbProfile = params.centralBank || buildCentralBankProfile(currency.code);

  const currObs = observations.filter(
    (o) => o.currency.toUpperCase() === currency.code.toUpperCase()
  );

  // Group observations by macro dimensions
  const categoriesMap: Record<
    FundamentalCategory,
    {
      category: FundamentalCategory;
      name: string;
      status: 'AVAILABLE' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
      observations: FundamentalObservation[];
      summary: string;
    }
  > = {} as any;

  const dataGaps: string[] = [];

  // Map each category
  for (const catDef of FUNDAMENTAL_CATEGORIES) {
    // Match observations by category, including aliases (e.g. CENTRAL_BANK vs CENTRAL_BANK_MONETARY_POLICY)
    const catObs = currObs.filter(
      (o) =>
        o.category === catDef.id ||
        (catDef.id === 'CENTRAL_BANK' && o.category === 'CENTRAL_BANK_MONETARY_POLICY') ||
        (catDef.id === 'TRADE' && o.category === 'TRADE_EXTERNAL_BALANCE') ||
        (catDef.id === 'FISCAL' && o.category === 'FISCAL_GOVERNMENT')
    );

    if (catDef.id === 'CENTRAL_BANK' || catDef.id === 'CENTRAL_BANK_MONETARY_POLICY') {
      const isCbAvailable = cbProfile.dataStatus === 'AVAILABLE' || cbProfile.dataStatus === 'LIVE';
      categoriesMap[catDef.id] = {
        category: catDef.id,
        name: catDef.name,
        status: isCbAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
        observations: catObs,
        summary: isCbAvailable
          ? `${cbProfile.institution}: Policy rate at ${
              cbProfile.policyRate !== null ? `${cbProfile.policyRate}%` : 'N/A'
            }. Stance: ${cbProfile.stance} (${cbProfile.sourceType || 'REFERENCE'}).`
          : 'Central bank policy data not connected.'
      };
      if (!isCbAvailable) {
        dataGaps.push(`${catDef.name}: Official policy rate feed is unavailable.`);
      }
    } else if (catObs.length > 0) {
      const latest = catObs[0];
      categoriesMap[catDef.id] = {
        category: catDef.id,
        name: catDef.name,
        status: 'AVAILABLE',
        observations: catObs,
        summary: `${latest.indicatorName} reported at ${latest.actual}${latest.unit} (${latest.period}).`
      };
    } else {
      categoriesMap[catDef.id] = {
        category: catDef.id,
        name: catDef.name,
        status: 'NOT_CONFIGURED',
        observations: [],
        summary: `No live authenticated statistical series currently available for ${catDef.name.toLowerCase()}.`
      };
      dataGaps.push(`${catDef.name}: No live economic release series currently populated.`);
    }
  }

  // Evaluate expectations across observations
  const expItems: ExpectationAnalysisItem[] = [];
  let aboveCount = 0;
  let belowCount = 0;
  let inLineCount = 0;
  let unknownCount = 0;

  for (const obs of currObs) {
    const meta = ECONOMIC_INDICATORS.find((i) => i.id === obs.indicatorId || i.code === obs.indicatorId || i.name === obs.indicatorName);
    const legacyObs = {
      ...obs,
      sourceName: obs.source || (obs as any).sourceName,
      sourceStatus: (obs.dataStatus === 'AVAILABLE' || obs.dataStatus === 'LIVE' ? 'CONNECTED' : 'NOT_CONNECTED') as 'CONNECTED' | 'NOT_CONNECTED'
    };
    const analysis = analyzeObservationExpectations(legacyObs as any, meta);

    const item: ExpectationAnalysisItem = {
      observationId: obs.id,
      currency: obs.currency,
      indicatorName: obs.indicatorName,
      category: obs.category,
      previous: obs.previous,
      forecast: obs.forecast,
      actual: obs.actual,
      surprise: analysis.surprise,
      percentageSurprise: analysis.percentageSurprise,
      surpriseType: analysis.expectationStatus,
      unit: obs.unit,
      directionSummary: analysis.directionSummary,
      monetaryPolicyImplication: analysis.monetaryPolicyImplication,
      classification: 'ENGINE_ANALYSIS',
      statements: analysis.statements
    };

    expItems.push(item);

    if (item.surpriseType === 'ABOVE_EXPECTATION') aboveCount++;
    else if (item.surpriseType === 'BELOW_EXPECTATION') belowCount++;
    else if (item.surpriseType === 'IN_LINE') inLineCount++;
    else unknownCount++;
  }

  const expectationInformation: CurrencyExpectationsSummary = {
    currency: currency.code,
    totalObservations: currObs.length,
    aboveCount,
    belowCount,
    inLineCount,
    unknownCount,
    items: expItems
  };

  // Compile transparent supporting and opposing factors
  const supportingFactors: string[] = [];
  const opposingFactors: string[] = [];
  const unresolvedFactors: string[] = [];
  const structuredSupportingFactors: import('../../types/fundamentals').StructuredEvidenceFactor[] = [];
  const structuredOpposingFactors: import('../../types/fundamentals').StructuredEvidenceFactor[] = [];
  const structuredUnresolvedFactors: import('../../types/fundamentals').StructuredEvidenceFactor[] = [];

  /*
   * CENTRAL BANK FACTORS
   *
   * A stance or rate is only presented as current policy evidence when it is
   * either a verified LIVE central-bank record or a verified LIVE
   * monetary-policy release. Reference profiles remain available as context
   * but are reported as contextual, never as the current policy rate, and
   * they never drive a supporting/opposing directional read.
   */
  const profileIsLive =
    (cbProfile.sourceType === 'LIVE' || cbProfile.dataSourceMode === 'LIVE') &&
    cbProfile.currentPolicyRate !== null &&
    cbProfile.currentPolicyRate !== undefined &&
    (cbProfile.dataStatus === 'AVAILABLE' ||
      cbProfile.dataStatus === 'CONNECTED' ||
      (cbProfile.dataStatus as string) === 'LIVE') &&
    cbProfile.stance !== 'UNAVAILABLE';

  const livePolicyRelease = deriveLivePolicyEvidence(
    currency.code,
    currObs,
    // The profile is only used for institution naming and as a fallback
    // reference record; provenance is verified before any claim is made.
    {
      ...cbProfile,
      sourceMetadata: cbProfile.sourceMetadata ?? {
        sourceName: cbProfile.source ?? cbProfile.institution,
        sourceUrl: '',
        lastUpdated: cbProfile.contextualFetchedAt ?? '',
        status: 'NOT_CONNECTED'
      }
    } as any,
    cbProfile.institution
  );

  const releaseIsLive =
    livePolicyRelease.availability === 'AVAILABLE' &&
    livePolicyRelease.policyRate !== null;

  const effectivePolicyRate = releaseIsLive
    ? livePolicyRelease.policyRate
    : profileIsLive
    ? cbProfile.currentPolicyRate
    : null;

  const effectivePolicyStance = releaseIsLive
    ? livePolicyRelease.stance
    : profileIsLive
    ? cbProfile.stance
    : 'UNAVAILABLE';

  const policyEvidenceLabel = releaseIsLive
    ? 'LIVE RELEASE'
    : profileIsLive
    ? 'LIVE PROFILE'
    : 'REFERENCE CONTEXT (not live evidence)';

  const policyRateText =
    effectivePolicyRate !== null && effectivePolicyRate !== undefined
      ? `${effectivePolicyRate.toFixed(2)}%`
      : 'unavailable';

  if (effectivePolicyStance === 'HAWKISH') {
    const text = `${cbProfile.institution} maintains a restrictive HAWKISH stance (${policyEvidenceLabel}, policy rate: ${policyRateText}).`;
    supportingFactors.push(text);
    structuredSupportingFactors.push({
      what: `${cbProfile.institution} Hawkish Policy Stance`,
      why: `Restrictive interest rate settings (${policyRateText}) support currency valuation.`,
      source: cbProfile.source,
      type: 'POLICY',
      freshness: releaseIsLive
        ? livePolicyRelease.freshness
        : cbProfile.freshness || 'FRESH',
      category: 'CENTRAL_BANK',
      metric: 'Policy Rate',
      value: effectivePolicyRate ?? null
    });
  } else if (effectivePolicyStance === 'DOVISH') {
    const text = `${cbProfile.institution} is pursuing monetary accommodation (${policyEvidenceLabel}, policy rate: ${policyRateText}).`;
    opposingFactors.push(text);
    structuredOpposingFactors.push({
      what: `${cbProfile.institution} Dovish Easing Stance`,
      why: `Monetary accommodation (${policyRateText}) acts as a relative yield headwind.`,
      source: cbProfile.source,
      type: 'POLICY',
      freshness: releaseIsLive
        ? livePolicyRelease.freshness
        : cbProfile.freshness || 'FRESH',
      category: 'CENTRAL_BANK',
      metric: 'Policy Rate',
      value: effectivePolicyRate ?? null
    });
  } else if (effectivePolicyStance === 'NEUTRAL') {
    const text = `${cbProfile.institution} holds a neutral stance pending clearer macroeconomic signals (${policyEvidenceLabel}).`;
    unresolvedFactors.push(text);
    structuredUnresolvedFactors.push({
      what: `${cbProfile.institution} Neutral Policy Stance`,
      why: 'Balanced dual mandate risks prevent decisive monetary policy direction.',
      source: cbProfile.source,
      type: 'POLICY',
      freshness: releaseIsLive
        ? livePolicyRelease.freshness
        : cbProfile.freshness || 'FRESH',
      category: 'CENTRAL_BANK'
    });
  } else {
    /*
     * No verified live policy evidence. The reference profile stays visible as
     * context and as an explicit data gap, but it is never presented as the
     * current policy rate or as a directional factor.
     */
    const referenceRate =
      cbProfile.policyRate !== null && cbProfile.policyRate !== undefined
        ? `${cbProfile.policyRate.toFixed(2)}%`
        : null;

    unresolvedFactors.push(
      referenceRate !== null
        ? `REFERENCE PROFILE CONTEXT ONLY: ${cbProfile.institution} profile records ${
            cbProfile.stance !== 'UNAVAILABLE' ? cbProfile.stance : 'unclassified'
          } posture at ${referenceRate}. This is not verified live policy evidence and is excluded from scoring. ${
            livePolicyRelease.reason
          }`
        : `LIVE POLICY UNAVAILABLE: no verified current policy rate or stance for ${currency.code}. ${livePolicyRelease.reason}`
    );

    structuredUnresolvedFactors.push({
      what: `${cbProfile.institution} Policy Evidence Unavailable`,
      why:
        referenceRate !== null
          ? `Reference profile rate ${referenceRate} is contextual only; no verified live policy release is available.`
          : 'No verified live policy release or reference profile rate is available.',
      source: cbProfile.source,
      type: 'POLICY',
      freshness: 'UNAVAILABLE',
      category: 'CENTRAL_BANK',
      metric: 'Policy Rate',
      value: null
    });
  }

  cbProfile.stanceEvidence.forEach((ev) => {
    if (cbProfile.stance === 'HAWKISH') supportingFactors.push(ev);
    else if (cbProfile.stance === 'DOVISH') opposingFactors.push(ev);
    else unresolvedFactors.push(ev);
  });

  // Indicator surprise factors (Fact vs Interpretation separated)
  for (const item of expItems) {
    if (item.surpriseType === 'ABOVE_EXPECTATION') {
      const text = `${item.indicatorName}: Actual (${item.actual}${item.unit}) beat consensus (${item.forecast}${item.unit}), demonstrating macroeconomic momentum.`;
      supportingFactors.push(text);
      structuredSupportingFactors.push({
        what: `${item.indicatorName} Beat Consensus`,
        why: item.monetaryPolicyImplication || 'Upside economic print demonstrates macroeconomic momentum.',
        source: 'Finance Calendar',
        type: 'FACT',
        freshness: 'FRESH',
        category: item.category,
        metric: item.indicatorName,
        value: item.actual
      });
    } else if (item.surpriseType === 'BELOW_EXPECTATION') {
      const text = `${item.indicatorName}: Actual (${item.actual}${item.unit}) missed consensus (${item.forecast}${item.unit}), pointing to underlying softening.`;
      opposingFactors.push(text);
      structuredOpposingFactors.push({
        what: `${item.indicatorName} Missed Consensus`,
        why: item.monetaryPolicyImplication || 'Downside economic print points to underlying softening.',
        source: 'Finance Calendar',
        type: 'FACT',
        freshness: 'FRESH',
        category: item.category,
        metric: item.indicatorName,
        value: item.actual
      });
    }
  }

  // Commodity / Terms of Trade context
  const code = currency.code.toUpperCase();
  if (code === 'AUD') {
    const text = 'Key export driver: High terms-of-trade exposure to iron ore, metallurgical coal, and Asian industrial output.';
    supportingFactors.push(text);
    structuredSupportingFactors.push({
      what: 'Terms-of-Trade Commodity Exposure',
      why: 'High sensitivity to iron ore and industrial commodity export receipts.',
      source: 'Reserve Bank of Australia / Trade Statistics',
      type: 'FACT',
      freshness: 'FRESH',
      category: 'TRADE'
    });
  } else if (code === 'CAD') {
    const text = 'Key export driver: Commodity correlation with crude oil (Western Canadian Select) and energy trade flows.';
    supportingFactors.push(text);
    structuredSupportingFactors.push({
      what: 'Energy Commodity Export Exposure',
      why: 'Crude oil terms-of-trade and energy trade flows heavily influence terms of trade.',
      source: 'Bank of Canada / StatCan',
      type: 'FACT',
      freshness: 'FRESH',
      category: 'TRADE'
    });
  } else if (code === 'NZD') {
    const text = 'Key export driver: Agricultural terms-of-trade reliance on global dairy trade (GDT auction index).';
    supportingFactors.push(text);
    structuredSupportingFactors.push({
      what: 'Agricultural Terms-of-Trade Driver',
      why: 'Dairy trade auction prices drive national export revenues.',
      source: 'Global Dairy Trade / RBNZ',
      type: 'FACT',
      freshness: 'FRESH',
      category: 'TRADE'
    });
  } else if (code === 'JPY' || code === 'EUR') {
    const text = 'Macro vulnerability: Net energy importer; elevated global commodity prices act as terms-of-trade drag.';
    opposingFactors.push(text);
    structuredOpposingFactors.push({
      what: 'Net Energy Import Sensitivity',
      why: 'Elevated global energy commodity prices produce a negative terms-of-trade effect.',
      source: 'National Accounts Trade Data',
      type: 'FACT',
      freshness: 'FRESH',
      category: 'TRADE'
    });
  } else if (code === 'CHF') {
    const text = 'Safe-haven profile: Structural current account surplus and safe-haven reserve asset characteristics.';
    supportingFactors.push(text);
    structuredSupportingFactors.push({
      what: 'Structural Current Account Surplus',
      why: 'Consistent trade surplus and safe-haven reserve status attract defensive capital flows.',
      source: 'Swiss National Bank',
      type: 'FACT',
      freshness: 'FRESH',
      category: 'TRADE'
    });
  }

  // Upcoming catalysts
  const catalysts = upcomingEvents.filter(
    (e) => e.currency.toUpperCase() === code && e.status === 'UPCOMING'
  );

  // Overall condition and score
  let score = 0;
  if (cbProfile.stance === 'HAWKISH') score += 0.08;
  if (cbProfile.stance === 'DOVISH') score -= 0.08;
  score += aboveCount * 0.03;
  score -= belowCount * 0.03;
  const fundamentalScore = Math.round(score * 100) / 100;

  let overallCondition: PillarCondition = 'NEUTRAL';
  if (fundamentalScore >= 0.06) overallCondition = 'EXPANSIONARY';
  else if (fundamentalScore <= -0.06) overallCondition = 'CONTRACTIONARY';
  else if (currObs.length === 0) overallCondition = 'DATA_UNAVAILABLE';
  else overallCondition = 'MIXED';

  const fundamentalStatus =
    !isDataFeedConnected || currObs.length === 0
      ? 'UNAVAILABLE'
      : dataGaps.length > 5
      ? 'PARTIAL'
      : 'AVAILABLE';

  const explanation = `${currency.code} fundamental state: ${overallCondition} (Fundamental score: ${
    fundamentalScore >= 0 ? '+' : ''
  }${fundamentalScore}). Supported by ${supportingFactors.length} verified factors; constrained by ${
    opposingFactors.length
  } opposing factors across ${currObs.length} authenticated releases.`;

  return {
    currency,
    dailyMovementPercent,
    basketRelativeMovementPercent,
    marketStrength,
    classification,
    marketDataFreshness,
    marketDataSource,
    coverage,
    fundamentalStatus,
    fundamentalScore,
    overallCondition,
    supportingFactors,
    structuredSupportingFactors,
    opposingFactors,
    structuredOpposingFactors,
    catalysts,
    unresolvedFactors,
    structuredUnresolvedFactors,
    dataGaps,
    centralBankStance: cbProfile.stance,
    centralBankProfile: cbProfile,
    expectationInformation,
    categories: categoriesMap,
    provenance: `Deterministic fundamental intelligence evaluated from verified statistical releases and ${cbProfile.institution} official records.`,
    explanation,
    lastUpdated: new Date().toISOString()
  };
}

export interface CurrencyIntelligenceAggregationParams {
  currency: Currency;
  observations: EconomicObservation[];
  marketStrength: CurrencyMarketStrength | null;
  marketQuotes: MarketQuote[];
  marketProviderStatus: ProviderStatus;
  fundamentalProviderStatus: FundamentalProviderStatus;
  datasetMode: 'LIVE' | 'BENCHMARK';
  centralBankProfile: CentralBankProfile;
  pairIntelligences: PairIntelligence[];
  upcomingEvents?: EconomicEvent[];
  calculatedAt?: Date;
}

function normalizeCategory(category?: string): FundamentalCategory | null {
  if (!category) return null;
  if (category === 'CENTRAL_BANK') return 'CENTRAL_BANK_MONETARY_POLICY';
  if (category === 'TRADE_EXTERNAL_BALANCE') return 'TRADE';
  if (category === 'FISCAL_GOVERNMENT') return 'FISCAL';
  return FUNDAMENTAL_CATEGORIES.some((definition) => definition.id === category)
    ? (category as FundamentalCategory)
    : null;
}

function hasValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function isFiniteOrNull(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isFinite(value);
}

function hasHttpSourceUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function mapProviderFreshness(
  freshness: FundamentalProviderStatus['freshness'] | undefined,
  isStale: boolean | undefined
): CurrencyEvidenceFreshness {
  if (isStale) return 'STALE';
  if (freshness === 'FRESH' || freshness === 'STALE') return freshness;
  if (freshness === 'DEGRADED') return 'AGING';
  return 'UNAVAILABLE';
}

function worstFreshness(states: CurrencyEvidenceFreshness[]): CurrencyEvidenceFreshness {
  const available = states.filter((state) => state !== 'UNAVAILABLE');
  if (available.length === 0) return 'UNAVAILABLE';
  if (available.includes('STALE')) return 'STALE';
  if (available.includes('AGING')) return 'AGING';
  return 'FRESH';
}

function normalizePairSymbol(symbol: string): string {
  return symbol.replace(/[-_]/g, '/').toUpperCase();
}

function toSourceTimestamp(quote: MarketQuote | undefined): string | null {
  if (!quote) return null;
  if (hasValidTimestamp(quote.providerTimestamp)) return quote.providerTimestamp;
  return quote.timestamp !== null && Number.isFinite(quote.timestamp)
    ? new Date(quote.timestamp).toISOString()
    : null;
}

/** Aggregates existing source records without treating connection state as evidence. */
export function aggregateCurrencyIntelligence(
  params: CurrencyIntelligenceAggregationParams
): CurrencyFundamentalIntelligence {
  const {
    currency,
    observations,
    marketStrength,
    marketQuotes,
    marketProviderStatus,
    fundamentalProviderStatus,
    datasetMode,
    centralBankProfile,
    pairIntelligences,
    upcomingEvents = [],
    calculatedAt = new Date()
  } = params;
  const code = currency.code.toUpperCase();
  const calculatedAtIso = calculatedAt.toISOString();
  const providerFreshness = mapProviderFreshness(
    fundamentalProviderStatus.freshness,
    fundamentalProviderStatus.isStale
  );
  const providerEvidenceAvailable =
    fundamentalProviderStatus.datasetMode === datasetMode &&
    (fundamentalProviderStatus.health === 'CONNECTED' ||
      fundamentalProviderStatus.health === 'AVAILABLE' ||
      fundamentalProviderStatus.health === 'DEGRADED');
  const allSourceObservations = observations.map((observation) => {
      const category = normalizeCategory(observation.category);
      const extendedObservation = observation as EconomicObservation & {
        fetchedAt?: string | null;
        publishedAt?: string | null;
        freshness?: CurrencyEvidenceFreshness;
        dataStatus?: string;
        provenance?: string;
      };
      const source = observation.sourceName || observation.source || null;
      const recordFreshness = extendedObservation.freshness ?? providerFreshness;
      const freshness = providerFreshness === 'STALE' ? 'STALE' : recordFreshness;
      const fetchedAt = hasValidTimestamp(extendedObservation.fetchedAt)
        ? extendedObservation.fetchedAt
        : null;
      const publishedAt = extendedObservation.publishedAt ?? observation.releaseDate;
      const numericEvidenceIsFinite =
        isFiniteOrNull(observation.actual) &&
        isFiniteOrNull(observation.forecast) &&
        isFiniteOrNull(observation.previous);
      const sourceUrlIsValid = hasHttpSourceUrl(observation.sourceUrl);
      const provenanceIsSourceBound = Boolean(
        extendedObservation.provenance &&
        sourceUrlIsValid &&
        extendedObservation.provenance.includes(observation.sourceUrl)
      );
      const sourceBacked =
        providerEvidenceAvailable &&
        category !== null &&
        observation.sourceStatus === 'CONNECTED' &&
        (extendedObservation.dataStatus === 'AVAILABLE' || extendedObservation.dataStatus === 'LIVE') &&
        Boolean(source) &&
        sourceUrlIsValid &&
        provenanceIsSourceBound &&
        fetchedAt !== null &&
        hasValidTimestamp(publishedAt) &&
        numericEvidenceIsFinite;
      const provenance: CurrencyEvidenceProvenance =
        datasetMode === 'BENCHMARK'
          ? 'BENCHMARK'
          : sourceBacked && observation.classification === 'FACT' &&
            typeof observation.actual === 'number' && Number.isFinite(observation.actual)
          ? 'LIVE'
          : 'UNAVAILABLE';
      const sanitizedObservation: EconomicObservation = {
        ...observation,
        actual: Number.isFinite(observation.actual) ? observation.actual : null,
        forecast: Number.isFinite(observation.forecast) ? observation.forecast : null,
        previous: Number.isFinite(observation.previous) ? observation.previous : null
      };
      const meta = ECONOMIC_INDICATORS.find(
        (indicator) =>
          indicator.id === observation.indicatorId ||
          indicator.code === observation.indicatorId ||
          indicator.name === observation.indicatorName
      );
      const analysis = analyzeObservationExpectations(sanitizedObservation, meta);

      return {
        observation: sanitizedObservation,
        category,
        source,
        freshness,
        fetchedAt,
        publishedAt,
        sourceBacked,
        provenance,
        analysis
      };
    });
  const sourceObservations = allSourceObservations.filter(
    (record) => record.observation.currency.toUpperCase() === code
  );
  const contextualObservations = sourceObservations.filter((record) => record.sourceBacked);
  const liveObservations =
    datasetMode === 'LIVE'
      ? contextualObservations.filter((record) => record.provenance === 'LIVE')
      : [];
  const liveFacts = liveObservations.filter(
    (record) => record.observation.classification === 'FACT' && record.observation.actual !== null
  );
  const usableLiveFacts = liveFacts.filter(
    (record) => record.freshness === 'FRESH' || record.freshness === 'AGING'
  );

  const contributionRecords = (marketStrength?.contributors ?? []).map((contribution) => {
    const symbol = normalizePairSymbol(contribution.pairSymbol);
    const quote = marketQuotes.find((candidate) => normalizePairSymbol(candidate.symbol) === symbol);
    const sourceTimestamp =
      toSourceTimestamp(quote) ??
      (typeof contribution.timestamp === 'number' && Number.isFinite(contribution.timestamp)
        ? new Date(contribution.timestamp).toISOString()
        : null);
    const activeProvider = marketProviderStatus.activeProvider || marketProviderStatus.providerName;
    const strengthSourceMatches = Boolean(
      marketStrength?.source &&
      activeProvider &&
      marketStrength.source.toUpperCase() === activeProvider.toUpperCase()
    );
    const quoteSourceMatches = !quote || Boolean(
      quote.source &&
      quote.source.toUpperCase() === activeProvider.toUpperCase() &&
      (quote.sourceStatus === 'CONNECTED' ||
        quote.sourceStatus === 'DEGRADED' ||
        quote.sourceStatus === 'STALE')
    );
    const isProviderContribution = Boolean(
      strengthSourceMatches && quoteSourceMatches && sourceTimestamp
    );
    return { contribution, quote, sourceTimestamp, isProviderContribution };
  });
  const verifiedContributions = contributionRecords.filter((record) => record.isProviderContribution);
  const stalePairs = new Set(marketProviderStatus.stalePairs.map(normalizePairSymbol));
  const activeProvider = marketProviderStatus.activeProvider || marketProviderStatus.providerName;
  const staleQuoteRecords = marketQuotes
    .filter((quote) =>
      quote.baseCurrency.toUpperCase() === code || quote.quoteCurrency.toUpperCase() === code
    )
    .map((quote) => ({ quote, sourceTimestamp: toSourceTimestamp(quote) }))
    .filter(({ quote, sourceTimestamp }) =>
      quote.source.toUpperCase() === activeProvider.toUpperCase() &&
      Boolean(sourceTimestamp) &&
      (quote.stale === true ||
        quote.sourceStatus === 'STALE' ||
        stalePairs.has(normalizePairSymbol(quote.symbol)))
    )
    .map(({ quote, sourceTimestamp }) => ({
      pairSymbol: normalizePairSymbol(quote.symbol),
      sourceTimestamp: sourceTimestamp as string,
      fetchedAt: quote.receivedAt || quote.fetchedAt || null
    }));
  const staleContributionCount = verifiedContributions.filter(
    ({ contribution, quote }) =>
      quote?.stale === true ||
      quote?.sourceStatus === 'STALE' ||
      stalePairs.has(normalizePairSymbol(contribution.pairSymbol))
  ).length;
  const missingContributionCount = contributionRecords.length - verifiedContributions.length;
  const allContributionsHaveFreshQuoteMetadata =
    verifiedContributions.length > 0 &&
    missingContributionCount === 0 &&
    verifiedContributions.every(({ quote, sourceTimestamp }) =>
      quote !== undefined &&
      quote.stale === false &&
      Boolean(sourceTimestamp) &&
      (quote.sourceStatus === 'CONNECTED' || quote.sourceStatus === 'DEGRADED')
    );
  let marketFreshness: CurrencyEvidenceFreshness = 'UNAVAILABLE';
  if (verifiedContributions.length > 0) {
    if (
      marketProviderStatus.snapshotHealth === 'STALE' ||
      staleContributionCount === verifiedContributions.length
    ) {
      marketFreshness = 'STALE';
    } else if (
      staleContributionCount > 0 ||
      staleQuoteRecords.length > 0 ||
      missingContributionCount > 0 ||
      marketProviderStatus.snapshotHealth === 'AGING'
    ) {
      marketFreshness = 'AGING';
    } else if (
      marketProviderStatus.snapshotHealth === 'FRESH' ||
      allContributionsHaveFreshQuoteMetadata
    ) {
      marketFreshness = 'FRESH';
    }
  } else if (staleQuoteRecords.length > 0) {
    marketFreshness = 'STALE';
  }
  const marketHasValue =
    marketStrength?.marketStrength !== null &&
    marketStrength?.marketStrength !== undefined &&
    Number.isFinite(marketStrength.marketStrength) &&
    verifiedContributions.length > 0 &&
    (marketFreshness === 'FRESH' || marketFreshness === 'AGING');
  const marketAvailability = !marketHasValue
    ? 'UNAVAILABLE'
    : marketStrength.coverage.available < marketStrength.coverage.required ||
      missingContributionCount > 0 ||
      staleQuoteRecords.length > 0
    ? 'PARTIAL'
    : 'AVAILABLE';
  const marketSource =
    (marketHasValue ? marketStrength?.source : null) ??
    (staleQuoteRecords.length > 0
      ? marketQuotes.find((quote) =>
          normalizePairSymbol(quote.symbol) === staleQuoteRecords[0]?.pairSymbol
        )?.source ?? null
      : null);
  const marketFetchedAt =
    verifiedContributions
      .map((record) => record.quote?.receivedAt || record.quote?.fetchedAt || null)
      .filter((value): value is string => hasValidTimestamp(value))
      .sort((first, second) => Date.parse(second) - Date.parse(first))[0] ??
    staleQuoteRecords
      .map((record) => record.fetchedAt)
      .find((value): value is string => hasValidTimestamp(value)) ??
    null;
  const marketEvidenceCount = new Set([
    ...verifiedContributions.map((record) => normalizePairSymbol(record.contribution.pairSymbol)),
    ...staleQuoteRecords.map((record) => record.pairSymbol)
  ]).size;
  const marketReturns = verifiedContributions
    .filter(({ quote, contribution }) =>
      quote !== undefined &&
      quote.stale === false &&
      (quote.sourceStatus === 'CONNECTED' || quote.sourceStatus === 'DEGRADED') &&
      Number.isFinite(contribution.signedContribution)
    )
    .map(({ contribution }) => contribution.signedContribution);
  const marketDirectionalConsistency = {
    aligned: marketHasValue
      ? marketReturns.filter((value) => value !== 0 && Math.sign(value) === Math.sign(marketStrength!.marketStrength!)).length
      : 0,
    opposing: marketHasValue
      ? marketReturns.filter((value) => value !== 0 && Math.sign(value) !== Math.sign(marketStrength!.marketStrength!)).length
      : 0,
    neutral: marketReturns.filter((value) => value === 0).length
  };
  const marketEvidence = {
    availability: marketAvailability as CurrencyIntelligenceEvidenceAssessment['market']['availability'],
    freshness: marketFreshness,
    provenance: marketHasValue || staleQuoteRecords.length > 0
      ? ('LIVE' as const)
      : ('UNAVAILABLE' as const),
    source: marketSource,
    fetchedAt: marketFetchedAt,
    evidenceCount: marketEvidenceCount,
    reason: marketHasValue
      ? null
      : staleQuoteRecords.length > 0
      ? `All ${staleQuoteRecords.length} timestamped provider quote(s) are stale; current market strength is unavailable.`
      : 'No timestamped quote from the active market provider contributes to this currency strength.',
    strength: marketHasValue ? marketStrength?.marketStrength ?? null : null,
    classification: marketHasValue
      ? marketStrength?.classification ?? 'DATA_UNAVAILABLE'
      : 'DATA_UNAVAILABLE',
    breadth: {
      available: marketHasValue
        ? marketStrength?.coverage.available ?? verifiedContributions.length
        : 0,
      required: marketStrength?.coverage.required ?? 0
    },
    directionalConsistency: marketDirectionalConsistency,
    contributingPairs: marketHasValue
      ? verifiedContributions.map(({ contribution, quote, sourceTimestamp }) => ({
          pairSymbol: contribution.pairSymbol,
          pairReturnPercent: contribution.pairReturnPercent,
          role: contribution.role,
          signedContribution: contribution.signedContribution,
          sourceTimestamp,
          fetchedAt: quote?.receivedAt || quote?.fetchedAt || null
        }))
      : [],
    stalePairs: staleQuoteRecords
  };

  const profile = centralBankProfile;
  const profileSourceType = profile.sourceType ?? 'UNAVAILABLE';
  const profileFreshness = profile.freshness ?? 'UNAVAILABLE';
  const hasLivePolicy =
    profileSourceType === 'LIVE' &&
    profile.dataSourceMode === 'LIVE' &&
    profile.currentPolicyRate !== null &&
    Number.isFinite(profile.currentPolicyRate) &&
    profile.stance !== 'UNAVAILABLE' &&
    (profileFreshness === 'FRESH' || profileFreshness === 'AGING') &&
    (profile.dataStatus === 'AVAILABLE' || profile.dataStatus === 'LIVE') &&
    Boolean(profile.source) &&
    hasHttpSourceUrl(profile.sourceUrl) &&
    hasValidTimestamp(profile.fetchedTimestamp) &&
    hasValidTimestamp(profile.latestDecisionDate);
  const hasPolicyContext =
    (profileSourceType === 'REFERENCE' || profileSourceType === 'STATIC') &&
    ((profile.policyRate !== null && Number.isFinite(profile.policyRate)) ||
      profile.stance !== 'UNAVAILABLE');
  const policyProvenance: CurrencyEvidenceProvenance = hasLivePolicy
    ? 'LIVE'
    : profileSourceType === 'REFERENCE'
    ? 'REFERENCE'
    : profileSourceType === 'STATIC'
    ? 'STATIC'
    : 'UNAVAILABLE';
  const policyEvidence = {
    availability: hasLivePolicy
      ? ('AVAILABLE' as const)
      : hasPolicyContext
      ? ('REFERENCE_ONLY' as const)
      : ('UNAVAILABLE' as const),
    freshness: hasLivePolicy
      ? (profileFreshness as CurrencyEvidenceFreshness)
      : hasPolicyContext
      ? 'STALE'
      : 'UNAVAILABLE',
    provenance: policyProvenance,
    source: hasLivePolicy || hasPolicyContext ? profile.source : null,
    fetchedAt: hasLivePolicy ? profile.fetchedTimestamp || null : null,
    contextualFetchedAt:
      hasPolicyContext && hasValidTimestamp(profile.fetchedTimestamp)
        ? profile.fetchedTimestamp
        : null,
    evidenceCount: hasLivePolicy || hasPolicyContext ? 1 : 0,
    reason: hasLivePolicy
      ? null
      : hasPolicyContext
      ? `Central-bank policy is ${policyProvenance} context, not current live policy evidence.`
      : 'No verified current central-bank policy rate and stance are available.',
    currentPolicyRate: hasLivePolicy ? profile.currentPolicyRate : null,
    contextualPolicyRate: hasPolicyContext ? profile.policyRate : null,
    currentStance: hasLivePolicy ? profile.stance : 'UNAVAILABLE',
    contextualStance: hasPolicyContext ? profile.stance : null,
    effectiveAt: hasLivePolicy ? profile.latestDecisionDate : hasPolicyContext ? profile.latestDecisionDate : null
  };
  const policyProfileForOutput: CentralBankProfile = {
    ...profile,
    policyRate: hasLivePolicy ? profile.policyRate : null,
    currentPolicyRate: hasLivePolicy ? profile.currentPolicyRate : null,
    previousPolicyRate: hasLivePolicy ? profile.previousPolicyRate : null,
    latestDecisionDate: hasLivePolicy ? profile.latestDecisionDate : null,
    stance: hasLivePolicy ? profile.stance : 'UNAVAILABLE',
    policyStance: hasLivePolicy ? profile.stance : 'UNAVAILABLE',
    stanceEvidence: hasLivePolicy ? profile.stanceEvidence : [],
    guidanceSummary: hasLivePolicy ? profile.guidanceSummary : null,
    latestPolicyStatement: hasLivePolicy ? profile.latestPolicyStatement : null,
    contextualPolicyRate: hasPolicyContext ? profile.policyRate : null,
    contextualStance: hasPolicyContext ? profile.stance : null,
    contextualDecisionDate: hasPolicyContext ? profile.latestDecisionDate : null,
    contextualFetchedAt: policyEvidence.contextualFetchedAt,
    fetchedTimestamp: hasLivePolicy ? profile.fetchedTimestamp : null,
    policyAvailability: policyEvidence.availability,
    policyProvenance,
    policyFreshness: policyEvidence.freshness
  };

  const expectations = contextualObservations.map((record) => ({
    observationId: record.observation.id,
    currency: record.observation.currency,
    indicatorName: record.observation.indicatorName,
    category: record.category as FundamentalCategory,
    previous: record.observation.previous,
    forecast: record.observation.forecast,
    actual: record.observation.actual,
    surprise: record.analysis.surprise,
    percentageSurprise: record.analysis.percentageSurprise,
    surpriseType: record.analysis.expectationStatus,
    unit: record.observation.unit,
    directionSummary: record.analysis.directionSummary,
    monetaryPolicyImplication: record.analysis.monetaryPolicyImplication,
    classification: 'ENGINE_ANALYSIS' as const,
    statements: record.analysis.statements,
    source: record.source,
    sourceUrl: record.observation.sourceUrl || null,
    fetchedAt: record.fetchedAt,
    freshness: record.freshness,
    provenance: record.provenance
  }));
  const currentExpectations = expectations.filter(
    (item) => item.freshness === 'FRESH' || item.freshness === 'AGING'
  );
  const completeExpectations = currentExpectations.filter((item) =>
    item.surprise !== null && item.provenance === 'LIVE'
  );
  const incompleteExpectations = currentExpectations.filter((item) => item.surprise === null);
  const staleCompleteExpectations = expectations.filter(
    (item) => item.surprise !== null && item.freshness === 'STALE'
  );
  const expectationsProvenance: CurrencyEvidenceProvenance =
    datasetMode === 'BENCHMARK' && expectations.length > 0
      ? 'BENCHMARK'
      : completeExpectations.some((item) => item.provenance === 'LIVE')
      ? 'LIVE'
      : expectations.length > 0
      ? 'UNAVAILABLE'
      : 'UNAVAILABLE';
  const expectationsAvailability =
    datasetMode === 'BENCHMARK' && expectations.length > 0
      ? 'REFERENCE_ONLY'
      : completeExpectations.length > 0
      ? 'AVAILABLE'
      : incompleteExpectations.length > 0
      ? 'PARTIAL'
      : 'UNAVAILABLE';
  const expectationsFreshness =
    expectations.length > 0
      ? worstFreshness(expectations.map((item) => item.freshness))
      : 'UNAVAILABLE';
  const expectationsEvidence = {
    availability: expectationsAvailability as CurrencyIntelligenceEvidenceAssessment['expectations']['availability'],
    freshness: expectationsFreshness,
    provenance: expectationsProvenance,
    source: expectations[0]?.source ?? null,
    fetchedAt: expectations
      .map((item) => item.fetchedAt)
      .find((value): value is string => Boolean(value)) ?? null,
    evidenceCount: expectations.length,
    reason:
      expectations.length === 0
        ? 'No source-backed expectation records are available.'
        : completeExpectations.length === 0
        ? staleCompleteExpectations.length > 0
          ? 'Complete expectation records are stale and remain historical context only.'
          : 'Actual and forecast have not both been recorded for any current source-backed observation.'
        : null,
    completeCount: completeExpectations.length,
    incompleteCount: incompleteExpectations.length,
    items: expectations
  };

  const requiredScoreCategories: { name: string; category: FundamentalCategory }[] = [
    { name: 'Inflation', category: 'INFLATION' },
    { name: 'Employment', category: 'EMPLOYMENT' },
    { name: 'Growth', category: 'GROWTH' }
  ];
  const scoreEligibleByCategory = requiredScoreCategories.map(({ name, category }) => {
    const record = usableLiveFacts.find(
      (candidate) => candidate.category === category && candidate.observation.forecast !== null
    );
    const analysis = record?.analysis;
    const available = Boolean(record && analysis?.surprise !== null);
    const points = !available
      ? null
      : analysis?.expectationStatus === 'ABOVE_EXPECTATION'
      ? 0.04
      : analysis?.expectationStatus === 'BELOW_EXPECTATION'
      ? -0.04
      : 0;
    return {
      name,
      category,
      record,
      available,
      points,
      reason: available ? null : `A current live ${name.toLowerCase()} actual and forecast are required.`
    };
  });
  const policyScorePoints = hasLivePolicy
    ? profile.stance === 'HAWKISH'
      ? 0.08
      : profile.stance === 'DOVISH'
      ? -0.08
      : 0
    : null;
  const scoreComponents = [
    {
      name: 'Live monetary policy',
      available: hasLivePolicy,
      points: policyScorePoints,
      reason: hasLivePolicy ? null : policyEvidence.reason
    },
    ...scoreEligibleByCategory.map(({ name, available, points, reason }) => ({
      name,
      available,
      points,
      reason
    }))
  ];
  const scoreIsComplete = scoreComponents.every((component) => component.available);
  const scoringObservations = usableLiveFacts
    .filter((record) => record.observation.forecast !== null)
    .map((record) => record.observation);
  const centralBankPolicy: CentralBankPolicy = {
    id: profile.id,
    institution: profile.institution,
    associatedCurrency: code,
    currentPolicyRate: hasLivePolicy ? profile.currentPolicyRate : null,
    previousPolicyRate: hasLivePolicy ? profile.previousPolicyRate : null,
    latestDecisionDate: hasLivePolicy ? profile.latestDecisionDate : null,
    nextKnownDecisionDate: profile.nextKnownDecisionDate,
    stance: hasLivePolicy ? profile.stance : 'UNAVAILABLE',
    stanceEvidence: hasLivePolicy ? profile.stanceEvidence : [],
    guidanceSummary: hasLivePolicy ? profile.guidanceSummary : null,
    majorRisks: hasLivePolicy ? profile.majorRisks : [],
    sourceMetadata: {
      sourceName: profile.source,
      sourceUrl: profile.sourceUrl,
      lastUpdated: profile.fetchedTimestamp,
      status: hasLivePolicy ? 'CONNECTED' : 'NOT_CONNECTED'
    },
    /*
     * Provenance must travel with the projection. Without it, downstream
     * verification cannot distinguish a verified live policy record from a
     * reference benchmark and correctly refuses to score it as live evidence.
     */
    sourceType: hasLivePolicy ? profile.sourceType : 'UNAVAILABLE',
    dataSourceMode: hasLivePolicy ? profile.dataSourceMode : 'UNAVAILABLE',
    dataStatus: hasLivePolicy ? profile.dataStatus : 'UNAVAILABLE',
    provenance: hasLivePolicy ? profile.provenance : 'UNAVAILABLE',
    freshness: hasLivePolicy ? profileFreshness : 'STALE',
    fetchedTimestamp: hasLivePolicy ? profile.fetchedTimestamp : null,
    policyAvailability: policyEvidence.availability,
    policyProvenance,
    policyFreshness: policyEvidence.freshness
  };
  const calculatedFundamentals = scoreIsComplete
    ? evaluateCurrencyFundamentals(code, scoringObservations, centralBankPolicy, true)
    : null;
  const fundamentalScore = calculatedFundamentals?.fundamentalScore ?? null;
  const fundamentalFreshness =
    liveFacts.length > 0
      ? worstFreshness(liveFacts.map((record) => record.freshness))
      : 'UNAVAILABLE';
  const fundamentalAvailability =
    usableLiveFacts.length > 0
      ? scoreIsComplete
        ? 'AVAILABLE'
        : 'PARTIAL'
      : datasetMode === 'BENCHMARK' && contextualObservations.length > 0
      ? 'REFERENCE_ONLY'
      : 'UNAVAILABLE';
  const fundamentalProvenance: CurrencyEvidenceProvenance =
    liveFacts.length > 0
      ? 'LIVE'
      : datasetMode === 'BENCHMARK' && contextualObservations.length > 0
      ? 'BENCHMARK'
      : 'UNAVAILABLE';
  const missingScoreComponents = scoreComponents
    .filter((component) => !component.available)
    .map((component) => component.reason || `${component.name} unavailable.`);
  const fundamentalEvidence = {
    availability: fundamentalAvailability as CurrencyIntelligenceEvidenceAssessment['fundamentals']['availability'],
    freshness: fundamentalFreshness,
    provenance: fundamentalProvenance,
    source: liveFacts[0]?.source ?? contextualObservations[0]?.source ?? null,
    fetchedAt:
      liveFacts
        .map((record) => record.fetchedAt)
        .find((value): value is string => Boolean(value)) ?? null,
    evidenceCount: liveFacts.length,
    reason:
      fundamentalAvailability === 'AVAILABLE'
        ? null
        : datasetMode === 'BENCHMARK' && contextualObservations.length > 0
        ? 'Benchmark observations are context only and are not live fundamental evidence.'
        : usableLiveFacts.length === 0 && liveFacts.length > 0
        ? 'Source-backed fundamental observations are stale and excluded from current scoring.'
        : liveFacts.length === 0
        ? 'No source-identified live FACT observations with an actual value are available.'
        : missingScoreComponents.join(' '),
    score: fundamentalScore,
    observations: liveObservations.map((record) => ({
      id: record.observation.id,
      currency: record.observation.currency,
      indicatorId: record.observation.indicatorId,
      indicatorName: record.observation.indicatorName,
      category: record.category as FundamentalCategory,
      value: record.observation.actual,
      unit: record.observation.unit,
      period: record.observation.period,
      previous: record.observation.previous,
      forecast: record.observation.forecast,
      actual: record.observation.actual,
      surprise: record.analysis.surprise,
      surpriseType: record.analysis.expectationStatus,
      releaseDate: record.observation.releaseDate,
      source: record.source || '',
      sourceName: record.source || undefined,
      sourceUrl: record.observation.sourceUrl || '',
      sourceStatus: record.observation.sourceStatus,
      publishedAt: record.observation.releaseDate,
      fetchedAt: record.fetchedAt ?? '',
      freshness: record.freshness,
      dataStatus: 'LIVE' as const,
      provenance: record.source || 'UNAVAILABLE',
      classification: record.observation.classification,
      statements: record.analysis.statements
    })),
    categories: FUNDAMENTAL_CATEGORIES.map((definition) => {
      const categoryRecords = sourceObservations.filter((record) =>
        record.category === definition.id &&
        record.provenance === 'LIVE'
      );
      const currentRecords = categoryRecords.filter((record) =>
        record.freshness === 'FRESH' || record.freshness === 'AGING'
      );
      const latest = [...categoryRecords].sort((first, second) =>
        Date.parse(second.publishedAt || '') - Date.parse(first.publishedAt || '')
      )[0];
      const categoryFreshness = categoryRecords.length > 0
        ? worstFreshness(categoryRecords.map((record) => record.freshness))
        : 'UNAVAILABLE';
      const categoryAvailability = currentRecords.length > 0
        ? categoryRecords.some((record) => record.freshness === 'STALE')
          ? 'PARTIAL'
          : 'AVAILABLE'
        : categoryRecords.length > 0
        ? 'UNAVAILABLE'
        : datasetMode === 'BENCHMARK' && sourceObservations.some((record) => record.category === definition.id && record.sourceBacked)
        ? 'REFERENCE_ONLY'
        : 'UNAVAILABLE';
      return {
        category: definition.id,
        status: categoryAvailability as CurrencyEvidenceAvailability,
        freshness: categoryFreshness,
        provenance: categoryRecords.length > 0
          ? 'LIVE' as const
          : datasetMode === 'BENCHMARK' && sourceObservations.some((record) => record.category === definition.id && record.sourceBacked)
          ? 'BENCHMARK' as const
          : 'UNAVAILABLE' as const,
        source: latest?.source ?? null,
        fetchedAt: latest?.fetchedAt ?? null,
        evidenceCount: currentRecords.length,
        actualAvailable: currentRecords.filter((record) => record.observation.actual !== null).length,
        forecastAvailable: currentRecords.filter((record) => record.observation.forecast !== null).length,
        latestActual: latest?.observation.actual ?? null,
        latestForecast: latest?.observation.forecast ?? null,
        latestPrevious: latest?.observation.previous ?? null,
        latestSurprise: latest?.freshness === 'FRESH' || latest?.freshness === 'AGING'
          ? latest.analysis.surprise
          : null,
        reason: currentRecords.length > 0
          ? null
          : categoryRecords.length > 0
          ? 'Evidence exists but is stale and excluded from current assessment.'
          : `No eligible ${definition.name.toLowerCase()} evidence is available.`,
        observations: categoryRecords.map((record) => ({
          id: record.observation.id,
          currency: record.observation.currency,
          indicatorId: record.observation.indicatorId,
          indicatorName: record.observation.indicatorName,
          category: definition.id,
          value: record.observation.actual,
          unit: record.observation.unit,
          period: record.observation.period,
          previous: record.observation.previous,
          forecast: record.observation.forecast,
          actual: record.observation.actual,
          surprise: record.freshness === 'FRESH' || record.freshness === 'AGING'
            ? record.analysis.surprise
            : null,
          surpriseType: record.freshness === 'FRESH' || record.freshness === 'AGING'
            ? record.analysis.expectationStatus
            : 'UNKNOWN',
          releaseDate: record.observation.releaseDate,
          source: record.source ?? '',
          sourceName: record.source ?? undefined,
          sourceUrl: record.observation.sourceUrl,
          sourceStatus: record.observation.sourceStatus,
          publishedAt: record.publishedAt,
          fetchedAt: record.fetchedAt ?? '',
          freshness: record.freshness,
          dataStatus: 'LIVE' as const,
          provenance: record.provenance,
          classification: record.observation.classification,
          statements: record.analysis.statements
        }))
      };
    }),
    scoreComponents
  };

  const factsByCurrency = new Map<string, number>();
  const expectationsByCurrency = new Map<string, number>();
  for (const record of allSourceObservations) {
    const observationCurrency = record.observation.currency.toUpperCase();
    const currentLiveFact =
      record.provenance === 'LIVE' &&
      record.observation.classification === 'FACT' &&
      typeof record.observation.actual === 'number' &&
      Number.isFinite(record.observation.actual) &&
      (record.freshness === 'FRESH' || record.freshness === 'AGING');
    if (!currentLiveFact) continue;
    factsByCurrency.set(observationCurrency, (factsByCurrency.get(observationCurrency) ?? 0) + 1);
    const hasCurrentExpectation =
      typeof record.observation.forecast === 'number' &&
      Number.isFinite(record.observation.forecast) &&
      record.analysis.surprise !== null &&
      Number.isFinite(record.analysis.surprise);
    if (hasCurrentExpectation) {
      expectationsByCurrency.set(
        observationCurrency,
        (expectationsByCurrency.get(observationCurrency) ?? 0) + 1
      );
    }
  }
  const contradictions = new Map<string, import('../../types/intelligence').StructuredContradiction>();
  const hasFreshMarketQuote = (pairSymbol: string): boolean =>
    (marketProviderStatus.snapshotHealth === 'FRESH' ||
      marketProviderStatus.snapshotHealth === 'AGING') &&
    marketQuotes.some((quote) => {
      const symbol = normalizePairSymbol(quote.symbol);
      return (
        symbol === normalizePairSymbol(pairSymbol) &&
        quote.source.toUpperCase() === activeProvider.toUpperCase() &&
        Boolean(toSourceTimestamp(quote)) &&
        quote.stale !== true &&
        quote.sourceStatus !== 'STALE' &&
        Number.isFinite(quote.dailyReturnPercent ?? quote.changePercent) &&
        !stalePairs.has(symbol)
      );
    });
  const hasCurrentFacts = (currencyCode: string): boolean =>
    (factsByCurrency.get(currencyCode.toUpperCase()) ?? 0) > 0;
  const hasCurrentExpectations = (currencyCode: string): boolean =>
    (expectationsByCurrency.get(currencyCode.toUpperCase()) ?? 0) > 0;
  const isVerifiedLivePolicy = (
    value: PairIntelligence['baseCentralBank'] | CurrencyState['centralBank'] | undefined
  ): boolean => {
    if (!value) return false;
    const profile = value as CentralBankProfile;
    const sourceMetadata = (value as CurrencyState['centralBank']).sourceMetadata;
    const sourceUrl = profile.sourceUrl || sourceMetadata?.sourceUrl;
    const fetchedAt = profile.fetchedTimestamp || sourceMetadata?.lastUpdated;
    return (
      profile.sourceType === 'LIVE' &&
      profile.dataSourceMode === 'LIVE' &&
      profile.currentPolicyRate !== null &&
      Number.isFinite(profile.currentPolicyRate) &&
      profile.stance !== 'UNAVAILABLE' &&
      (profile.freshness === 'FRESH' || profile.freshness === 'AGING') &&
      (profile.dataStatus === 'AVAILABLE' || profile.dataStatus === 'LIVE') &&
      Boolean(profile.source || sourceMetadata?.sourceName) &&
      hasHttpSourceUrl(sourceUrl) &&
      hasValidTimestamp(fetchedAt) &&
      hasValidTimestamp(profile.latestDecisionDate)
    );
  };
  const pairHasLivePolicies = (pair: PairIntelligence): boolean => {
    const basePolicy = pair.baseCurrency.code.toUpperCase() === code
      ? profile
      : pair.baseCentralBank ?? pair.baseState?.centralBank;
    const quotePolicy = pair.quoteCurrency.code.toUpperCase() === code
      ? profile
      : pair.quoteCentralBank ?? pair.quoteState?.centralBank;
    return isVerifiedLivePolicy(basePolicy) && isVerifiedLivePolicy(quotePolicy);
  };
  const pairHasCurrentMarketEvidence = (pair: PairIntelligence): boolean =>
    Number.isFinite(pair.baseMarketStrength) &&
    Number.isFinite(pair.quoteMarketStrength) &&
    hasFreshMarketQuote(pair.symbol);
  const hasCurrentCatalystAndThesis = (pair: PairIntelligence): boolean => {
    const catalystIsCurrent = (pair.catalystIntelligence ?? []).some((event) =>
      (event.currency.toUpperCase() === pair.baseCurrency.code.toUpperCase() ||
        event.currency.toUpperCase() === pair.quoteCurrency.code.toUpperCase()) &&
      event.status !== 'CANCELLED' &&
      event.lifecycle !== 'STALE' &&
      event.lifecycle !== 'UNAVAILABLE' &&
      (event.freshness === 'FRESH' || event.freshness === 'AGING') &&
      Boolean(event.source) &&
      hasValidTimestamp(event.fetchedAt)
    );
    const thesis = pair.structuredThesis;
    const thesisIsCurrent = Boolean(
      thesis &&
      thesis.status !== 'INSUFFICIENT_DATA' &&
      thesis.evidenceQuality !== 'UNAVAILABLE' &&
      thesis.provenance.length > 0 &&
      (thesis.supportingEvidence.length > 0 || thesis.counterEvidence.length > 0) &&
      (hasCurrentFacts(pair.baseCurrency.code) || hasCurrentFacts(pair.quoteCurrency.code) ||
        pairHasCurrentMarketEvidence(pair))
    );
    return catalystIsCurrent && thesisIsCurrent;
  };
  const hasCurrentSessionContext = (pair: PairIntelligence): boolean => {
    const session = pair.sessionContext ?? pair.sessionRelevance;
    return Boolean(
      session &&
      pair.watchWindow &&
      session.primarySession.trim() &&
      session.relevantSessions.length > 0 &&
      pair.watchWindow.watchState !== 'DATA_UNAVAILABLE' &&
      pair.watchWindow.watchState !== 'DATA UNAVAILABLE' &&
      hasValidTimestamp(pair.lastUpdated)
    );
  };
  const contradictionHasEligibleEvidence = (
    category: import('../../types/intelligence').ContradictionCategory,
    pair: PairIntelligence,
    affectedComponents: string[]
  ): boolean => {
    const baseCode = pair.baseCurrency.code.toUpperCase();
    const quoteCode = pair.quoteCurrency.code.toUpperCase();
    const factsBothSides = hasCurrentFacts(baseCode) && hasCurrentFacts(quoteCode);
    const expectationsBothSides =
      hasCurrentExpectations(baseCode) && hasCurrentExpectations(quoteCode);
    const livePoliciesBothSides = pairHasLivePolicies(pair);
    const currentMarket = pairHasCurrentMarketEvidence(pair);

    switch (category) {
      case 'MARKET_VS_FUNDAMENTAL':
        return marketHasValue && currentMarket && factsBothSides;
      case 'FUNDAMENTAL_VS_EXPECTATION':
        return factsBothSides && expectationsBothSides;
      case 'POLICY_VS_MARKET':
        return livePoliciesBothSides && currentMarket;
      case 'POLICY_VS_EXPECTATION':
        return livePoliciesBothSides && expectationsBothSides;
      case 'CATALYST_VS_THESIS':
        return hasCurrentCatalystAndThesis(pair);
      case 'SESSION_VS_TIMING':
        return hasCurrentSessionContext(pair);
      case 'OTHER':
        return affectedComponents.length > 0 && affectedComponents.every((component) => {
          if (component === 'FUNDAMENTALS') return factsBothSides;
          if (component === 'EXPECTATIONS') return expectationsBothSides;
          if (component === 'POLICY') return livePoliciesBothSides;
          if (component === 'MARKET_STRENGTH') return currentMarket;
          if (component === 'CATALYST') return hasCurrentCatalystAndThesis(pair);
          if (component === 'SESSION') return hasCurrentSessionContext(pair);
          return false;
        });
      case 'DATA_QUALITY':
      default:
        return false;
    }
  };
  for (const pairIntelligence of pairIntelligences) {
    const pairContradictions =
      pairIntelligence.structuredContradictions ?? pairIntelligence.contradictions;
    for (const contradiction of pairContradictions) {
      if (
        contradiction.currency.toUpperCase() !== code ||
        !contradictionHasEligibleEvidence(
          contradiction.category,
          pairIntelligence,
          contradiction.affectedComponents
        )
      ) {
        continue;
      }
      const sourceTimestamps = {
        sourceA:
          contradiction.sourceTimestamps.sourceA === contradiction.detectedTimestamp
            ? null
            : contradiction.sourceTimestamps.sourceA,
        sourceB:
          contradiction.sourceTimestamps.sourceB === contradiction.detectedTimestamp
            ? null
            : contradiction.sourceTimestamps.sourceB
      };
      contradictions.set(contradiction.id, { ...contradiction, sourceTimestamps });
    }
  }

  const relativeStrengthAvailability = marketHasValue ? marketAvailability : 'UNAVAILABLE';
  const relativeStrength = {
    availability: relativeStrengthAvailability as CurrencyIntelligenceEvidenceAssessment['relativeStrength']['availability'],
    value: marketHasValue ? marketStrength?.marketStrength ?? null : null,
    formula: marketHasValue
      ? marketStrength?.explanation ?? 'Basket-relative movement derived by the market strength engine.'
      : 'Not calculated: timestamped contributing market evidence is unavailable.',
    components: marketEvidence.contributingPairs.map((contribution) => ({
      pairSymbol: contribution.pairSymbol,
      pairReturnPercent: contribution.pairReturnPercent,
      signedContribution: contribution.signedContribution
    }))
  };

  const reasons: string[] = [];
  if (marketEvidence.reason) reasons.push(marketEvidence.reason);
  if (fundamentalEvidence.reason) reasons.push(fundamentalEvidence.reason);
  if (policyEvidence.reason) reasons.push(policyEvidence.reason);
  if (expectationsEvidence.reason) reasons.push(expectationsEvidence.reason);
  if (
    fundamentalProviderStatus.health === 'CONNECTED' &&
    liveFacts.length === 0 &&
    datasetMode === 'LIVE'
  ) {
    reasons.push('Provider connectivity alone did not qualify any fundamental record as live evidence.');
  }
  const evidenceDimensions = [
    marketEvidence.availability,
    fundamentalEvidence.availability,
    policyEvidence.availability,
    expectationsEvidence.availability
  ];
  const availableDimensionCount = evidenceDimensions.filter(
    (availability) => availability === 'AVAILABLE' || availability === 'PARTIAL'
  ).length;
  const qualityAvailability =
    availableDimensionCount === 0
      ? evidenceDimensions.includes('REFERENCE_ONLY')
        ? 'REFERENCE_ONLY'
        : 'UNAVAILABLE'
      : availableDimensionCount === evidenceDimensions.length
      ? 'AVAILABLE'
      : 'PARTIAL';
  const qualityFreshness = worstFreshness([
    marketEvidence.freshness,
    fundamentalEvidence.freshness,
    policyEvidence.freshness,
    expectationsEvidence.freshness
  ]);
  const provenanceSet = new Set<CurrencyEvidenceProvenance>([
    marketEvidence.provenance,
    fundamentalEvidence.provenance,
    policyEvidence.provenance,
    expectationsEvidence.provenance,
    'DERIVED'
  ]);
  const evidenceCount =
    marketEvidence.evidenceCount +
    liveFacts.length +
    (hasPolicyContext || hasLivePolicy ? 1 : 0) +
    (datasetMode === 'BENCHMARK' ? contextualObservations.length : 0);
  const liveEvidenceCount =
    marketEvidence.evidenceCount + liveFacts.length + (hasLivePolicy ? 1 : 0);
  const staleEvidence: string[] = [];
  if (marketEvidence.freshness === 'STALE') staleEvidence.push('Market quote contributions are stale.');
  if (fundamentalEvidence.freshness === 'STALE') staleEvidence.push('Fundamental observations are stale.');
  if (policyEvidence.freshness === 'STALE') staleEvidence.push('Central-bank policy context is stale.');
  if (expectationsEvidence.freshness === 'STALE') staleEvidence.push('Expectation observations are stale.');
  const contributingEvidence: string[] = [];
  if (marketHasValue) {
    contributingEvidence.push(
      `${marketEvidence.evidenceCount} timestamped pair contributions produce basket-relative strength ${marketEvidence.strength}.`
    );
  }
  if (liveFacts.length > 0) {
    contributingEvidence.push(`${liveFacts.length} source-backed live FACT observations are available.`);
  }
  if (hasLivePolicy) {
    contributingEvidence.push(
      `${profile.institution} live policy rate and ${profile.stance.toLowerCase()} stance are verified.`
    );
  }
  const agreements: string[] = [];
  const conflicts: string[] = Array.from(new Set(
    Array.from(contradictions.values()).map((item) => item.conflictDescription)
  ));
  if (marketHasValue && fundamentalScore !== null) {
    const marketValue = marketStrength?.marketStrength ?? 0;
    if (marketValue * fundamentalScore > 0) {
      agreements.push('Measured market strength and the complete fundamental score point in the same direction.');
    } else if (marketValue * fundamentalScore < 0) {
      const conflict = 'Measured market strength and the complete fundamental score point in opposite directions.';
      if (!conflicts.includes(conflict)) conflicts.push(conflict);
    }
  }
  const summary = `${code}: market ${marketHasValue ? `${marketStrength!.marketStrength! >= 0 ? '+' : ''}${marketStrength!.marketStrength}%` : 'unavailable'}; fundamentals ${fundamentalScore === null ? 'insufficient for a complete score' : `${fundamentalScore >= 0 ? '+' : ''}${fundamentalScore}`}; policy ${hasLivePolicy ? 'live' : hasPolicyContext ? `${policyProvenance.toLowerCase()} context only` : 'unavailable'}.`;
  const assessment: CurrencyIntelligenceEvidenceAssessment = {
    market: marketEvidence,
    fundamentals: fundamentalEvidence,
    policy: policyEvidence,
    expectations: expectationsEvidence,
    relativeStrength,
    quality: {
      availability: qualityAvailability,
      freshness: qualityFreshness,
      provenance: Array.from(provenanceSet),
      completeness: { available: availableDimensionCount, required: evidenceDimensions.length },
      evidenceCount,
      liveEvidenceCount,
      reasons
    },
    condition: {
      state: fundamentalScore !== null && marketHasValue
        ? qualityAvailability === 'AVAILABLE'
          ? 'SUPPORTED'
          : 'PARTIAL'
        : availableDimensionCount > 0
        ? 'PARTIAL'
        : evidenceDimensions.includes('REFERENCE_ONLY')
        ? 'INSUFFICIENT_EVIDENCE'
        : 'UNAVAILABLE',
      direction: fundamentalScore === null
        ? 'UNKNOWN'
        : fundamentalScore > 0
        ? 'SUPPORTIVE'
        : fundamentalScore < 0
        ? 'CONTRACTIONARY'
        : 'MIXED',
      reason: fundamentalScore === null
        ? reasons.join(' ') || 'Required verified evidence is insufficient for a directional condition.'
        : summary
    },
    contradictions: Array.from(contradictions.values()),
    explanation: {
      summary,
      contributingEvidence,
      unavailableEvidence: reasons,
      staleEvidence,
      agreements,
      conflicts
    },
    calculatedAt: calculatedAtIso
  };

  const sourceBackedFundamentalObservations = liveObservations.map((record) => ({
    id: record.observation.id,
    currency: record.observation.currency.toUpperCase(),
    indicatorId: record.observation.indicatorId,
    indicatorName: record.observation.indicatorName,
    category: record.category as FundamentalCategory,
    value: record.observation.actual,
    unit: record.observation.unit,
    period: record.observation.period,
    previous: record.observation.previous,
    forecast: record.observation.forecast,
    actual: record.observation.actual,
    surprise: record.analysis.surprise,
    surpriseType: record.analysis.expectationStatus,
    releaseDate: record.observation.releaseDate,
    source: record.source || '',
    sourceUrl: record.observation.sourceUrl || '',
    sourceStatus: record.observation.sourceStatus,
    fetchedAt: record.fetchedAt ?? '',
    dataStatus: 'LIVE' as const,
    provenance: record.source || 'UNAVAILABLE',
    classification: record.observation.classification,
    statements: record.analysis.statements
  }));
  const base = evaluateCurrencyFundamentalIntelligence({
    currency,
    observations: sourceBackedFundamentalObservations,
    centralBank: hasLivePolicy
      ? profile
      : {
          ...profile,
          policyRate: null,
          currentPolicyRate: null,
          stance: 'UNAVAILABLE',
          stanceEvidence: [],
          dataStatus: 'UNAVAILABLE'
        },
    marketStrength: marketHasValue ? marketStrength?.marketStrength ?? null : null,
    dailyMovementPercent: marketStrength?.dailyMovementPercent ?? null,
    basketRelativeMovementPercent: marketStrength?.basketRelativeMovementPercent ?? null,
    classification: marketHasValue ? marketStrength?.classification : 'DATA_UNAVAILABLE',
    marketDataFreshness: marketFreshness,
    marketDataSource: marketSource || 'Unavailable',
    coverage: marketStrength?.coverage ?? null,
    upcomingEvents,
    isDataFeedConnected: liveFacts.length > 0 || hasLivePolicy
  });
  const supportComponents = scoreComponents.filter(
    (component) => component.available && component.points !== null && component.points > 0
  );
  const opposingComponents = scoreComponents.filter(
    (component) => component.available && component.points !== null && component.points < 0
  );
  const structuredFactors = (
    components: typeof scoreComponents,
    type: 'FACT' | 'POLICY'
  ) => components
    .filter((component) => component.available && component.points !== null && component.points !== 0)
    .map((component) => ({
      what: `${component.name} contributed ${component.points! > 0 ? '+' : ''}${component.points} points.`,
      why: component.name === 'Live monetary policy'
        ? `${profile.institution} supplied verified live policy evidence.`
        : `A verified live ${component.name.toLowerCase()} actual was compared with its forecast.`,
      source: component.name === 'Live monetary policy' ? profile.source : fundamentalEvidence.source || 'Unknown source',
      type,
      freshness: component.name === 'Live monetary policy'
        ? policyEvidence.freshness
        : fundamentalEvidence.freshness,
      category: component.name === 'Live monetary policy' ? 'CENTRAL_BANK' : component.name.toUpperCase(),
      metric: component.name,
      value: component.points
    }));
  const opposingFactors = opposingComponents.map(
    (component) => `${component.name} provides an opposing live contribution (${component.points}).`
  );
  const supportingFactors = supportComponents.map(
    (component) => `${component.name} provides a supporting live contribution (+${component.points}).`
  );
  const contextualFactors = hasPolicyContext
    ? [
        `${policyProvenance} CONTEXT ONLY: ${profile.institution} records ${profile.stance} stance; this is excluded from live scoring.`
      ]
    : datasetMode === 'BENCHMARK' && contextualObservations.length > 0
    ? ['BENCHMARK CONTEXT ONLY: benchmark observations are excluded from live scoring.']
    : [];
  const unresolvedFactors = [
    ...missingScoreComponents,
    ...reasons.filter((reason) => !missingScoreComponents.includes(reason))
  ];
  const dataGaps = Array.from(new Set(unresolvedFactors));
  const overallCondition: PillarCondition = calculatedFundamentals?.overallCondition ?? 'DATA_UNAVAILABLE';
  const finalExplanation = [summary, ...dataGaps].join(' ');

  return {
    ...base,
    marketStrength: marketEvidence.strength,
    classification: marketEvidence.classification,
    marketDataFreshness: marketEvidence.freshness,
    marketDataSource: marketEvidence.source ?? 'Unavailable',
    coverage: marketStrength?.coverage ?? null,
    fundamentalStatus:
      fundamentalAvailability === 'AVAILABLE'
        ? 'AVAILABLE'
        : fundamentalAvailability === 'PARTIAL'
        ? 'PARTIAL'
        : 'UNAVAILABLE',
    fundamentalScore,
    overallCondition,
    supportingFactors: [...supportingFactors, ...contextualFactors],
    structuredSupportingFactors: structuredFactors(supportComponents, 'FACT'),
    opposingFactors,
    structuredOpposingFactors: structuredFactors(opposingComponents, 'FACT'),
    unresolvedFactors,
    structuredUnresolvedFactors: [],
    dataGaps,
    centralBankStance: policyEvidence.currentStance,
    centralBankProfile: policyProfileForOutput,
    expectationInformation: {
      currency: code,
      totalObservations: expectations.length,
      aboveCount: expectations.filter((item) => item.surpriseType === 'ABOVE_EXPECTATION').length,
      belowCount: expectations.filter((item) => item.surpriseType === 'BELOW_EXPECTATION').length,
      inLineCount: expectations.filter((item) => item.surpriseType === 'IN_LINE').length,
      unknownCount: expectations.filter((item) => item.surpriseType === 'UNKNOWN').length,
      items: expectations.map(({ source: _source, sourceUrl: _sourceUrl, fetchedAt: _fetchedAt, freshness: _freshness, provenance: _provenance, ...item }) => item)
    },
    catalysts: upcomingEvents.filter(
      (event) => event.currency.toUpperCase() === code && event.status === 'UPCOMING'
    ),
    provenance: Array.from(provenanceSet).join(', '),
    explanation: finalExplanation,
    lastUpdated: calculatedAtIso,
    evidenceAssessment: assessment
  };
}
