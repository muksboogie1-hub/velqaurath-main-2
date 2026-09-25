/**
 * VELQOARATH — EXPECTATIONS ENGINE (PHASE B)
 *
 * Deterministic calculation of macroeconomic expectation surprises:
 * - surprise = actual - forecast
 * - Classifications: ABOVE_EXPECTATION, BELOW_EXPECTATION, IN_LINE, UNKNOWN
 * - Preserves previous, forecast, actual, surprise as separate distinct values
 * - Strict Fact vs Expectation vs Interpretation vs Engine Analysis separation
 * - Never assumes a positive surprise is automatically bullish for the currency
 * - Zero fabrication: returns UNKNOWN if forecast or actual is missing
 */

import {
  EconomicObservation,
  EconomicIndicator,
  FactInterpretationBundle,
  ExpectationSurpriseType,
  AnalyticalClassification
} from '../../types';

export interface ExpectationAnalysis {
  observationId: string;
  currency: string;
  indicatorName: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  surprise: number | null;
  surpriseDelta: number | null;
  percentageSurprise: number | null;
  unit: string;
  // Preserves backward compatibility while supporting Phase B classifications
  surpriseType:
    | 'ABOVE'
    | 'BELOW'
    | 'IN_LINE'
    | 'NO_FORECAST'
    | 'UNAVAILABLE'
    | ExpectationSurpriseType;
  expectationStatus: ExpectationSurpriseType;
  directionSummary: string;
  monetaryPolicyImplication: string;
  classification: AnalyticalClassification;
  statements: FactInterpretationBundle;
}

export interface ExpectationEvaluationInput {
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  unit?: string;
  indicatorName?: string;
  period?: string;
  category?: string;
  currency?: string;
  highIsHawkish?: boolean;
}

export interface ExpectationEvaluationResult {
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  surprise: number | null;
  surpriseDelta: number | null;
  percentageSurprise: number | null;
  expectationStatus: ExpectationSurpriseType;
  statements: FactInterpretationBundle;
  directionSummary: string;
  monetaryPolicyImplication: string;
}

/**
 * Pure mathematical expectation calculation engine.
 */
export function calculateExpectationSurprise(
  previous: number | null,
  forecast: number | null,
  actual: number | null
): {
  surprise: number | null;
  percentageSurprise: number | null;
  status: ExpectationSurpriseType;
} {
  // If actual or forecast is null, expectation surprise cannot be calculated
  if (actual === null || forecast === null) {
    return {
      surprise: null,
      percentageSurprise: null,
      status: 'UNKNOWN'
    };
  }

  // Exact arithmetic rounding to 2 decimal places to avoid IEEE 754 precision drift
  const surprise = Math.round((actual - forecast) * 100) / 100;

  const percentageSurprise =
    forecast !== 0
      ? Math.round(((actual - forecast) / Math.abs(forecast)) * 1000) / 10
      : null;

  // Tolerance threshold: 2% of forecast or 0.05 absolute (whichever is smaller, minimum 0.01)
  const tolerance = Math.max(0.01, Math.min(0.05, Math.abs(forecast) * 0.02));

  let status: ExpectationSurpriseType = 'IN_LINE';
  if (surprise > tolerance) {
    status = 'ABOVE_EXPECTATION';
  } else if (surprise < -tolerance) {
    status = 'BELOW_EXPECTATION';
  } else {
    status = 'IN_LINE';
  }

  return {
    surprise,
    percentageSurprise,
    status
  };
}

/**
 * Generates the strictly typed 4-layer analytical bundle.
 */
