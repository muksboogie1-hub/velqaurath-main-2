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
    upcomingEvents = [],
    isDataFeedConnected = true
  } = params;

  const cbProfile = params.centralBank || buildCentralBankProfile(currency.code);

  const currObs = observations.filter(
    (o) => o.currency.toUpperCase() === currency.code.toUpperCase()
  );

  // Group observations by the 10 fundamental categories
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

  for (const catDef of FUNDAMENTAL_CATEGORIES) {
    const catObs = currObs.filter((o) => o.category === catDef.id);

    if (catDef.id === 'CENTRAL_BANK_MONETARY_POLICY') {
      const isCbAvailable = cbProfile.dataStatus === 'AVAILABLE' || cbProfile.dataStatus === 'LIVE';
      categoriesMap[catDef.id] = {
        category: catDef.id,
        name: catDef.name,
        status: isCbAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
        observations: catObs,
        summary: isCbAvailable
          ? `${cbProfile.institution}: Policy rate at ${
              cbProfile.policyRate !== null ? `${cbProfile.policyRate}%` : 'N/A'
            }. Stance: ${cbProfile.stance}.`
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
        summary: `No authenticated statistical series currently configured for ${catDef.name.toLowerCase()}.`
      };
      dataGaps.push(`${catDef.name}: No authenticated economic release series connected.`);
    }
  }

  // Evaluate expectations across observations
  const expItems: ExpectationAnalysisItem[] = [];
  let aboveCount = 0;
  let belowCount = 0;
  let inLineCount = 0;
  let unknownCount = 0;

  for (const obs of currObs) {
    const meta = ECONOMIC_INDICATORS.find((i) => i.id === obs.indicatorId || i.code === obs.indicatorId);
    const legacyObs = {
      ...obs,
      sourceName: obs.source,
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

  // Central bank factors
  if (cbProfile.stance === 'HAWKISH') {
    supportingFactors.push(
      `${cbProfile.institution} maintains a restrictive HAWKISH stance (policy rate: ${cbProfile.policyRate}%).`
    );
  } else if (cbProfile.stance === 'DOVISH') {
    opposingFactors.push(
      `${cbProfile.institution} is pursuing monetary accommodation (DOVISH stance, policy rate: ${cbProfile.policyRate}%).`
    );
  } else if (cbProfile.stance === 'NEUTRAL') {
    unresolvedFactors.push(
      `${cbProfile.institution} holds a neutral stance pending clearer macroeconomic signals.`
    );
  }

  cbProfile.stanceEvidence.forEach((ev) => {
    if (cbProfile.stance === 'HAWKISH') supportingFactors.push(ev);
    else if (cbProfile.stance === 'DOVISH') opposingFactors.push(ev);
    else unresolvedFactors.push(ev);
  });

  // Indicator surprise factors
  for (const item of expItems) {
    if (item.surpriseType === 'ABOVE_EXPECTATION') {
      if (item.category === 'INFLATION' || item.category === 'GROWTH' || item.category === 'EMPLOYMENT') {
        supportingFactors.push(
          `${item.indicatorName}: Actual (${item.actual}${item.unit}) beat consensus (${item.forecast}${item.unit}), demonstrating macroeconomic momentum.`
        );
      }
    } else if (item.surpriseType === 'BELOW_EXPECTATION') {
      opposingFactors.push(
        `${item.indicatorName}: Actual (${item.actual}${item.unit}) missed consensus (${item.forecast}${item.unit}), pointing to underlying softening.`
      );
    }
  }

  // Commodity exposure notes
  const code = currency.code.toUpperCase();
  if (code === 'AUD') {
    supportingFactors.push('Key export driver: High terms-of-trade exposure to iron ore, metallurgical coal, and Asian industrial output.');
  } else if (code === 'CAD') {
    supportingFactors.push('Key export driver: Commodity correlation with crude oil (Western Canadian Select) and energy trade flows.');
  } else if (code === 'NZD') {
    supportingFactors.push('Key export driver: Agricultural terms-of-trade reliance on global dairy trade (GDT auction index).');
  } else if (code === 'JPY' || code === 'EUR') {
    opposingFactors.push('Macro vulnerability: Net energy importer; elevated global commodity prices act as terms-of-trade drag.');
  } else if (code === 'CHF') {
    supportingFactors.push('Safe-haven profile: Structural current account surplus and safe-haven reserve asset characteristics.');
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
    marketStrength,
    fundamentalStatus,
    fundamentalScore,
    overallCondition,
    supportingFactors,
    opposingFactors,
    catalysts,
    unresolvedFactors,
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
