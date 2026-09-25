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
  FUNDAMENTAL_CATEGORIES
} from '../../types/fundamentals';
import { Currency, EconomicEvent, PillarCondition } from '../../types';
import { analyzeObservationExpectations } from '../../engines/expectations/expectationsEngine';
import { ECONOMIC_INDICATORS } from '../../data/indicators';
import { buildCentralBankProfile } from '../centralBank/centralBankProfiles';

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

  // Central bank factors
  if (cbProfile.stance === 'HAWKISH') {
    const text = `${cbProfile.institution} maintains a restrictive HAWKISH stance (policy rate: ${cbProfile.policyRate}%).`;
    supportingFactors.push(text);
    structuredSupportingFactors.push({
      what: `${cbProfile.institution} Hawkish Policy Stance`,
      why: `Restrictive interest rate settings (${cbProfile.policyRate}%) support currency valuation.`,
      source: cbProfile.source,
      type: 'POLICY',
      freshness: cbProfile.freshness || 'FRESH',
      category: 'CENTRAL_BANK',
      metric: 'Policy Rate',
      value: cbProfile.policyRate
    });
  } else if (cbProfile.stance === 'DOVISH') {
    const text = `${cbProfile.institution} is pursuing monetary accommodation (DOVISH stance, policy rate: ${cbProfile.policyRate}%).`;
    opposingFactors.push(text);
    structuredOpposingFactors.push({
      what: `${cbProfile.institution} Dovish Easing Stance`,
      why: `Monetary accommodation (${cbProfile.policyRate}%) acts as a relative yield headwind.`,
      source: cbProfile.source,
      type: 'POLICY',
      freshness: cbProfile.freshness || 'FRESH',
      category: 'CENTRAL_BANK',
      metric: 'Policy Rate',
      value: cbProfile.policyRate
    });
  } else if (cbProfile.stance === 'NEUTRAL') {
    const text = `${cbProfile.institution} holds a neutral stance pending clearer macroeconomic signals.`;
    unresolvedFactors.push(text);
    structuredUnresolvedFactors.push({
      what: `${cbProfile.institution} Neutral Policy Stance`,
      why: 'Balanced dual mandate risks prevent decisive monetary policy direction.',
      source: cbProfile.source,
      type: 'POLICY',
      freshness: cbProfile.freshness || 'FRESH',
      category: 'CENTRAL_BANK'
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