export function generateFactInterpretationStatements(
  input: ExpectationEvaluationInput,
  calc: {
    surprise: number | null;
    percentageSurprise: number | null;
    status: ExpectationSurpriseType;
  }
): FactInterpretationBundle {
  const ind = input.indicatorName || 'Indicator';
  const unit = input.unit || '';
  const period = input.period ? ` (${input.period})` : '';
  const highIsHawkish = input.highIsHawkish ?? true;

  // Layer 1: FACT
  let fact = '';
  if (input.actual !== null) {
    fact = `FACT: ${ind}${period} was reported at ${input.actual}${unit}.`;
  } else {
    fact = `FACT: Official release data for ${ind}${period} is currently unavailable.`;
  }

  // Layer 2: EXPECTATION
  let expectation = '';
  if (input.forecast !== null) {
    const prevStr = input.previous !== null ? ` (Previous: ${input.previous}${unit})` : '';
    expectation = `EXPECTATION: Consensus forecast was ${input.forecast}${unit}${prevStr}.`;
  } else {
    expectation = `EXPECTATION: No consensus forecast recorded for this release.`;
  }

  // Layer 3: INTERPRETATION
  let interpretation = '';
  if (calc.status === 'ABOVE_EXPECTATION' && calc.surprise !== null) {
    const pctStr = calc.percentageSurprise !== null ? ` (+${calc.percentageSurprise}%)` : '';
    interpretation = `INTERPRETATION: Reported print exceeded consensus expectations by +${calc.surprise}${unit}${pctStr}.`;
  } else if (calc.status === 'BELOW_EXPECTATION' && calc.surprise !== null) {
    const pctStr = calc.percentageSurprise !== null ? ` (${calc.percentageSurprise}%)` : '';
    interpretation = `INTERPRETATION: Reported print missed consensus expectations by ${calc.surprise}${unit}${pctStr}.`;
  } else if (calc.status === 'IN_LINE') {
    interpretation = `INTERPRETATION: Reported print landed in line with consensus forecast (${input.forecast}${unit}).`;
  } else {
    interpretation = `INTERPRETATION: Cannot interpret surprise without verified forecast and actual data.`;
  }

  // Layer 4: ENGINE_ANALYSIS (Monetary Policy & Economic Meaning)
  let engineAnalysis = '';
  if (calc.status === 'ABOVE_EXPECTATION') {
    if (input.category === 'INFLATION') {
      engineAnalysis =
        'ENGINE_ANALYSIS: Upside inflation pressure increases likelihood of central bank holding rates higher for longer or delaying easing.';
    } else if (input.category === 'EMPLOYMENT') {
      engineAnalysis = highIsHawkish
        ? 'ENGINE_ANALYSIS: Strong labor demand supports consumer resilience, keeping restrictive policy stance viable.'
        : 'ENGINE_ANALYSIS: Rising unemployment increases pressure for central bank policy accommodation.';
    } else if (input.category === 'GROWTH') {
      engineAnalysis =
        'ENGINE_ANALYSIS: Resilient domestic output dampens recession risk, supporting neutral-to-restrictive policy settings.';
    } else {
      engineAnalysis = `ENGINE_ANALYSIS: Indicator print came in stronger than market consensus baseline.`;
    }
  } else if (calc.status === 'BELOW_EXPECTATION') {
    if (input.category === 'INFLATION') {
      engineAnalysis =
        'ENGINE_ANALYSIS: Downside inflation surprise reinforces room for central bank monetary easing.';
    } else if (input.category === 'EMPLOYMENT') {
      engineAnalysis = highIsHawkish
        ? 'ENGINE_ANALYSIS: Softening labor conditions accelerate market pricing of policy rate reductions.'
        : 'ENGINE_ANALYSIS: Tightening labor availability keeps hawkish wage pressure concerns active.';
    } else if (input.category === 'GROWTH') {
      engineAnalysis =
        'ENGINE_ANALYSIS: Subdued output growth weakens inflationary pressure, skewing forward rate expectations dovish.';
    } else {
      engineAnalysis = `ENGINE_ANALYSIS: Indicator print lagged consensus expectations baseline.`;
    }
  } else if (calc.status === 'IN_LINE') {
    engineAnalysis =
      'ENGINE_ANALYSIS: Data meets baseline projections; minimal repricing of prevailing central bank trajectory expected.';
  } else {
    engineAnalysis =
      'ENGINE_ANALYSIS: Fundamental analysis suspended until authenticated release and consensus expectations are verified.';
  }

  return {
    fact,
    expectation,
    interpretation,
    engineAnalysis
  };
}

/**
 * Main evaluation entry point for a single observation.
 */
