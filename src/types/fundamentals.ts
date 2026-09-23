/**
 * VELQOARATH — PHASE B: FUNDAMENTAL INTELLIGENCE TYPES
 *
 * Strongly typed models for macroeconomic fundamental observations,
 * expectations engine, central bank intelligence, currency intelligence,
 * and pair differential analysis.
 */

import { Currency, EconomicEvent, PillarCondition } from './index';

/**
 * The 10 canonical fundamental economic categories required by Velqoarath Phase B.
 */
export type FundamentalCategory =
  | 'CENTRAL_BANK_MONETARY_POLICY'
  | 'INTEREST_RATES'
  | 'INFLATION'
  | 'EMPLOYMENT'
  | 'GROWTH'
  | 'FISCAL_GOVERNMENT'
  | 'TRADE_EXTERNAL_BALANCE'
  | 'COMMODITY_EXPOSURE_TERMS_OF_TRADE'
  | 'MAJOR_ECONOMIC_SHOCKS'
  | 'MARKET_EXPECTATIONS';

export interface FundamentalCategoryDefinition {
  id: FundamentalCategory;
  code: string;
  name: string;
  label: string;
  description: string;
  order: number;
}

export const FUNDAMENTAL_CATEGORIES: FundamentalCategoryDefinition[] = [
  {
    id: 'CENTRAL_BANK_MONETARY_POLICY',
    code: 'CB_POLICY',
    name: 'Central Bank / Monetary Policy',
    label: 'Central Bank / Monetary Policy',
    description: 'Policy interest rate targets, quantitative tightening/easing, asset purchase facilities, and forward guidance statements.',
    order: 1
  },
  {
    id: 'INTEREST_RATES',
    code: 'RATES',
    name: 'Interest Rates',
    label: 'Interest Rates',
    description: 'Sovereign bond yield curves, short-term money market rates, interbank lending rates, and real interest rate differentials.',
    order: 2
  },
  {
    id: 'INFLATION',
    code: 'INFLATION',
    name: 'Inflation',
    label: 'Inflation',
    description: 'Headline Consumer Price Index (CPI), Core CPI, Producer Price Index (PPI), PCE Deflator, and inflation expectation surveys.',
    order: 3
  },
  {
    id: 'EMPLOYMENT',
    code: 'EMPLOYMENT',
    name: 'Employment',
    label: 'Employment',
    description: 'Non-farm payrolls, employment change, unemployment rate, labor force participation, job openings, and average hourly earnings.',
    order: 4
  },
  {
    id: 'GROWTH',
    code: 'GROWTH',
    name: 'Growth',
    label: 'Growth',
    description: 'Gross Domestic Product (GDP), industrial and manufacturing production, retail sales volume, and Purchasing Managers Indices (PMI).',
    order: 5
  },
  {
    id: 'FISCAL_GOVERNMENT',
    code: 'FISCAL',
    name: 'Fiscal / Government',
    label: 'Fiscal / Government',
    description: 'Sovereign debt-to-GDP ratios, national fiscal balance, government bond issuance schedules, and fiscal policy legislation.',
    order: 6
  },
  {
    id: 'TRADE_EXTERNAL_BALANCE',
    code: 'TRADE',
    name: 'Trade / External Balance',
    label: 'Trade / External Balance',
    description: 'Current account balance, trade balance (exports vs imports), foreign exchange reserves, and cross-border capital flow statistics.',
    order: 7
  },
  {
    id: 'COMMODITY_EXPOSURE_TERMS_OF_TRADE',
    code: 'COMMODITY',
    name: 'Commodity Exposure / Terms of Trade',
    label: 'Commodity Exposure / Terms of Trade',
    description: 'Export commodity sensitivities (oil, gas, iron ore, dairy, gold), terms of trade indices, and energy import dependence.',
    order: 8
  },
  {
    id: 'MAJOR_ECONOMIC_SHOCKS',
    code: 'SHOCKS',
    name: 'Major Economic Shocks',
    label: 'Major Economic Shocks',
    description: 'Geopolitical events, systemic financial stability stress, natural disasters, and structural regulatory/macroeconomic regime shifts.',
    order: 9
  },
  {
    id: 'MARKET_EXPECTATIONS',
    code: 'EXPECTATIONS',
    name: 'Market Expectations',
    label: 'Market Expectations',
    description: 'Interest rate futures pricing (OIS, Fed Funds futures, SOFR), survey consensus forecasts, and market-implied terminal rates.',
    order: 10
  }
];

/**
 * Explicit fundamental observation data provenance & operational status.
 */
export type FundamentalDataStatus =
  | 'LIVE'
  | 'AVAILABLE'
  | 'PARTIAL'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'NOT_CONFIGURED';

