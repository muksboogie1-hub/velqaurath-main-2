/**
 * VELQOARATH — PHASE B: FUNDAMENTAL INTELLIGENCE TYPES
 *
 * Strongly typed models for macroeconomic fundamental observations,
 * expectations engine, central bank intelligence, currency intelligence,
 * and pair differential analysis.
 */

import { Currency, EconomicEvent, PillarCondition } from './index';

/**
 * The supported fundamental economic categories required by Velqoarath.
 * Incorporates the 10 canonical macro dimensions and backward-compatible aliases.
 */
export type FundamentalCategory =
  | 'CENTRAL_BANK'
  | 'CENTRAL_BANK_MONETARY_POLICY'
  | 'INTEREST_RATES'
  | 'INFLATION'
  | 'EMPLOYMENT'
  | 'GROWTH'
  | 'TRADE'
  | 'TRADE_EXTERNAL_BALANCE'
  | 'FISCAL'
  | 'FISCAL_GOVERNMENT'
  | 'HOUSING'
  | 'CONSUMPTION'
  | 'BUSINESS_ACTIVITY'
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

/**
 * 10 Canonical Target Macro Dimensions specified for Velqoarath Stage 2.
 */
export const TARGET_MACRO_DIMENSIONS: FundamentalCategory[] = [
  'INFLATION',
  'EMPLOYMENT',
  'GROWTH',
  'TRADE',
  'FISCAL',
  'HOUSING',
  'CONSUMPTION',
  'BUSINESS_ACTIVITY',
  'CENTRAL_BANK',
  'MARKET_EXPECTATIONS'
];

export const FUNDAMENTAL_CATEGORIES: FundamentalCategoryDefinition[] = [
  {
    id: 'CENTRAL_BANK_MONETARY_POLICY',
    code: 'CB_POLICY',
    name: 'Central Bank & Monetary Policy',
    label: 'Central Bank & Monetary Policy',
    description:
      'Interest rate decisions, quantitative easing/tightening, policy bias, forward guidance statements, and central bank balance sheet trajectory.',
    order: 1
  },
  {
    id: 'INTEREST_RATES',
    code: 'RATES',
    name: 'Interest Rates & Yields',
    label: 'Interest Rates & Yields',
    description:
      'Sovereign benchmark 2-year and 10-year government bond yields, yield curve slopes (2s10s spread), interbank lending rates, and monetary policy spreads.',
    order: 2
  },
  {
    id: 'INFLATION',
    code: 'INFLATION',
    name: 'Inflation',
    label: 'Inflation',
    description:
      'Headline Consumer Price Index (CPI), Core CPI, Producer Price Index (PPI), PCE Deflator, and inflation expectation surveys.',
    order: 3
  },
  {
    id: 'EMPLOYMENT',
    code: 'EMPLOYMENT',
    name: 'Employment',
    label: 'Employment',
    description:
      'Non-farm payrolls, employment change, unemployment rate, labor force participation, job openings, and average hourly earnings.',
    order: 4
  },
  {
    id: 'GROWTH',
    code: 'GROWTH',
    name: 'Growth',
    label: 'Growth',
    description:
      'Gross Domestic Product (GDP), industrial and manufacturing production, retail sales volume, and Purchasing Managers Indices (PMI).',
    order: 5
  },
  {
    id: 'FISCAL_GOVERNMENT',
    code: 'FISCAL',
    name: 'Fiscal / Government',
    label: 'Fiscal / Government',
    description:
      'Sovereign debt-to-GDP ratios, national fiscal balance, government bond issuance schedules, and fiscal policy legislation.',
    order: 6
  },
  {
    id: 'TRADE_EXTERNAL_BALANCE',
    code: 'TRADE',
    name: 'Trade / External Balance',
    label: 'Trade / External Balance',
    description:
      'Current account balance, trade balance (exports vs imports), foreign exchange reserves, and cross-border capital flow statistics.',
    order: 7
  },
  {
    id: 'COMMODITY_EXPOSURE_TERMS_OF_TRADE',
    code: 'COMMODITY',
    name: 'Commodity Exposure / Terms of Trade',
    label: 'Commodity Exposure / Terms of Trade',
    description:
      'Export commodity sensitivities (oil, gas, iron ore, dairy, gold), terms of trade indices, and energy import dependence.',
    order: 8
  },
  {
    id: 'MAJOR_ECONOMIC_SHOCKS',
    code: 'SHOCKS',
    name: 'Major Economic Shocks',
    label: 'Major Economic Shocks',
    description:
      'Geopolitical events, systemic financial stability stress, natural disasters, and structural regulatory/macroeconomic regime shifts.',
    order: 9
  },
  {
    id: 'MARKET_EXPECTATIONS',
    code: 'EXPECTATIONS',
    name: 'Market Expectations',
    label: 'Market Expectations',
    description:
      'Interest rate futures pricing (OIS, Fed Funds futures, SOFR), survey consensus forecasts, and market-implied terminal rates.',
    order: 10
  }
];

