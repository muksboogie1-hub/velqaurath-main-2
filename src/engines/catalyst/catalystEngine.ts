/**
 * VELQOARATH — CATALYST INTELLIGENCE ENGINE
 *
 * Implements high-fidelity macroeconomic event & catalyst analysis.
 *
 * GOVERNANCE RULES:
 * 1. UPCOMING EVENT != DIRECTIONAL EVIDENCE:
 *    An upcoming high-impact event creates EVENT RISK and TIMING RELEVANCE,
 *    never synthetic bullish or bearish bias.
 * 2. DIRECTIONAL EVIDENCE REQUIRES ACTUAL PRINTS:
 *    Only released events with actual prints compared to forecast or previous
 *    can generate directional evidence, and only when economic indicator semantics justify it.
 * 3. NO FABRICATION:
 *    Missing forecast or actual numbers are never invented.
 * 4. LIFECYCLE AWARENESS:
 *    UPCOMING, IMMINENT (<= 2h), REACTING (<= 4h post release),
 *    RELEASED (> 4h post release), PASSED (> 24h), STALE, UNAVAILABLE.
 */

import { EconomicEvent } from '../../types';
import {
  CatalystEvent,
  CatalystLifecycleState,
  CatalystDirectionalBias,
  EventRiskLevel
} from '../../types/intelligence';

export interface CatalystEvaluationParams {
  events: EconomicEvent[];
  currency?: string;
  referenceDate?: Date;
}

export function evaluateEventLifecycle(
  event: EconomicEvent,
  referenceDate: Date = new Date()
): {
  lifecycle: CatalystLifecycleState;
  timeToEventMinutes: number;
  freshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';
} {
  const eventTime = new Date(event.scheduledTime).getTime();
  const refTime = referenceDate.getTime();

  if (isNaN(eventTime)) {
    return {
      lifecycle: 'UNAVAILABLE',
      timeToEventMinutes: 0,
      freshness: 'UNAVAILABLE'
    };
  }

  const diffMs = eventTime - refTime;
  const timeToEventMinutes = Math.round(diffMs / (1000 * 60));

  // Determine freshness
  let freshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE' = 'FRESH';
  if (Math.abs(timeToEventMinutes) > 7 * 24 * 60) {
    freshness = 'STALE';
  } else if (Math.abs(timeToEventMinutes) > 3 * 24 * 60) {
    freshness = 'AGING';
  }

  // Lifecycle states
  if (event.status === 'RELEASED' || (event.actual !== null && timeToEventMinutes <= 0)) {
    const minutesSinceRelease = Math.abs(timeToEventMinutes);
    if (minutesSinceRelease <= 240) {
      return { lifecycle: 'REACTING', timeToEventMinutes, freshness };
    } else if (minutesSinceRelease <= 1440) {
      return { lifecycle: 'RELEASED', timeToEventMinutes, freshness };
    } else {
      return { lifecycle: 'PASSED', timeToEventMinutes, freshness };
    }
  }

  if (timeToEventMinutes < -120 && event.actual === null) {
    return { lifecycle: 'STALE', timeToEventMinutes, freshness: 'STALE' };
  }

  if (timeToEventMinutes <= 120 && timeToEventMinutes >= -30) {
    return { lifecycle: 'IMMINENT', timeToEventMinutes, freshness };
  }

  if (timeToEventMinutes > 120) {
    return { lifecycle: 'UPCOMING', timeToEventMinutes, freshness };
  }

  return { lifecycle: 'UPCOMING', timeToEventMinutes, freshness };
}