export function analyzeObservationExpectations(
  obs: EconomicObservation,
  indicatorMeta?: EconomicIndicator
): ExpectationAnalysis {
  const isConnected = obs.sourceStatus === 'CONNECTED';
  const hasActual = obs.actual !== null;
  const hasForecast = obs.forecast !== null;

  if (!isConnected || !hasActual) {
    const isForecastOnly = obs.forecast !== null;
    const isPreviousOnly = obs.previous !== null && obs.forecast === null;

    const fallbackStatements: FactInterpretationBundle = {
      fact: isPreviousOnly
        ? `FACT: Historical fact only; previous release for ${obs.indicatorName} was ${obs.previous}${obs.unit}.`
        : `FACT: Official release data for ${obs.indicatorName} is pending / unavailable.`,
      expectation: isForecastOnly
        ? `EXPECTATION: Consensus market expectation is ${obs.forecast}${obs.unit}.`
        : 'EXPECTATION: No consensus forecast recorded.',
      interpretation: isForecastOnly
        ? 'INTERPRETATION: Expectation only; cannot calculate surprise before actual release.'
        : isPreviousOnly
        ? 'INTERPRETATION: Historical factual baseline only.'
        : 'INTERPRETATION: Cannot evaluate print without verified data release.',
      engineAnalysis: isForecastOnly
        ? 'ENGINE_ANALYSIS: Market expectation established; awaiting authenticated release to determine surprise.'
        : 'ENGINE_ANALYSIS: Fundamental analysis suspended until authenticated release and consensus expectations are verified.'
    };

    return {
      observationId: obs.id,
      currency: obs.currency,
      indicatorName: obs.indicatorName,
      actual: obs.actual,
      forecast: obs.forecast,
      previous: obs.previous,
      surprise: null,
      surpriseDelta: null,
      percentageSurprise: null,
      unit: obs.unit,
      surpriseType: 'UNKNOWN',
      expectationStatus: 'UNKNOWN',
      directionSummary: isForecastOnly
        ? `Expectation only: Consensus forecast at ${obs.forecast}${obs.unit}.`
        : isPreviousOnly
        ? `Historical fact only: Previous print at ${obs.previous}${obs.unit}.`
        : 'DATA UNAVAILABLE / PENDING RELEASE',
      monetaryPolicyImplication: isForecastOnly
        ? 'Awaiting actual print to assess potential central bank policy surprise.'
        : 'Historical factual context only; surprise analysis suspended.',
      classification: isForecastOnly ? 'EXPECTATION' : 'FACT',
      statements: fallbackStatements
    };
  }

  if (!hasForecast) {
    const fallbackStatements: FactInterpretationBundle = {
      fact: `FACT: ${obs.indicatorName} printed at ${obs.actual}${obs.unit} (${obs.period}).`,
      expectation: 'EXPECTATION: No consensus forecast recorded for this release.',
      interpretation: 'INTERPRETATION: Print must be evaluated against historical trend and central bank target.',
      engineAnalysis: 'ENGINE_ANALYSIS: Assess release against long-run macroeconomic trend without forecast baseline.'
    };

    return {
      observationId: obs.id,
      currency: obs.currency,
      indicatorName: obs.indicatorName,
      actual: obs.actual,
      forecast: null,
      previous: obs.previous,
      surprise: null,
      surpriseDelta: null,
      percentageSurprise: null,
      unit: obs.unit,
      surpriseType: 'NO_FORECAST',
      expectationStatus: 'UNKNOWN',
      directionSummary: `Actual printed at ${obs.actual}${obs.unit} without market consensus forecast.`,
      monetaryPolicyImplication: 'Assess historical trend and central bank target band.',
      classification: 'ENGINE_ANALYSIS',
      statements: fallbackStatements
    };
  }

  const highIsHawkish = indicatorMeta?.highIsHawkish ?? true;
  const calc = calculateExpectationSurprise(obs.previous, obs.forecast, obs.actual);
  const statements = generateFactInterpretationStatements(
    {
      previous: obs.previous,
      forecast: obs.forecast,
      actual: obs.actual,
      unit: obs.unit,
      indicatorName: obs.indicatorName,
      period: obs.period,
      category: obs.category,
      currency: obs.currency,
      highIsHawkish
    },
    calc
  );

  // Map to legacy surpriseType for existing callers/tests
  let legacyType: 'ABOVE' | 'BELOW' | 'IN_LINE' = 'IN_LINE';
  if (calc.status === 'ABOVE_EXPECTATION') legacyType = 'ABOVE';
  else if (calc.status === 'BELOW_EXPECTATION') legacyType = 'BELOW';

  return {
    observationId: obs.id,
    currency: obs.currency,
    indicatorName: obs.indicatorName,
    actual: obs.actual,
    forecast: obs.forecast,
    previous: obs.previous,
    surprise: calc.surprise,
    surpriseDelta: calc.surprise,
    percentageSurprise: calc.percentageSurprise,
    unit: obs.unit,
    surpriseType: legacyType,
    expectationStatus: calc.status,
    directionSummary: statements.interpretation.replace('INTERPRETATION: ', ''),
    monetaryPolicyImplication: statements.engineAnalysis.replace('ENGINE_ANALYSIS: ', ''),
    classification: 'ENGINE_ANALYSIS',
    statements
  };
}