/**
 * Strict separation between factual data and subsequent analytical layers.
 */
export type AnalyticalClassification =
  | 'FACT'
  | 'EXPECTATION'
  | 'INTERPRETATION'
  | 'ENGINE_ANALYSIS';

/**
 * Expectations engine surprise classification.
 */
export type ExpectationSurpriseType =
  | 'ABOVE_EXPECTATION'
  | 'BELOW_EXPECTATION'
  | 'IN_LINE'
  | 'UNKNOWN';

/**
 * Strongly typed four-layer statement bundle enforcing Fact vs Interpretation separation.
 */
export interface FactInterpretationBundle {
  fact: string;
  expectation: string;
  interpretation: string;
  engineAnalysis: string;
}

/**
 * Strongly typed model for a fundamental economic observation.
 */
export interface FundamentalObservation {
  id: string;
  currency: string;
  indicatorId: string;
  indicatorName: string;
  category: FundamentalCategory;
  value: number | null;
  unit: string;
  period: string;
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  surprise: number | null;
  surpriseType: ExpectationSurpriseType;
  releaseDate: string;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  dataStatus: FundamentalDataStatus;
  provenance: string;
  classification: AnalyticalClassification;
  statements: FactInterpretationBundle;
  notes?: string;
}

/**
 * Structured central bank profile for the 8 core currencies.
 */
export interface CentralBankProfile {
  id: string;
  institution: string;
  currency: string;
  associatedCurrency: string;
  policyRate: number | null;
  currentPolicyRate: number | null;
  previousPolicyRate: number | null;
  latestDecisionDate: string | null;
  nextKnownDecisionDate: string | null;
  stance: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'UNAVAILABLE';
  stanceEvidence: string[];
  guidanceSummary: string | null;
  latestPolicyStatement: string | null;
  majorRisks: string[];
  source: string;
  sourceUrl: string;
  fetchedTimestamp: string;
  dataStatus: FundamentalDataStatus;
  provenance: string;
}

/**
 * Analysis record produced by the expectations engine for a single indicator.
 */
export interface ExpectationAnalysisItem {
  observationId: string;
  currency: string;
  indicatorName: string;
  category: FundamentalCategory;
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  surprise: number | null;
  percentageSurprise: number | null;
  surpriseType: ExpectationSurpriseType;
  unit: string;
  directionSummary: string;
  monetaryPolicyImplication: string;
  classification: 'ENGINE_ANALYSIS';
  statements: FactInterpretationBundle;
}

/**
 * Aggregate expectations breakdown for a specific currency.
 */
export interface CurrencyExpectationsSummary {
  currency: string;
  totalObservations: number;
  aboveCount: number;
  belowCount: number;
  inLineCount: number;
  unknownCount: number;
  items: ExpectationAnalysisItem[];
}

/**
 * Currency fundamental intelligence profile answering "Why is currency X strong/weak?".
 */
export interface CurrencyFundamentalIntelligence {
  currency: Currency;
  marketStrength: number | null;
  fundamentalStatus: FundamentalDataStatus;
  fundamentalScore: number | null;
  overallCondition: PillarCondition;
  supportingFactors: string[];
  opposingFactors: string[];
  catalysts: EconomicEvent[];
  unresolvedFactors: string[];
  dataGaps: string[];
  centralBankStance: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'UNAVAILABLE';
  centralBankProfile: CentralBankProfile;
  expectationInformation: CurrencyExpectationsSummary;
  categories: Record<FundamentalCategory, {
    category: FundamentalCategory;
    name: string;
    status: FundamentalDataStatus;
    observations: FundamentalObservation[];
    summary: string;
  }>;
  provenance: string;
  explanation: string;
  lastUpdated: string;
}

/**
 * Base vs Quote comparative differential.
 */
export interface FundamentalDifferential {
  pairSymbol: string;
  baseCurrency: Currency;
  quoteCurrency: Currency;
  marketStrengthDifferential: number | null;
  fundamentalDifferential: {
    baseScore: number | null;
    quoteScore: number | null;
    delta: number | null;
    summary: string;
  };
  policyDifferential: {
    baseRate: number | null;
    quoteRate: number | null;
    rateSpread: number | null;
    baseStance: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'UNAVAILABLE';
    quoteStance: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'UNAVAILABLE';
    stanceDelta: string;
  };
  expectationsDifferential: {
    baseSummary: string;
    quoteSummary: string;
    comparison: string;
  };
  catalystDifferential: {
    baseCatalysts: EconomicEvent[];
    quoteCatalysts: EconomicEvent[];
    upcomingEvents: EconomicEvent[];
  };
  supportingEvidence: string[];
  contradictoryEvidence: string[];
  invalidationConditions: string[];
  dataQuality: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
  provenance: string;
}
