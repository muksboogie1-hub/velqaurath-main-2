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

  /*
   * A surprise is defined against a consensus forecast. When no consensus was
   * published, the print may still be compared with the prior release, but that
   * is a change — not a surprise — and it is never reported as one.
   */
  const hasConsensus = forecast !== null;
  const target = hasConsensus ? forecast : previous;
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

  const deviation = Math.round((actual - target) * 1000) / 1000;
  const deviationPercentage = target !== 0 ? Math.round(((actual - target) / Math.abs(target)) * 1000) / 10 : null;

  // Without a consensus forecast there is no surprise to report.
  const surprise = hasConsensus ? deviation : null;
  const surprisePercentage = hasConsensus ? deviationPercentage : null;
  const isVerifiedInterpretation = hasConsensus;
  const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`;

  const nameUpper = eventName.toUpperCase();

  // Known indicator semantics:
  // Growth / Employment / Activity: Higher is typically bullish
  // Unemployment: Lower is typically bullish (inverted)
  const isUnemployment = nameUpper.includes('UNEMPLOYMENT') || nameUpper.includes('JOBLESS CLAIMS');
  const isRateDecision = nameUpper.includes('RATE DECISION') || nameUpper.includes('INTEREST RATE') || nameUpper.includes('CASH RATE');
  const isInflation = nameUpper.includes('CPI') || nameUpper.includes('INFLATION') || nameUpper.includes('PPI');

  if (Math.abs(deviation) < 0.001) {
    return {
      bias: 'NEUTRAL',
      weight: 3,
      reason: hasConsensus
        ? `Actual print (${actual}) matches consensus expectation exactly. Neutral impulse.`
        : `Actual print (${actual}) is unchanged from the previous release.`,
      isVerifiedInterpretation,
      surprise,
      surprisePercentage
    };
  }

  if (isRateDecision) {
    if (deviation > 0) {
      return {
        bias: 'BULLISH',
        weight: 9,
        reason: hasConsensus
          ? `Rate hike surprise (+${deviation}% vs consensus): hawkish tightening impulse.`
          : `Rate decision above the previous print (+${deviation}%); no consensus was published.`,
        isVerifiedInterpretation,
        surprise,
        surprisePercentage
      };
    } else {
      return {
        bias: 'BEARISH',
        weight: 9,
        reason: hasConsensus
          ? `Rate cut or pause surprise (${deviation}% vs consensus): dovish easing impulse.`
          : `Rate decision below the previous print (${deviation}%); no consensus was published.`,
        isVerifiedInterpretation,
        surprise,
        surprisePercentage
      };
    }
  }

  if (isUnemployment) {
    if (deviation < 0) {
      return {
        bias: 'BULLISH',
        weight: 7,
        reason: hasConsensus
          ? `Labor slack surprise beat: unemployment printed lower than expected (${actual} vs ${target}).`
          : `Unemployment printed lower than the previous release (${actual} vs ${target}); no consensus was published.`,
        isVerifiedInterpretation,
        surprise,
        surprisePercentage
      };
    } else {
      return {
        bias: 'BEARISH',
        weight: 7,
        reason: hasConsensus
          ? `Labor softening: unemployment rose higher than consensus (${actual} vs ${target}).`
          : `Unemployment printed higher than the previous release (${actual} vs ${target}); no consensus was published.`,
        isVerifiedInterpretation,
        surprise,
        surprisePercentage
      };
    }
  }

  if (isInflation) {
    if (deviation > 0) {
      return {
        bias: 'BULLISH',
        weight: 7,
        reason: hasConsensus
          ? `Inflation surprise beat (+${deviation}): reinforces higher terminal interest rate pricing.`
          : `Inflation printed above the previous release (+${deviation}); no consensus was published.`,
        isVerifiedInterpretation,
        surprise,
        surprisePercentage
      };
    } else {
      return {
        bias: 'BEARISH',
        weight: 7,
        reason: hasConsensus
          ? `Inflation undershoot (${deviation}): reinforces disinflation trajectory and potential rate easing.`
          : `Inflation printed below the previous release (${deviation}); no consensus was published.`,
        isVerifiedInterpretation,
        surprise,
        surprisePercentage
      };
    }
  }

  // Standard economic activity / growth
  if (deviation > 0) {
    return {
      bias: 'BULLISH',
      weight: 6,
      reason: hasConsensus
        ? `Macro outperformance (${signed(deviation)} vs consensus): reinforces domestic economic momentum.`
        : `Macro print above the previous release (${signed(deviation)}); no consensus was published.`,
      isVerifiedInterpretation,
      surprise,
      surprisePercentage
    };
  } else {
    return {
      bias: 'BEARISH',
      weight: 6,
      reason: hasConsensus
        ? `Macro shortfall (${signed(deviation)} vs consensus): signals economic deceleration.`
        : `Macro print below the previous release (${signed(deviation)}); no consensus was published.`,
      isVerifiedInterpretation,
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

  /*
   * STATUS / LIFECYCLE CONSISTENCY
   *
   * The provider status is preserved verbatim, but the exposed `status` is
   * derived from the lifecycle so a past-dated event can never be presented as
   * UPCOMING while its lifecycle is STALE or PASSED. `statusConsistent` states
   * whether the provider label already agreed with the derived lifecycle.
   */
  const providerStatus = event.status;
  const hasActual = event.actual !== null && event.actual !== undefined;

  const derivedStatus: CatalystEvent['status'] =
    providerStatus === 'CANCELLED'
      ? 'CANCELLED'
      : lifecycle === 'STALE'
      ? 'STALE'
      : lifecycle === 'PASSED'
      ? hasActual
        ? 'RELEASED'
        : 'PASSED'
      : hasActual
      ? 'RELEASED'
      : 'UPCOMING';

  return {
    id: event.id,
    name: event.name,
    currency: event.currency,
    category: (event as any).category || 'ECONOMIC_INDICATOR',
    importance: event.importance,
    scheduledTime: event.scheduledTime,
    publishedAt:
      providerStatus === 'RELEASED' || hasActual ? event.scheduledTime : null,
    fetchedAt: new Date().toISOString(),
    previous: event.previous,
    forecast: event.forecast,
    actual: event.actual,
    surprise: directional.surprise,
    surprisePercentage: directional.surprisePercentage,
    unit: event.unit,
    source: event.source || 'Finance Calendar',
    status: derivedStatus,
    providerStatus,
    statusConsistent: providerStatus === derivedStatus,
    isPastDated: timeToEventMinutes < 0,
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