export function evaluateIndicatorImpact(
  eventName: string,
  actual: number | null,
  forecast: number | null,
  previous: number | null
): {
  bias: CatalystDirectionalBias;
  weight: number;
  reason: string;
  isVerifiedInterpretation: boolean;
  surprise: number | null;
  surprisePercentage: number | null;
} {
  if (actual === null) {
    return {
      bias: 'UNKNOWN',
      weight: 0,
      reason: 'Release pending: actual print not yet available. No directional interpretation.',
      isVerifiedInterpretation: false,
      surprise: null,
      surprisePercentage: null
    };
  }

  const target = forecast !== null ? forecast : previous;
  if (target === null) {
    return {
      bias: 'NEUTRAL',
      weight: 2,
      reason: `Print of ${actual} recorded without consensus benchmark.`,
      isVerifiedInterpretation: false,
      surprise: null,
      surprisePercentage: null
    };
  }

  const surprise = Math.round((actual - target) * 1000) / 1000;
  const surprisePercentage = target !== 0 ? Math.round(((actual - target) / Math.abs(target)) * 1000) / 10 : null;

  const nameUpper = eventName.toUpperCase();

  // Known indicator semantics:
  // Growth / Employment / Activity: Higher is typically bullish
  // Unemployment: Lower is typically bullish (inverted)
  const isUnemployment = nameUpper.includes('UNEMPLOYMENT') || nameUpper.includes('JOBLESS CLAIMS');
  const isRateDecision = nameUpper.includes('RATE DECISION') || nameUpper.includes('INTEREST RATE') || nameUpper.includes('CASH RATE');
  const isInflation = nameUpper.includes('CPI') || nameUpper.includes('INFLATION') || nameUpper.includes('PPI');

  if (Math.abs(surprise) < 0.001) {
    return {
      bias: 'NEUTRAL',
      weight: 3,
      reason: `Actual print (${actual}) matches consensus expectation exactly. Neutral impulse.`,
      isVerifiedInterpretation: true,
      surprise: 0,
      surprisePercentage: 0
    };
  }

  if (isRateDecision) {
    if (surprise > 0) {
      return {
        bias: 'BULLISH',
        weight: 9,
        reason: `Rate hike surprise (+${surprise}% vs consensus): hawkish tightening impulse.`,
        isVerifiedInterpretation: true,
        surprise,
        surprisePercentage
      };
    } else {
      return {
        bias: 'BEARISH',
        weight: 9,
        reason: `Rate cut or pause surprise (${surprise}% vs consensus): dovish easing impulse.`,
        isVerifiedInterpretation: true,
        surprise,
        surprisePercentage
      };
    }
  }

  if (isUnemployment) {
    if (surprise < 0) {
      return {
        bias: 'BULLISH',
        weight: 7,
        reason: `Labor slack surprise beat: unemployment printed lower than expected (${actual} vs ${target}).`,
        isVerifiedInterpretation: true,
        surprise,
        surprisePercentage
      };
    } else {
      return {
        bias: 'BEARISH',
        weight: 7,
        reason: `Labor softening: unemployment rose higher than consensus (${actual} vs ${target}).`,
        isVerifiedInterpretation: true,
        surprise,
        surprisePercentage
      };
    }
  }

  if (isInflation) {
    if (surprise > 0) {
      return {
        bias: 'BULLISH',
        weight: 7,
        reason: `Inflation surprise beat (+${surprise}): reinforces higher terminal interest rate pricing.`,
        isVerifiedInterpretation: true,
        surprise,
        surprisePercentage
      };
    } else {
      return {
        bias: 'BEARISH',
        weight: 7,
        reason: `Inflation undershoot (${surprise}): reinforces disinflation trajectory and potential rate easing.`,
        isVerifiedInterpretation: true,
        surprise,
        surprisePercentage
      };
    }
  }

  // Standard economic activity / growth
  if (surprise > 0) {
    return {
      bias: 'BULLISH',
      weight: 6,
      reason: `Macro outperformance (+${surprise} vs consensus): reinforces domestic economic momentum.`,
      isVerifiedInterpretation: true,
      surprise,
      surprisePercentage
    };
  } else {
    return {
      bias: 'BEARISH',
      weight: 6,
      reason: `Macro shortfall (${surprise} vs consensus): signals economic deceleration.`,
      isVerifiedInterpretation: true,
      surprise,
      surprisePercentage
    };
  }
}

