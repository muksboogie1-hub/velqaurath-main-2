import { analyzeObservationExpectations } from '../expectations/expectationsEngine';
import { ECONOMIC_INDICATORS } from '../../data/indicators';
import {
  EconomicObservation,
  CentralBankPolicy,
  FundamentalPillar,
  MacroFundamentals,
  PillarCondition
} from '../../types';

export function evaluateCurrencyFundamentals(
  currency: string,
  observations: EconomicObservation[],
  centralBank: CentralBankPolicy,
  isDataFeedConnected: boolean
): MacroFundamentals {
  if (!isDataFeedConnected) {
    const unavailPillar: FundamentalPillar = {
      currentCondition: 'DATA SOURCE NOT CONNECTED',
      recentChange: 'DATA UNAVAILABLE',
      expectation: 'DATA UNAVAILABLE',
      surprise: 'UNAVAILABLE',
      implication: 'Fundamental pillar cannot be evaluated without authenticated live data feed.',
      dataAvailable: false,
      observations: []
    };

    return {
      monetaryPolicy: unavailPillar,
      inflation: unavailPillar,
      employment: unavailPillar,
      growth: unavailPillar,
      consumerBusinessActivity: unavailPillar,
      tradeExternalBalance: unavailPillar,
      commodityExposure: unavailPillar,
      overallCondition: 'DATA_UNAVAILABLE' as PillarCondition,
      fundamentalScore: null,
      scoreFormula: 'Calculation suspended: Data sources disconnected.'
    };
  }

  const currObs = observations.filter(
    (o) => o.currency === currency && o.sourceStatus === 'CONNECTED'
  );

  const cbStance = centralBank.stance;
  const cbRate =
    centralBank.currentPolicyRate !== null ? `${centralBank.currentPolicyRate}%` : 'N/A';
  const prevRate =
    centralBank.previousPolicyRate !== null ? `${centralBank.previousPolicyRate}%` : 'N/A';

  /*
   * Policy evidence is only LIVE when the central-bank record explicitly
   * declares verified live provenance. A REFERENCE/STATIC benchmark record is
   * contextual and must never be scored as current policy evidence.
   */
  const policyEvidenceIsLive =
    centralBank.sourceType === 'LIVE' &&
    centralBank.dataSourceMode === 'LIVE' &&
    (centralBank.dataStatus === 'AVAILABLE' || centralBank.dataStatus === 'LIVE') &&
    centralBank.currentPolicyRate !== null &&
    Number.isFinite(centralBank.currentPolicyRate) &&
    (centralBank.freshness === 'FRESH' || centralBank.freshness === 'AGING');

  const monetaryPolicy: FundamentalPillar = {
    currentCondition: policyEvidenceIsLive
      ? `Policy rate at ${cbRate} by ${centralBank.institution}. Stance: ${cbStance}.`
      : `Current policy rate is unavailable. ${centralBank.institution} reference context: ${
          centralBank.contextualPolicyRate !== null &&
          centralBank.contextualPolicyRate !== undefined
            ? `${centralBank.contextualStance ?? 'UNKNOWN'} ${centralBank.contextualPolicyRate}%`
            : 'no recorded benchmark'
        }.`,
    recentChange:
      policyEvidenceIsLive &&
      centralBank.previousPolicyRate !== null &&
      centralBank.currentPolicyRate !== null
        ? `Rate moved from ${prevRate} to ${cbRate} on ${
            centralBank.latestDecisionDate || 'recent meeting'
          }.`
        : 'No verified current policy-rate change is available.',
    expectation: policyEvidenceIsLive
      ? centralBank.guidanceSummary || 'Data-dependent meeting-by-meeting approach.'
      : 'Current policy guidance is unavailable.',
    surprise: policyEvidenceIsLive ? 'NO_SURPRISE' : 'UNAVAILABLE',
    implication: !policyEvidenceIsLive
      ? 'Reference policy is context only and is not current live policy evidence.'
      : cbStance === 'HAWKISH'
      ? 'Restrictive monetary policy provides positive yield support.'
      : cbStance === 'DOVISH'
      ? 'Easing cycle compresses nominal yield advantage.'
      : 'Balanced stance reflects measured equilibrium.',
    dataAvailable: policyEvidenceIsLive,
    observations: []
  };

  const buildPillar = (category: string, defaultName: string): FundamentalPillar => {
    const categoryObs = currObs.filter((o) => o.category === category);
    if (categoryObs.length === 0) {
      return {
        currentCondition: `No authenticated ${defaultName.toLowerCase()} observation recorded.`,
        recentChange: 'DATA UNAVAILABLE',
        expectation: 'DATA UNAVAILABLE',
        surprise: 'UNAVAILABLE',
        implication: 'Awaiting primary statistical release.',
        dataAvailable: false,
        observations: []
      };
    }

    const latest = categoryObs[0];
    const indicatorMeta = ECONOMIC_INDICATORS.find(
      (i) => i.id === latest.indicatorId || i.code === latest.indicatorId
    );
    const expAnalysis = analyzeObservationExpectations(latest, indicatorMeta);

    const prevStr = latest.previous !== null ? `${latest.previous}${latest.unit}` : 'N/A';
    const actualStr = latest.actual !== null ? `${latest.actual}${latest.unit}` : 'N/A';
    const forecastStr =
      latest.forecast !== null ? `${latest.forecast}${latest.unit}` : 'Consensus unavailable';

    return {
      currentCondition: `${latest.indicatorName}: ${actualStr} (${latest.period}). Source: ${latest.source}.`,
      recentChange: `Previous reading was ${prevStr}. Trend: ${
        latest.actual !== null && latest.previous !== null
          ? latest.actual > latest.previous
            ? 'Increasing (+)'
            : latest.actual < latest.previous
            ? 'Decreasing (-)'
            : 'Unchanged'
          : 'Indeterminate'
      }.`,
      expectation: `Market consensus expectation was ${forecastStr}.`,
      surprise:
        expAnalysis.surpriseType === 'NO_FORECAST' ? 'NO_SURPRISE' : expAnalysis.surpriseType,
      implication: expAnalysis.monetaryPolicyImplication,
      /*
       * A pillar is only "available" when a released value actually exists.
       * A scheduled-but-unreleased observation stays missing, not neutral.
       */
      dataAvailable: latest.actual !== null && Number.isFinite(latest.actual),
      observations: categoryObs
    };
  };

  const inflation = buildPillar('INFLATION', 'Inflation');
  const employment = buildPillar('EMPLOYMENT', 'Employment');
  const growth = buildPillar('GROWTH', 'Growth');
  const consumerBusinessActivity = buildPillar('CONSUMER_ACTIVITY', 'Consumer Activity');
  const tradeExternalBalance = buildPillar('TRADE_BALANCE', 'Trade Balance');

  let commodityNotes = 'Standard industrialized economy profile.';
  if (currency === 'AUD')
    commodityNotes = 'High export sensitivity to iron ore, coal, and Chinese industrial demand.';
  if (currency === 'CAD')
    commodityNotes = 'Export correlation to crude oil (WTI) and Western Canadian Select pricing.';
  if (currency === 'NZD')
    commodityNotes = 'Terms of trade driven by global dairy auction (GDT) and agricultural exports.';
  if (currency === 'JPY' || currency === 'EUR')
    commodityNotes =
      'Net commodity/energy importer; elevated energy prices act as a negative terms-of-trade drag.';
  if (currency === 'CHF')
    commodityNotes = 'Safe-haven currency with gold and pharmaceutical export backing.';

  const commodityExposure: FundamentalPillar = {
    currentCondition: commodityNotes,
    recentChange: 'Terms-of-trade sensitivity tracked against energy and commodity indices.',
    expectation: 'Subject to global commodity cycle fluctuations.',
    surprise: 'NO_SURPRISE',
    implication:
      currency === 'AUD' || currency === 'CAD' || currency === 'NZD'
        ? 'Gains support during global resource and industrial expansion phases.'
        : 'Vulnerable to global energy price spikes.',
    dataAvailable: true,
    observations: []
  };

  /*
   * Only live policy evidence contributes a central-bank stance weight.
   * Reference or static stances remain contextual and score zero.
   */
  let cbWeight = 0;
  if (policyEvidenceIsLive && cbStance === 'HAWKISH') cbWeight = 0.08;
  if (policyEvidenceIsLive && cbStance === 'DOVISH') cbWeight = -0.08;

  const surpriseWeight = (pillar: FundamentalPillar): number => {
    if (!pillar.dataAvailable) return 0;
    if (pillar.surprise === 'ABOVE' || pillar.surprise === 'ABOVE_EXPECTATION') return 0.04;
    if (pillar.surprise === 'BELOW' || pillar.surprise === 'BELOW_EXPECTATION') return -0.04;
    return 0;
  };

  const infWeight = surpriseWeight(inflation);
  const empWeight = surpriseWeight(employment);
  const gdpWeight = surpriseWeight(growth);

  /*
   * Evidence accounting. A component contributes a weight ONLY when its own
   * evidence exists. A component with no evidence contributes nothing and is
   * reported as a missing input rather than as a neutral 0.
   */
  const scoredComponents = [
    { name: 'Live monetary policy', available: policyEvidenceIsLive, weight: cbWeight },
    { name: 'Inflation surprise', available: inflation.dataAvailable, weight: infWeight },
    { name: 'Employment surprise', available: employment.dataAvailable, weight: empWeight },
    { name: 'Growth surprise', available: growth.dataAvailable, weight: gdpWeight }
  ];
  const availableComponents = scoredComponents.filter((c) => c.available);
  const missingComponents = scoredComponents.filter((c) => !c.available);
  const evidenceExists = availableComponents.length > 0;

  const totalScore = Math.round(
    availableComponents.reduce((sum, component) => sum + component.weight, 0) * 100
  ) / 100;

  const scoreFormula =
    `Explicit Aggregate Formula: ${scoredComponents
      .map(
        (component) =>
          `${component.name} (${component.available ? `${component.weight >= 0 ? '+' : ''}${component.weight}` : 'UNAVAILABLE'})`
      )
      .join(' + ')} = ` +
    (evidenceExists ? `${totalScore >= 0 ? '+' : ''}${totalScore}` : 'UNAVAILABLE (no evidence)');

  let overallCondition: PillarCondition;
  if (!evidenceExists) {
    overallCondition = 'DATA_UNAVAILABLE';
  } else if (totalScore >= 0.08) {
    overallCondition = 'EXPANSIONARY';
  } else if (totalScore <= -0.08) {
    overallCondition = 'CONTRACTIONARY';
  } else if (totalScore !== 0) {
    overallCondition = 'MIXED';
  } else {
    overallCondition = 'NEUTRAL';
  }

  return {
    monetaryPolicy,
    inflation,
    employment,
    growth,
    consumerBusinessActivity,
    tradeExternalBalance,
    commodityExposure,
    overallCondition,
    /*
     * MISSING is represented as null, never as 0. A zero score is only
     * returned when real evidence exists and genuinely nets out to zero.
     */
    fundamentalScore: evidenceExists ? totalScore : null,
    scoreFormula:
      evidenceExists || missingComponents.length === scoredComponents.length
        ? scoreFormula
        : `${scoreFormula}. Unavailable inputs: ${missingComponents
            .map((component) => component.name)
            .join(', ')}.`
  };
}