export const MACRO_DIMENSION_DEFINITIONS: FundamentalCategoryDefinition[] = [
  {
    id: 'INFLATION',
    code: 'INFLATION',
    name: 'Inflation',
    label: 'Inflation',
    description: 'Headline Consumer Price Index (CPI), Core CPI, Producer Price Index (PPI), PCE Deflator, and inflation surveys.',
    order: 1
  },
  {
    id: 'EMPLOYMENT',
    code: 'EMPLOYMENT',
    name: 'Employment',
    label: 'Employment',
    description: 'Non-farm payrolls, employment change, unemployment rate, labor force participation, job openings, and average hourly earnings.',
    order: 2
  },
  {
    id: 'GROWTH',
    code: 'GROWTH',
    name: 'Growth',
    label: 'Growth',
    description: 'Gross Domestic Product (GDP), real economic output, national accounts, and overall economic expansion rates.',
    order: 3
  },
  {
    id: 'TRADE',
    code: 'TRADE',
    name: 'Trade / External Balance',
    label: 'Trade / External Balance',
    description: 'Current account balance, trade balance (merchandise & services exports vs imports), terms of trade, and foreign reserves.',
    order: 4
  },
  {
    id: 'FISCAL',
    code: 'FISCAL',
    name: 'Fiscal / Government',
    label: 'Fiscal / Government',
    description: 'Sovereign debt-to-GDP ratios, national budget balance, treasury bond issuance schedules, and fiscal policy legislation.',
    order: 5
  },
  {
    id: 'HOUSING',
    code: 'HOUSING',
    name: 'Housing',
    label: 'Housing',
    description: 'Housing starts, building permits, existing and new home sales, residential house price indices, and mortgage application volumes.',
    order: 6
  },
  {
    id: 'CONSUMPTION',
    code: 'CONSUMPTION',
    name: 'Consumption',
    label: 'Consumption',
    description: 'Retail sales, personal consumer expenditures, consumer confidence, and household demand indicators.',
    order: 7
  },
  {
    id: 'BUSINESS_ACTIVITY',
    code: 'BIZ_ACTIVITY',
    name: 'Business Activity',
    label: 'Business Activity',
    description: 'Purchasing Managers Indices (PMI Manufacturing & Services), ISM indices, industrial production, and business climate surveys.',
    order: 8
  },
  {
    id: 'CENTRAL_BANK',
    code: 'CENTRAL_BANK',
    name: 'Central Bank',
    label: 'Central Bank',
    description: 'Policy interest rate targets, quantitative tightening/easing, asset purchase facilities, and forward guidance statements.',
    order: 9
  },
  {
    id: 'MARKET_EXPECTATIONS',
    code: 'EXPECTATIONS',
    name: 'Market Expectations',
    label: 'Market Expectations',
    description: 'Consensus forecast surveys, interest rate futures pricing (OIS, Fed Funds futures, SOFR), and market-implied policy paths.',
    order: 10
  }
];

/**
 * Explicit fundamental observation data provenance & operational status.
 */
export type FundamentalProviderLifecycle =
  | 'NOT_CONFIGURED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'ERROR'
  | 'DISCONNECTED';

export type FundamentalDatasetMode = 'LIVE' | 'BENCHMARK';

export type FundamentalDataStatus =
  | 'LIVE'
  | 'AVAILABLE'
  | 'PARTIAL'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'NOT_CONFIGURED'
  | FundamentalProviderLifecycle;

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
 * Structured evidence factor explaining what, why, source, type, freshness.
 */
export interface StructuredEvidenceFactor {
  what: string;
  why: string;
  source: string;
  type: 'FACT' | 'EXPECTATION' | 'INTERPRETATION' | 'ENGINE_ANALYSIS' | 'POLICY';
  freshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';
  category?: FundamentalCategory | string;
  metric?: string;
  value?: number | string | null;
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
  sourceName?: string;
  sourceUrl: string;
  sourceStatus?: 'CONNECTED' | 'NOT_CONNECTED';
  publishedAt?: string | null;
  fetchedAt: string;
  freshness?: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';
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
  bank?: string;
  institution: string;
  currency: string;
  associatedCurrency: string;
  policyRate: number | null;
  currentPolicyRate: number | null;
  previousPolicyRate: number | null;
  latestDecisionDate: string | null;
  lastKnownPolicyEvent?: string | null;
  nextKnownDecisionDate: string | null;
  stance: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'UNAVAILABLE';
  policyStance?: 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'UNAVAILABLE';
  policyDirection?: 'HIKING' | 'CUTTING' | 'EASING' | 'HOLDING' | 'PAUSING' | 'UNAVAILABLE';
  stanceEvidence: string[];
  guidanceSummary: string | null;
  latestPolicyStatement: string | null;
  majorRisks: string[];
  source: string;
  sourceType?: 'LIVE' | 'REFERENCE' | 'STATIC' | 'UNAVAILABLE';
  sourceUrl: string;
  sourceMetadata?: any;
  fetchedTimestamp: string;
  freshness?: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';
  dataSourceMode?: 'LIVE' | 'REFERENCE' | 'STATIC' | 'UNAVAILABLE';
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
  dailyMovementPercent?: number | null;
  basketRelativeMovementPercent?: number | null;
  marketStrength: number | null;
  classification?: import('../marketData/types').StrengthClassification;
  marketDataFreshness?: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';
  marketDataSource?: string;
  coverage?: any;
  fundamentalStatus: FundamentalDataStatus;
  fundamentalScore: number | null;
  overallCondition: PillarCondition;
  supportingFactors: string[];
  structuredSupportingFactors?: StructuredEvidenceFactor[];
  opposingFactors: string[];
  structuredOpposingFactors?: StructuredEvidenceFactor[];
  catalysts: EconomicEvent[];
  unresolvedFactors: string[];
  structuredUnresolvedFactors?: StructuredEvidenceFactor[];
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