export function evaluateEventRisk(
  event: EconomicEvent,
  lifecycle: CatalystLifecycleState,
  timeToEventMinutes: number
): {
  level: EventRiskLevel;
  inVolatilityWindow: boolean;
  reason: string;
} {
  const isHigh = event.importance === 'HIGH';
  const isMed = event.importance === 'MEDIUM';

  if (lifecycle === 'IMMINENT') {
    if (isHigh) {
      return {
        level: 'CRITICAL',
        inVolatilityWindow: true,
        reason: `Imminent tier-1 binary event within ${timeToEventMinutes}m. Heightened spread widening & volatility risk.`
      };
    }
    return {
      level: 'MODERATE',
      inVolatilityWindow: true,
      reason: `Medium-impact event within ${timeToEventMinutes}m.`
    };
  }

  if (lifecycle === 'REACTING') {
    const mins = Math.abs(timeToEventMinutes);
    return {
      level: isHigh ? 'HIGH' : 'LOW',
      inVolatilityWindow: true,
      reason: `Event printed ${mins}m ago. Active post-release price discovery in progress.`
    };
  }

  if (lifecycle === 'UPCOMING') {
    if (timeToEventMinutes <= 1440 && isHigh) {
      return {
        level: 'MODERATE',
        inVolatilityWindow: false,
        reason: `Major release scheduled in ${Math.round(timeToEventMinutes / 60)}h. Market may consolidate ahead of event.`
      };
    }
    return {
      level: 'LOW',
      inVolatilityWindow: false,
      reason: 'Scheduled release on calendar outside immediate risk window.'
    };
  }

  return {
    level: 'NONE',
    inVolatilityWindow: false,
    reason: 'Event resolved or passed.'
  };
}

export function transformToCatalystEvent(
  event: EconomicEvent,
  referenceDate: Date = new Date()
): CatalystEvent {
  const { lifecycle, timeToEventMinutes, freshness } = evaluateEventLifecycle(event, referenceDate);
  const directional = evaluateIndicatorImpact(event.name, event.actual, event.forecast, event.previous);
  const eventRisk = evaluateEventRisk(event, lifecycle, timeToEventMinutes);

  let windowDescription = 'Future scheduled release';
  if (lifecycle === 'IMMINENT') {
    windowDescription = `Imminent within ${Math.max(1, timeToEventMinutes)} minutes`;
  } else if (lifecycle === 'REACTING') {
    windowDescription = `Recent print (${Math.abs(timeToEventMinutes)}m ago)`;
  } else if (lifecycle === 'PASSED') {
    windowDescription = 'Historical release';
  } else if (timeToEventMinutes <= 1440) {
    windowDescription = `Scheduled today (${Math.round(timeToEventMinutes / 60)}h)`;
  }

  return {
    id: event.id,
    name: event.name,
    currency: event.currency,
    category: (event as any).category || 'ECONOMIC_INDICATOR',
    importance: event.importance,
    scheduledTime: event.scheduledTime,
    publishedAt: event.status === 'RELEASED' ? event.scheduledTime : null,
    fetchedAt: new Date().toISOString(),
    previous: event.previous,
    forecast: event.forecast,
    actual: event.actual,
    surprise: directional.surprise,
    surprisePercentage: directional.surprisePercentage,
    unit: event.unit,
    source: event.source || 'Finance Calendar',
    status: event.status,
    freshness,
    lifecycle,
    timeToEventMinutes,
    directionalEvidence: {
      bias: directional.bias,
      weight: directional.weight,
      reason: directional.reason,
      isVerifiedInterpretation: directional.isVerifiedInterpretation
    },
    eventRisk,
    timingRelevance: {
      windowDescription,
      isImmediateWatch: lifecycle === 'IMMINENT' || lifecycle === 'REACTING'
    }
  };
}

export function evaluateCatalystIntelligence(
  events: EconomicEvent[],
  currency?: string,
  referenceDate: Date = new Date()
): {
  catalysts: CatalystEvent[];
  upcomingCount: number;
  imminentCount: number;
  reactingCount: number;
  highRiskPresent: boolean;
  nextMajorCatalyst: CatalystEvent | null;
} {
  const filtered = currency
    ? events.filter((e) => e.currency.toUpperCase() === currency.toUpperCase())
    : events;

  const catalysts = filtered
    .map((e) => transformToCatalystEvent(e, referenceDate))
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  const upcomingCount = catalysts.filter((c) => c.lifecycle === 'UPCOMING').length;
  const imminentCount = catalysts.filter((c) => c.lifecycle === 'IMMINENT').length;
  const reactingCount = catalysts.filter((c) => c.lifecycle === 'REACTING').length;
  const highRiskPresent = catalysts.some((c) => c.eventRisk.level === 'HIGH' || c.eventRisk.level === 'CRITICAL');

  const futureMajor = catalysts.find(
    (c) => (c.lifecycle === 'IMMINENT' || c.lifecycle === 'UPCOMING') && c.importance === 'HIGH'
  );

  return {
    catalysts,
    upcomingCount,
    imminentCount,
    reactingCount,
    highRiskPresent,
    nextMajorCatalyst: futureMajor || null
  };
}
