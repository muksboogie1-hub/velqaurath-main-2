/**
 * VELQUARATH — MARKET FOCUS TEST SUITE
 *
 * Market Focus is a projection layer. These tests pin the contract that makes
 * it safe to show on the opening screen:
 *
 * 1.  Valid market + supporting evidence
 * 2.  Market-only evidence
 * 3.  Macro-only evidence where the architecture permits it
 * 4.  Missing market evidence
 * 5.  Missing fundamentals
 * 6.  Reference-only policy evidence earns no live verification
 * 7.  Stale evidence is reported as stale
 * 8.  Contradictory evidence is surfaced, never manufactured
 * 9.  No eligible primary pair
 * 10. PRIMARY_WATCH selection
 * 11. SECONDARY_WATCH fallback
 * 12. Base/quote orientation is never reversed
 * 13. Catalyst status integrity
 * 14. Watch-window / session integrity
 * 15. Data-quality / trust state
 * 16. No missing -> zero conversion
 * 17. No missing -> neutral conversion
 * 18. No fabricated LIVE / FRESH state
 */

import type {
  CatalystEvent,
  ConfluenceComponentAvailability,
  OpportunityState,
  PairIntelligence,
  StructuredInvalidationCondition
} from '../src/types';
import type { FocusPair } from '../src/types/focus';
import {
  buildFocusCatalyst,
  buildMarketFocus,
  buildResearchWindow,
  collectSupportingEvidence,
  deriveBasketStanding,
  deriveBias,
  deriveDataQuality,
  isLayerVerified,
  selectNextCatalyst,
  verifiedEvidenceLayers
} from '../src/engines/focus/marketFocus';
import { evaluateIndicatorImpact } from '../src/engines/catalyst/catalystEngine';
import { isUnusableMarketRecordStatus } from '../src/fundamentals/engine/currencyIntelligenceEngine';
import { deriveFeedStatus, describeEvidenceCoverage, evidenceLabel } from '../src/ui/feedStatus';
import { selectDisplayableChangeConditions } from '../src/ui/focus/FocusNarrative';

const NOW = new Date('2026-09-30T12:00:00.000Z');
const MINUTE = 60 * 1000;

console.log('================================================================');
console.log('RUNNING VELQUARATH MARKET FOCUS SUITE');
console.log('================================================================');

let passed = 0;
let total = 0;

function check(desc: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(`   ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

type ComponentKey = keyof Components;
type ComponentState = ConfluenceComponentAvailability | 'STALE' | 'AGING';
type Availability = Partial<Record<ComponentKey, ComponentState>>;

interface Components {
  marketStrength: unknown;
  fundamentals: unknown;
  policy: unknown;
  expectations: unknown;
  catalysts: unknown;
  session: unknown;
}

const COMPONENT_NAMES: Record<ComponentKey, string> = {
  marketStrength: 'Market Strength',
  fundamentals: 'Fundamentals',
  policy: 'Policy',
  expectations: 'Expectations',
  catalysts: 'Catalysts',
  session: 'Session'
};

const ALL_AVAILABLE: Availability = {
  marketStrength: 'AVAILABLE',
  fundamentals: 'AVAILABLE',
  policy: 'AVAILABLE',
  expectations: 'AVAILABLE',
  catalysts: 'AVAILABLE',
  session: 'AVAILABLE'
};

/**
 * STALE and AGING describe a layer that is present but whose freshness is
 * degraded, exactly as the confluence engine reports them: they stay in the
 * available set and are additionally listed as stale.
 */
function component(state?: ComponentState) {
  const availability =
    state === 'STALE' || state === 'AGING' ? 'AVAILABLE' : state;
  const freshness = state === 'STALE' ? 'STALE' : state === 'AGING' ? 'AGING' : 'FRESH';
  const live = availability === 'AVAILABLE';
  return {
    points: live ? 25 : 0,
    maxPoints: 25,
    weightPercent: 16,
    explanation: '',
    availability,
    freshness
  };
}

function summarise(availability: Availability) {
  const availableComponents: string[] = [];
  const missingComponents: string[] = [];
  const staleComponents: string[] = [];
  const referenceOnlyComponents: string[] = [];

  (Object.keys(COMPONENT_NAMES) as ComponentKey[]).forEach((key) => {
    const state = availability[key];
    const name = COMPONENT_NAMES[key];
    if (state === 'STALE') {
      availableComponents.push(name);
      staleComponents.push(name);
    } else if (state === 'AGING' || state === 'AVAILABLE' || state === 'PARTIAL') {
      availableComponents.push(name);
    } else if (state === 'REFERENCE_ONLY' || state === 'STATIC') {
      referenceOnlyComponents.push(name);
    } else {
      missingComponents.push(name);
    }
  });

  return { availableComponents, missingComponents, staleComponents, referenceOnlyComponents };
}

function makeIntelligence(overrides: Partial<PairIntelligence> = {}): PairIntelligence {
  const symbol = overrides.symbol ?? 'EUR/USD';
  const [base, quote] = symbol.split('/');
  const availability = (overrides as any)._availability as Availability | undefined;
  const resolved: Availability = availability ?? ALL_AVAILABLE;
  const summary = summarise(resolved);

  const base_ = {
    symbol,
    pair: {
      id: `pair-${symbol}`,
      symbol,
      baseCurrency: base,
      quoteCurrency: quote,
      active: true,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString()
    },
    orientationDirection: 'BULLISH_BASE',
    orientation: 'BULLISH_BASE',
    orientationExplanation: 'EUR is outperforming USD across the observed basket.',
    relativeStrengthDelta: 0.42,
    marketEvidenceState: 'AVAILABLE',
    dataQuality: 'COMPLETE',
    freshness: 'FRESH',
    supportingEvidence: [],
    opposingEvidence: [],
    counterEvidence: [],
    contradictions: [],
    catalysts: [],
    risks: [],
    thesis: '',
    invalidationConditions: [],
    sessionRelevance: {
      primarySession: 'London',
      relevantSessions: ['London', 'New York'],
      structuralRationale: 'EUR and USD both anchor in the London and New York centres.'
    },
    watchWindow: {
      watchState: 'ACTIVE',
      watchWindow: 'London / New York overlap',
      rationale: 'Highest shared liquidity window for both legs.'
    },
    structuredOpportunity: {
      pair: symbol,
      state: 'PRIMARY_WATCH' as OpportunityState,
      whyThisPair: 'Highest ranked PRIMARY_WATCH opportunity on current evidence.',
      confluenceScore: 78,
      directionalConfidence: 'HIGH'
    },
    confluence: {
      confluenceScore: 78,
      directionalConfidence: 'HIGH',
      direction: 'BULLISH_BASE',
      dataQuality: 'COMPLETE',
      ...summary,
      components: {
        marketStrength: component(resolved.marketStrength),
        fundamentals: component(resolved.fundamentals),
        policy: component(resolved.policy),
        expectations: component(resolved.expectations),
        catalysts: component(resolved.catalysts),
        session: component(resolved.session)
      },
      threeDimensionalModel: {
        directionalEvidence: { score: 52, maxScore: 65, factors: [] },
        context: { score: 18, maxScore: 20, factors: [] },
        riskAndUncertainty: { penaltyScore: 0, riskLevel: 'LOW', factors: [] }
      }
    },
    _availability: resolved
  };

  const { _availability, ...rest } = base_ as any;
  return { ...rest, ...overrides } as unknown as PairIntelligence;
}

function withAvailability(overrides: Partial<PairIntelligence>, availability: Availability) {
  return makeIntelligence({ ...overrides, _availability: availability } as any);
}

function makeCatalyst(overrides: Partial<CatalystEvent> = {}): CatalystEvent {
  return {
    id: 'evt-1',
    name: 'US Consumer Price Index',
    currency: 'USD',
    category: 'INFLATION',
    importance: 'HIGH',
    scheduledTime: new Date(NOW.getTime() + 120 * MINUTE).toISOString(),
    previous: 3.1,
    forecast: 3.0,
    actual: null,
    surprise: null,
    unit: '%',
    source: 'BLS',
    status: 'UPCOMING',
    freshness: 'FRESH',
    lifecycle: 'UPCOMING',
    timeToEventMinutes: 120,
    directionalEvidence: {
      bias: 'BEARISH',
      weight: 6,
      reason: 'A hotter print would lift the quote leg.',
      isVerifiedInterpretation: true
    },
    eventRisk: { level: 'MODERATE', inVolatilityWindow: true, reason: 'High importance release.' },
    timingRelevance: { windowDescription: 'Within 2 hours', isImmediateWatch: true },
    ...overrides
  } as CatalystEvent;
}

function makeCondition(
  overrides: Partial<StructuredInvalidationCondition> = {}
): StructuredInvalidationCondition {
  return {
    id: 'inv-1',
    category: 'MARKET_STRENGTH',
    description: 'EUR relative strength advantage unwinds.',
    requiredEvidence: 'Market strength differential',
    currentValue: '+0.42%',
    triggerCondition: 'Differential falls below +0.10%',
    triggered: false,
    severity: 'MEDIUM',
    source: 'invalidationEngine',
    timestamp: NOW.toISOString(),
    evaluationStatus: 'VALID',
    ...overrides
  } as StructuredInvalidationCondition;
}

/* ------------------------------------------------------------------ *
 * 1. Valid market + supporting evidence
 * ------------------------------------------------------------------ */

check('1. Valid market + supporting evidence produces a market-confirmed bullish read', () => {
  const intelligence = makeIntelligence({
    supportingEvidence: ['EUR leads the basket across every observed pair.']
  });
  const bias = deriveBias(intelligence);
  if (bias.bias !== 'BULLISH') throw new Error(`expected BULLISH, got ${bias.bias}`);
  if (bias.basis !== 'MARKET_CONFIRMED') throw new Error(`expected MARKET_CONFIRMED, got ${bias.basis}`);

  const supporting = collectSupportingEvidence(intelligence);
  if (supporting.length !== 1) throw new Error(`expected 1 supporting item, got ${supporting.length}`);
  if (supporting[0].verified !== true) throw new Error('market-classified evidence must be verified');

  const focus = buildMarketFocus([intelligence], { now: NOW });
  if (focus.selected?.bias !== 'BULLISH') throw new Error('focus did not project the bullish bias');
  if (focus.why === null || !focus.why.includes('+0.42%')) {
    throw new Error('why did not cite the verified differential');
  }
});

/* ------------------------------------------------------------------ *
 * 2. Market-only evidence
 * ------------------------------------------------------------------ */

check('2. Market-only evidence still yields a confirmed directional read', () => {
  const intelligence = withAvailability(
    {
      relativeStrengthDelta: 0.3,
      marketEvidenceState: 'AVAILABLE',
      orientationDirection: 'BEARISH_BASE',
      orientationExplanation: 'Base is underperforming the quote leg.',
      supportingEvidence: ['Base leg is losing ground against the quote leg.']
    },
    {
      marketStrength: 'AVAILABLE',
      fundamentals: 'UNAVAILABLE',
      policy: 'UNAVAILABLE',
      expectations: 'UNAVAILABLE',
      catalysts: 'UNAVAILABLE',
      session: 'UNAVAILABLE'
    }
  );

  const layers = verifiedEvidenceLayers(intelligence);
  if (layers.join(',') !== 'MARKET') throw new Error(`expected only MARKET, got ${layers.join(',')}`);

  const bias = deriveBias(intelligence);
  if (bias.bias !== 'BEARISH' || bias.basis !== 'MARKET_CONFIRMED') {
    throw new Error(`expected BEARISH/MARKET_CONFIRMED, got ${bias.bias}/${bias.basis}`);
  }

  const focus = buildMarketFocus([intelligence], { now: NOW });
  if (focus.selected?.dataQuality.missingComponents.length !== 5) {
    throw new Error('five missing layers must be reported as missing');
  }
  if (focus.why?.includes('policy evidence')) {
    throw new Error('why must not claim policy evidence when the policy layer is missing');
  }
});

/* ------------------------------------------------------------------ *
 * 3. Macro-only evidence
 * ------------------------------------------------------------------ */

check('3. Macro-only evidence yields a macro-derived directional read', () => {
  const intelligence = withAvailability(
    {
      relativeStrengthDelta: null,
      marketEvidenceState: 'UNAVAILABLE',
      orientationDirection: 'BULLISH_BASE',
      orientationExplanation: 'Live policy carry favours the base leg.',
      structuredThesis: {
        status: 'SUPPORTED',
        evidenceQuality: 'PARTIAL',
        summary: 'Live policy evidence supports the base leg.',
        supportingEvidence: ['Policy rate differential favours the base currency.'],
        counterEvidence: []
      } as any
    },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'AVAILABLE',
      policy: 'AVAILABLE',
      expectations: 'UNAVAILABLE',
      catalysts: 'AVAILABLE',
      session: 'AVAILABLE'
    }
  );

  const bias = deriveBias(intelligence);
  if (bias.bias !== 'BULLISH') throw new Error('macro evidence must still produce a directional bias');
  if (bias.basis !== 'MACRO_DERIVED') throw new Error(`expected MACRO_DERIVED, got ${bias.basis}`);

  const focus = buildMarketFocus([intelligence], { now: NOW });
  if (focus.selected?.relativeStrengthDelta !== null) {
    throw new Error('missing differential must stay null, never 0');
  }
  if (!focus.why?.includes('fundamental and policy evidence')) {
    throw new Error(`why must name the verified layers, got: ${focus.why}`);
  }
});

/* ------------------------------------------------------------------ *
 * 4. Missing market evidence
 * ------------------------------------------------------------------ */

check('4. Missing market evidence never erases independent macro evidence', () => {
  const intelligence = withAvailability(
    {
      relativeStrengthDelta: null,
      marketEvidenceState: 'UNAVAILABLE',
      orientationDirection: 'BEARISH_BASE',
      supportingEvidence: ['Fundamental growth differential favours the quote leg.']
    },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'AVAILABLE',
      policy: 'AVAILABLE',
      expectations: 'PARTIAL',
      catalysts: 'AVAILABLE',
      session: 'AVAILABLE'
    }
  );

  if (isLayerVerified(intelligence, 'MARKET')) {
    throw new Error('unavailable market must not count as verified');
  }
  if (!isLayerVerified(intelligence, 'FUNDAMENTALS')) {
    throw new Error('fundamentals must remain verified independently of market');
  }

  const focus = buildMarketFocus([intelligence], { now: NOW });
  if (focus.selected?.bias !== 'BEARISH') throw new Error('macro bias was erased by missing market');
  if (focus.selected?.dataQuality.marketEvidenceState !== 'UNAVAILABLE') {
    throw new Error('market evidence state must be reported as unavailable');
  }
  if (focus.selected?.confluenceScore === null) {
    throw new Error('a present confluence score must not be nulled out');
  }
});

/* ------------------------------------------------------------------ *
 * 5. Missing fundamentals
 * ------------------------------------------------------------------ */

check('5. Missing fundamentals are reported missing, not as neutral evidence', () => {
  const intelligence = withAvailability(
    { relativeStrengthDelta: 0.5, orientationDirection: 'BULLISH_BASE' },
    {
      marketStrength: 'AVAILABLE',
      fundamentals: 'UNAVAILABLE',
      policy: 'AVAILABLE',
      expectations: 'AVAILABLE',
      catalysts: 'AVAILABLE',
      session: 'AVAILABLE'
    }
  );

  if (isLayerVerified(intelligence, 'FUNDAMENTALS')) {
    throw new Error('unavailable fundamentals must not count as verified');
  }

  const quality = deriveDataQuality(intelligence);
  if (!quality.missingComponents.includes('Fundamentals')) {
    throw new Error('Fundamentals must appear in missingComponents');
  }
  if (quality.availableComponents.includes('Fundamentals')) {
    throw new Error('Fundamentals must not appear in availableComponents');
  }
});

/* ------------------------------------------------------------------ *
 * 6. Reference-only policy evidence
 * ------------------------------------------------------------------ */

check('6. Reference-only policy evidence never counts as live verification', () => {
  const referenceOnly = withAvailability(
    {
      relativeStrengthDelta: null,
      marketEvidenceState: 'UNAVAILABLE',
      orientationDirection: 'BULLISH_BASE',
      supportingEvidence: ['Central bank reference profile lists the current policy rate.']
    },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'UNAVAILABLE',
      policy: 'REFERENCE_ONLY',
      expectations: 'UNAVAILABLE',
      catalysts: 'UNAVAILABLE',
      session: 'AVAILABLE'
    }
  );

  if (isLayerVerified(referenceOnly, 'POLICY')) {
    throw new Error('REFERENCE_ONLY policy must not count as live evidence');
  }

  const quality = deriveDataQuality(referenceOnly);
  if (!quality.referenceOnlyComponents.includes('Policy')) {
    throw new Error('Policy must be reported as reference-only');
  }

  const supporting = collectSupportingEvidence(referenceOnly);
  const policyItem = supporting.find((item) => item.layer === 'POLICY');
  if (policyItem && policyItem.verified) {
    throw new Error('a policy statement must not be marked verified under REFERENCE_ONLY');
  }
});

check('6b. Static policy evidence is equally excluded from live verification', () => {
  const staticPolicy = withAvailability(
    {
      relativeStrengthDelta: null,
      marketEvidenceState: 'UNAVAILABLE',
      orientationDirection: 'NEUTRAL',
      supportingEvidence: ['Central bank reference profile lists the current policy rate.']
    },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'UNAVAILABLE',
      policy: 'STATIC',
      expectations: 'UNAVAILABLE',
      catalysts: 'UNAVAILABLE',
      session: 'UNAVAILABLE'
    }
  );

  if (isLayerVerified(staticPolicy, 'POLICY')) {
    throw new Error('STATIC policy must not count as live evidence');
  }
  if (deriveBias(staticPolicy).bias !== 'UNCONFIRMED') {
    throw new Error('no live directional evidence must not yield a neutral or directional read');
  }
  if (deriveDataQuality(staticPolicy).referenceOnlyComponents.includes('Policy') !== true) {
    throw new Error('STATIC policy must be reported as reference-only');
  }
});

/* ------------------------------------------------------------------ *
 * 7. Stale evidence
 * ------------------------------------------------------------------ */

check('7. Stale evidence is reported as stale and never as fresh', () => {
  const intelligence = withAvailability(
    {
      relativeStrengthDelta: 0.2,
      marketEvidenceState: 'STALE',
      orientationDirection: 'BULLISH_BASE'
    },
    {
      marketStrength: 'AVAILABLE',
      fundamentals: 'AVAILABLE',
      policy: 'AVAILABLE',
      expectations: 'STALE',
      catalysts: 'AVAILABLE',
      session: 'AVAILABLE'
    }
  );

  const quality = deriveDataQuality(intelligence);
  if (!quality.staleComponents.includes('Expectations')) {
    throw new Error('stale layer must be reported in staleComponents');
  }
  if (quality.marketEvidenceState !== 'STALE') {
    throw new Error('stale market must be reported as STALE');
  }
  if (deriveBias(intelligence).basis === 'MARKET_CONFIRMED') {
    throw new Error('stale market must not be reported as market-confirmed');
  }
});

/* ------------------------------------------------------------------ *
 * 8. Contradictory evidence
 * ------------------------------------------------------------------ */

check('8. Contradiction is surfaced from real records and never manufactured', () => {
  const withConflict = makeIntelligence({
    counterEvidence: ['Quote-leg policy repricing runs against the base view.'],
    structuredContradictions: [
      {
        id: 'c-1',
        pair: 'EUR/USD',
        currency: 'USD',
        category: 'POLICY_VS_MARKET',
        contradictionType: 'POLICY_VS_MARKET',
        sourceA: 'policy',
        sourceB: 'market',
        statementA: 'Policy favours the base leg',
        statementB: 'Market favours the quote leg',
        conflictDescription: 'Policy and market disagree on the base leg.',
        description: 'Policy and market disagree on the base leg.',
        directionA: 'BULLISH',
        directionB: 'BEARISH',
        severity: 'HIGH',
        directionalImpact: 'HIGH',
        penaltyPoints: 8,
        affectedComponents: ['marketStrength', 'policy'],
        status: 'UNRESOLVED',
        detectedTimestamp: NOW.toISOString(),
        sourceTimestamps: {},
        provenance: 'contradictionEngine'
      }
    ] as any
  });

  const focus = buildMarketFocus([withConflict], { now: NOW });
  if (focus.contradictingEvidence.length < 2) {
    throw new Error('both the counter statement and the contradiction must be surfaced');
  }
  if (focus.selected?.evidenceAlignment !== 'CONFLICTED') {
    throw new Error('a HIGH severity contradiction must mark the evidence as conflicted');
  }

  // A pair with no counter-evidence must not gain a contradiction.
  const clean = buildMarketFocus([makeIntelligence()], { now: NOW });
  if (clean.contradictingEvidence.length !== 0) {
    throw new Error('a clean pair must not report contradicting evidence');
  }
});

/* ------------------------------------------------------------------ *
 * 9. No eligible primary pair
 * ------------------------------------------------------------------ */

check('9. No PRIMARY_WATCH pair means no primary pair, stated honestly', () => {
  const secondary = makeIntelligence({
    symbol: 'GBP/USD',
    pair: { ...makeIntelligence().pair, id: 'pair-GBP/USD', symbol: 'GBP/USD', baseCurrency: 'GBP', quoteCurrency: 'USD' },
    structuredOpportunity: { state: 'SECONDARY_WATCH', whyThisPair: 'Secondary.', confluenceScore: 60, directionalConfidence: 'MODERATE' } as any
  });
  const monitor = makeIntelligence({
    symbol: 'USD/JPY',
    pair: { ...makeIntelligence().pair, id: 'pair-USD/JPY', symbol: 'USD/JPY', baseCurrency: 'USD', quoteCurrency: 'JPY' },
    structuredOpportunity: { state: 'MONITOR', whyThisPair: 'Monitor only.', confluenceScore: 40, directionalConfidence: 'LOW' } as any
  });

  const focus = buildMarketFocus([secondary, monitor], { now: NOW });
  if (focus.selected !== null) throw new Error('no pair may be promoted without PRIMARY_WATCH');
  if (focus.why !== null) throw new Error('no bias explanation may be produced without a selection');
  if (focus.supportingEvidence.length !== 0) throw new Error('no evidence may be attributed without a selection');
  if (focus.nextCatalyst !== null) throw new Error('no catalyst may be promoted without a selection');
  if (!focus.noPrimaryReason || !focus.noPrimaryReason.includes('primary attention')) {
    throw new Error('the reason must name the unmet primary threshold');
  }
});

/* ------------------------------------------------------------------ *
 * 10. PRIMARY_WATCH selection
 * ------------------------------------------------------------------ */

check('10. The highest ranked PRIMARY_WATCH pair is selected', () => {
  const make = (symbol: string, base: string, quote: string, score: number, state: OpportunityState) => {
    const template = makeIntelligence();
    return makeIntelligence({
      symbol,
      pair: { ...template.pair, id: `pair-${symbol}`, symbol, baseCurrency: base, quoteCurrency: quote },
      confluence: { ...(template.confluence as any), confluenceScore: score },
      structuredOpportunity: { state, whyThisPair: `${symbol} ranked.`, confluenceScore: score, directionalConfidence: 'HIGH' } as any
    });
  };

  const low = make('EUR/USD', 'EUR', 'USD', 40, 'PRIMARY_WATCH');
  const high = make('GBP/USD', 'GBP', 'USD', 80, 'PRIMARY_WATCH');
  const secondary = make('USD/JPY', 'USD', 'JPY', 95, 'SECONDARY_WATCH');

  const focus = buildMarketFocus([low, secondary, high], { now: NOW });
  if (focus.selected?.symbol !== 'GBP/USD') {
    throw new Error(`expected GBP/USD, got ${focus.selected?.symbol}`);
  }
  if (focus.queueSummary.primaryWatch !== 2) throw new Error('primaryWatch count must be 2');
  if (focus.queueSummary.secondaryWatch !== 1) throw new Error('secondaryWatch count must be 1');
  if (focus.nextToWatch[0]?.symbol !== 'USD/JPY') {
    throw new Error('the secondary pair must be queued as next up');
  }
});

/* ------------------------------------------------------------------ *
 * 11. SECONDARY_WATCH fallback
 * ------------------------------------------------------------------ */

check('11. SECONDARY_WATCH is a fallback, never a forced primary', () => {
  const template = makeIntelligence();
  const secondary = makeIntelligence({
    symbol: 'GBP/CHF',
    pair: { ...template.pair, id: 'pair-GBP/CHF', symbol: 'GBP/CHF', baseCurrency: 'GBP', quoteCurrency: 'CHF' },
    structuredOpportunity: { state: 'SECONDARY_WATCH', whyThisPair: 'Queued behind the leader.', confluenceScore: 55, directionalConfidence: 'MODERATE' } as any
  });

  const focus = buildMarketFocus([secondary], { now: NOW });
  if (focus.selected !== null) throw new Error('a secondary pair must not be promoted to primary');
  if (focus.nextToWatch.length !== 1) throw new Error('the secondary pair must still be queued');
  if (focus.queueSummary.primaryWatch !== 0) throw new Error('primaryWatch must remain 0');
});

check('11b. MONITOR and WAIT are counted separately, not double counted', () => {
  const template = makeIntelligence();
  const build = (symbol: string, state: OpportunityState) => {
    const [base, quote] = symbol.split('/');
    return makeIntelligence({
      symbol,
      pair: { ...template.pair, id: `pair-${symbol}`, symbol, baseCurrency: base, quoteCurrency: quote },
      structuredOpportunity: { state, whyThisPair: 'queued', confluenceScore: 30, directionalConfidence: 'LOW' } as any
    });
  };

  const focus = buildMarketFocus(
    [build('EUR/USD', 'MONITOR'), build('GBP/USD', 'MONITOR'), build('USD/JPY', 'WAIT'), build('USD/CHF', 'INSUFFICIENT_DATA')],
    { now: NOW }
  );

  const { monitor, wait, insufficientData, total, primaryWatch, secondaryWatch } = focus.queueSummary;
  if (monitor !== 2) throw new Error(`expected monitor 2, got ${monitor}`);
  if (wait !== 1) throw new Error(`expected wait 1, got ${wait}`);
  if (insufficientData !== 1) throw new Error(`expected insufficient 1, got ${insufficientData}`);
  if (primaryWatch + secondaryWatch + monitor + wait + insufficientData !== total) {
    throw new Error('queue counts must sum to the assessed total without double counting');
  }
});

/* ------------------------------------------------------------------ *
 * 12. Base / quote orientation
 * ------------------------------------------------------------------ */

check('12. Base/quote orientation is never reversed', () => {
  const cases: { symbol: string; orientation: any; expected: FocusPair['bias'] }[] = [
    { symbol: 'USD/JPY', orientation: 'BEARISH_BASE', expected: 'BEARISH' },
    { symbol: 'EUR/USD', orientation: 'BULLISH_BASE', expected: 'BULLISH' },
    { symbol: 'GBP/USD', orientation: 'BEARISH_BASE', expected: 'BEARISH' },
    { symbol: 'AUD/JPY', orientation: 'BULLISH_BASE', expected: 'BULLISH' },
    { symbol: 'CAD/JPY', orientation: 'BULLISH_BASE', expected: 'BULLISH' }
  ];

  for (const item of cases) {
    const [base, quote] = item.symbol.split('/');
    const template = makeIntelligence();
    const intelligence = makeIntelligence({
      symbol: item.symbol,
      pair: { ...template.pair, id: `pair-${item.symbol}`, symbol: item.symbol, baseCurrency: base, quoteCurrency: quote },
      orientationDirection: item.orientation,
      relativeStrengthDelta: item.orientation === 'BULLISH_BASE' ? 0.4 : -0.4
    });

    const focus = buildMarketFocus([intelligence], { now: NOW });
    const selected = focus.selected;
    if (!selected) throw new Error(`${item.symbol}: no selection`);
    if (selected.baseCurrency !== base || selected.quoteCurrency !== quote) {
      throw new Error(`${item.symbol}: legs were reversed (${selected.baseCurrency}/${selected.quoteCurrency})`);
    }
    if (selected.orientationDirection !== item.orientation) {
      throw new Error(`${item.symbol}: orientation must pass through unchanged`);
    }
    if (selected.bias !== item.expected) {
      throw new Error(`${item.symbol}: expected ${item.expected}, got ${selected.bias}`);
    }
    if (selected.relativeStrengthDelta !== (item.orientation === 'BULLISH_BASE' ? 0.4 : -0.4)) {
      throw new Error(`${item.symbol}: the differential sign must follow the base leg`);
    }
  }
});

/* ------------------------------------------------------------------ *
 * 13. Catalyst status integrity
 * ------------------------------------------------------------------ */

check('13. Catalyst status integrity is preserved end to end', () => {
  const upcoming = buildFocusCatalyst(makeCatalyst(), 'EUR', 'USD', 'BULLISH', NOW);
  if (upcoming.countdownState !== 'COUNTDOWN') throw new Error('future UPCOMING must be COUNTDOWN');
  if (!upcoming.countdownLabel) throw new Error('a future event must carry a countdown');
  if (upcoming.canChallengeBias !== true || upcoming.challengeVerified !== true) {
    throw new Error('a verified opposing interpretation must be flagged');
  }

  const pastDated = buildFocusCatalyst(
    makeCatalyst({ scheduledTime: new Date(NOW.getTime() - 30 * MINUTE).toISOString(), isPastDated: true }),
    'EUR',
    'USD',
    'BULLISH',
    NOW
  );
  if (pastDated.countdownState !== 'INCONSISTENT') {
    throw new Error('an UPCOMING record with a past timestamp must be INCONSISTENT');
  }
  if (pastDated.countdownLabel !== null) throw new Error('an inconsistent record must not show a countdown');

  const stale = buildFocusCatalyst(makeCatalyst({ lifecycle: 'STALE', status: 'STALE' }), 'EUR', 'USD', 'BULLISH', NOW);
  if (stale.countdownState !== 'PAST') throw new Error('a STALE record must read as PAST');

  const released = buildFocusCatalyst(
    makeCatalyst({ lifecycle: 'RELEASED', status: 'RELEASED', actual: 3.2, surprise: 0.2 }),
    'EUR',
    'USD',
    'BULLISH',
    NOW
  );
  if (released.countdownState !== 'RELEASED') throw new Error('a RELEASED record must read as RELEASED');

  const unverified = buildFocusCatalyst(makeCatalyst({ scheduledTime: 'not-a-date' }), 'EUR', 'USD', 'BULLISH', NOW);
  if (unverified.countdownState !== 'NO_TRUSTED_TIME') {
    throw new Error('an unverifiable time must not produce a countdown');
  }

  const unknownBias = buildFocusCatalyst(
    makeCatalyst({ directionalEvidence: { bias: 'UNKNOWN', weight: 0, reason: 'unclassified', isVerifiedInterpretation: false } }),
    'EUR',
    'USD',
    'BULLISH',
    NOW
  );
  if (unknownBias.canChallengeBias) throw new Error('an UNKNOWN direction must never count as a challenge');

  if (selectNextCatalyst([stale, pastDated, unverified]) !== null) {
    throw new Error('no past, stale or unverified record may be promoted as next catalyst');
  }
  if (selectNextCatalyst([stale, upcoming]) !== upcoming) {
    throw new Error('the actionable catalyst must be selected');
  }
});

check('13b. Only catalysts for the pair legs are projected', () => {
  const intelligence = makeIntelligence({
    catalystIntelligence: [
      makeCatalyst({ id: 'evt-eur', currency: 'EUR', name: 'Eurozone HICP' }),
      makeCatalyst({ id: 'evt-usd', currency: 'USD', name: 'US CPI' }),
      makeCatalyst({ id: 'evt-gbp', currency: 'GBP', name: 'UK GDP' })
    ]
  });

  const focus = buildMarketFocus([intelligence], { now: NOW });
  if (focus.catalysts.length !== 2) throw new Error('only base/quote leg catalysts may be projected');
  if (focus.catalysts.some((c) => c.event.currency === 'GBP')) {
    throw new Error('a third-currency catalyst leaked into the pair narrative');
  }
});

/* ------------------------------------------------------------------ *
 * 14. Watch window / session integrity
 * ------------------------------------------------------------------ */

check('14. Watch-window integrity is preserved and never faked', () => {
  const live = makeIntelligence();
  const active = buildResearchWindow(live, ['London / New York overlap'], true);
  if (!active.dataAvailable) throw new Error('a live window must be reported as available');
  if (active.watchState !== 'ACTIVE') throw new Error('watch state must pass through unchanged');
  if (active.primarySession !== 'London') throw new Error('primary session must pass through unchanged');

  const unavailable = makeIntelligence({
    watchWindow: { watchState: 'DATA_UNAVAILABLE', watchWindow: 'Unavailable' }
  });
  const blocked = buildResearchWindow(unavailable, ['London / New York overlap'], true);
  if (blocked.dataAvailable) throw new Error('an unavailable watch state must not report availability');
  if (blocked.headline !== 'Research window unavailable') {
    throw new Error(`unavailable window must say so, got "${blocked.headline}"`);
  }

  const noEvidence = buildResearchWindow(live, ['London / New York overlap'], false);
  if (noEvidence.dataAvailable) throw new Error('absent evidence must not yield an available window');
  if (noEvidence.headline !== 'Research window unavailable') {
    throw new Error('an active overlap must not be presented when the pair has no evidence');
  }
});

/* ------------------------------------------------------------------ *
 * 15. Data quality / trust state
 * ------------------------------------------------------------------ */

check('15. Data-quality state is projected truthfully', () => {
  const intelligence = withAvailability(
    { relativeStrengthDelta: null, marketEvidenceState: 'UNAVAILABLE', freshness: 'STALE' },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'PARTIAL',
      policy: 'REFERENCE_ONLY',
      expectations: 'UNAVAILABLE',
      catalysts: 'AVAILABLE',
      session: 'AVAILABLE'
    }
  );

  intelligence.confluence = {
    ...(intelligence.confluence as any),
    dataQuality: 'DEGRADED'
  };

  const quality = deriveDataQuality(intelligence);
  if (quality.dataQuality !== 'DEGRADED') throw new Error('data quality must pass through');
  if (quality.freshness !== 'STALE') throw new Error('freshness must pass through');
  if (quality.marketEvidenceState !== 'UNAVAILABLE') throw new Error('market state must pass through');
  if (!quality.missingComponents.includes('Market Strength')) {
    throw new Error('the unavailable market layer must be reported missing');
  }
  if (!quality.referenceOnlyComponents.includes('Policy')) {
    throw new Error('the reference-only policy layer must be reported as reference-only');
  }
  if (quality.thesisStatus !== 'INSUFFICIENT_DATA') {
    throw new Error('an absent thesis must read as INSUFFICIENT_DATA, never VALIDATED');
  }
  if (quality.evidenceQuality !== 'UNAVAILABLE') {
    throw new Error('an absent evidence quality must read as UNAVAILABLE');
  }
  if (quality.crossAssetAvailable !== false) throw new Error('cross-asset must not be claimed available');
  if (!quality.crossAssetNote) throw new Error('the missing cross-asset layer must be explained');
});

/* ------------------------------------------------------------------ *
 * 16. No missing -> zero conversion
 * ------------------------------------------------------------------ */

check('16. Missing values are never converted to zero', () => {
  const intelligence = makeIntelligence({
    relativeStrengthDelta: null,
    marketEvidenceState: 'UNAVAILABLE'
  });
  delete (intelligence as any).confluence;

  const focus = buildMarketFocus([intelligence], { now: NOW });
  const selected = focus.selected;
  if (!selected) throw new Error('a selection was expected');

  if (selected.relativeStrengthDelta !== null) throw new Error('delta must stay null');
  if (selected.confluenceScore !== null) throw new Error('absent confluence must stay null, never 0');
  if (selected.dataQuality.marketEvidenceState !== 'UNAVAILABLE') {
    throw new Error('market evidence must not be reported as available');
  }
  if (focus.why?.includes('+0.00%') || focus.why?.includes('0.00%')) {
    throw new Error('the narrative must not print a zero differential');
  }

  const catalyst = makeCatalyst({ previous: null, forecast: null, actual: null });
  const projected = buildFocusCatalyst(catalyst, 'EUR', 'USD', 'BULLISH', NOW);
  if (projected.event.forecast !== null) throw new Error('a null forecast must not become 0');
});

/* ------------------------------------------------------------------ *
 * 17. No missing -> neutral conversion
 * ------------------------------------------------------------------ */

check('17. Absent evidence never produces a neutral bias', () => {
  const nothing = withAvailability(
    { relativeStrengthDelta: null, marketEvidenceState: 'UNAVAILABLE', orientationDirection: 'NEUTRAL' },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'UNAVAILABLE',
      policy: 'UNAVAILABLE',
      expectations: 'UNAVAILABLE',
      catalysts: 'UNAVAILABLE',
      session: 'UNAVAILABLE'
    }
  );

  const bias = deriveBias(nothing);
  if (bias.bias !== 'UNCONFIRMED') throw new Error(`expected UNCONFIRMED, got ${bias.bias}`);
  if (bias.basis !== 'NO_DIRECTIONAL_EVIDENCE') throw new Error('basis must state the absence of evidence');

  // Genuinely balanced evidence is still allowed to be NEUTRAL.
  const balanced = withAvailability(
    { relativeStrengthDelta: 0.02, marketEvidenceState: 'AVAILABLE', orientationDirection: 'NEUTRAL' },
    { ...ALL_AVAILABLE }
  );
  if (deriveBias(balanced).bias !== 'NEUTRAL') {
    throw new Error('a genuinely balanced read must remain NEUTRAL');
  }
});

/* ------------------------------------------------------------------ *
 * 18. No fabricated LIVE / FRESH state
 * ------------------------------------------------------------------ */

check('18. The focus layer never fabricates a LIVE or FRESH state', () => {
  const intelligence = withAvailability(
    { relativeStrengthDelta: null, marketEvidenceState: 'UNAVAILABLE', freshness: 'UNAVAILABLE' },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'AVAILABLE',
      policy: 'AVAILABLE',
      expectations: 'UNAVAILABLE',
      catalysts: 'UNAVAILABLE',
      session: 'AVAILABLE'
    }
  );

  const focus = buildMarketFocus([intelligence], { now: NOW });
  const selected = focus.selected!;

  if (selected.dataQuality.freshness === 'FRESH') throw new Error('freshness must pass through as unavailable');
  if (selected.dataQuality.marketEvidenceState === 'AVAILABLE') {
    throw new Error('market evidence must not be reported as available');
  }
  if (selected.dataQuality.availableComponents.includes('Market Strength')) {
    throw new Error('an unavailable layer must not appear as present');
  }
  if (selected.biasBasis === 'MARKET_CONFIRMED') {
    throw new Error('a bias must not be reported as market-confirmed without market evidence');
  }

  // The research window follows the live session clock, but it is only
  // presented for a pair that carries some verified evidence.
  if (focus.researchWindow?.dataAvailable !== true) {
    throw new Error('a pair with live macro evidence must still expose its session window');
  }

  const blind = withAvailability(
    {
      relativeStrengthDelta: null,
      marketEvidenceState: 'UNAVAILABLE',
      freshness: 'UNAVAILABLE',
      dataQuality: 'UNAVAILABLE'
    },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'UNAVAILABLE',
      policy: 'UNAVAILABLE',
      expectations: 'UNAVAILABLE',
      catalysts: 'UNAVAILABLE',
      session: 'UNAVAILABLE'
    }
  );

  const blindFocus = buildMarketFocus([blind], { now: NOW });
  if (blindFocus.selected === null) {
    throw new Error('expected a selection so the window gate can be observed');
  }
  if (blindFocus.researchWindow?.dataAvailable !== false) {
    throw new Error('a research window must not be presented for a pair with no evidence');
  }
  if (blindFocus.researchWindow?.headline !== 'Research window unavailable') {
    throw new Error('the window must state that it is unavailable');
  }
});

/* ------------------------------------------------------------------ *
 * 19. Human-readable presentation
 * ------------------------------------------------------------------ */

check('19. The headline states the bias in plain language without new arithmetic', () => {
  const bull = makeIntelligence({ relativeStrengthDelta: 0.13 });
  const bullFocus = buildMarketFocus([bull], { now: NOW });
  if (bullFocus.selected?.headline !== 'EUR is stronger than USD by 0.13%.') {
    throw new Error(`unexpected bullish headline: ${bullFocus.selected?.headline}`);
  }

  const bear = makeIntelligence({
    orientationDirection: 'BEARISH_BASE',
    relativeStrengthDelta: -0.13
  });
  const bearFocus = buildMarketFocus([bear], { now: NOW });
  if (bearFocus.selected?.headline !== 'EUR is weaker than USD by 0.13%.') {
    throw new Error(`unexpected bearish headline: ${bearFocus.selected?.headline}`);
  }

  // A missing differential must not be turned into a magnitude.
  const noDelta = makeIntelligence({ relativeStrengthDelta: null, marketEvidenceState: 'UNAVAILABLE' });
  const noDeltaFocus = buildMarketFocus([noDelta], { now: NOW });
  if (noDeltaFocus.selected?.headline.includes('0.00%')) {
    throw new Error('a missing differential must not appear in the headline');
  }

  const unconfirmed = withAvailability(
    { relativeStrengthDelta: null, marketEvidenceState: 'UNAVAILABLE', orientationDirection: 'NEUTRAL' },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'UNAVAILABLE',
      policy: 'UNAVAILABLE',
      expectations: 'UNAVAILABLE',
      catalysts: 'UNAVAILABLE',
      session: 'UNAVAILABLE'
    }
  );
  const unconfirmedFocus = buildMarketFocus([unconfirmed], { now: NOW });
  if (unconfirmedFocus.selected?.bias !== 'UNCONFIRMED') {
    throw new Error('expected an unconfirmed read');
  }
  if (!unconfirmedFocus.selected?.headline.startsWith('No verified directional view')) {
    throw new Error(`unexpected unconfirmed headline: ${unconfirmedFocus.selected?.headline}`);
  }

  // The engineering derivation is still exposed alongside the plain headline.
  if (!bullFocus.why || !bullFocus.why.includes('+0.13%')) {
    throw new Error(`the detailed derivation must remain available, got: ${bullFocus.why}`);
  }
});

/* ------------------------------------------------------------------ *
 * 20. Research lead when no primary qualifies
 * ------------------------------------------------------------------ */

check('20. No primary pair still reports the strongest candidate and why it stopped', () => {
  const template = makeIntelligence();
  const build = (symbol: string, state: OpportunityState, score: number) => {
    const [base, quote] = symbol.split('/');
    return makeIntelligence({
      symbol,
      pair: { ...template.pair, id: `pair-${symbol}`, symbol, baseCurrency: base, quoteCurrency: quote },
      confluence: { ...(template.confluence as any), confluenceScore: score },
      structuredOpportunity: { state, whyThisPair: 'queued', confluenceScore: score, directionalConfidence: 'MODERATE' } as any
    });
  };

  const focus = buildMarketFocus(
    [build('EUR/USD', 'SECONDARY_WATCH', 60), build('GBP/USD', 'SECONDARY_WATCH', 80), build('USD/JPY', 'MONITOR', 90)],
    { now: NOW }
  );

  if (focus.selected !== null) throw new Error('no primary may be promoted');
  if (focus.researchLead === null) throw new Error('a research lead must still be reported');
  if (focus.researchLead.symbol !== 'GBP/USD') {
    throw new Error(`the lead must be the strongest queued candidate, got ${focus.researchLead.symbol}`);
  }
  if (focus.researchLead.opportunityState !== 'SECONDARY_WATCH') {
    throw new Error('the lead must keep its real opportunity state');
  }
  if (focus.leadReason === null || !focus.leadReason.includes('SECONDARY_WATCH')) {
    throw new Error(`the lead reason must name the state, got: ${focus.leadReason}`);
  }
  if (!focus.leadReason.includes('PRIMARY_WATCH')) {
    throw new Error('the lead reason must name the promotion condition');
  }
  if (!focus.noPrimaryReason?.includes('GBP/USD')) {
    throw new Error('the no-primary reason must name the strongest candidate');
  }

  // A lead is never a promoted primary.
  if (focus.why !== null) throw new Error('no bias narrative may be produced for the lead');
  if (focus.catalysts.length !== 0) throw new Error('no catalyst may be attached to the lead');
});

check('20b. The research lead reports its real evidence gaps', () => {
  const lead = withAvailability(
    {
      relativeStrengthDelta: null,
      marketEvidenceState: 'UNAVAILABLE',
      structuredOpportunity: { state: 'MONITOR', whyThisPair: 'queued', confluenceScore: 44, directionalConfidence: 'LOW' } as any
    },
    {
      marketStrength: 'UNAVAILABLE',
      fundamentals: 'PARTIAL',
      policy: 'REFERENCE_ONLY',
      expectations: 'UNAVAILABLE',
      catalysts: 'AVAILABLE',
      session: 'AVAILABLE'
    }
  );

  const focus = buildMarketFocus([lead], { now: NOW });
  const reason = focus.leadReason ?? '';
  if (!reason.includes('Market Strength')) {
    throw new Error(`missing layers must be named: ${reason}`);
  }
  if (!/Policy is reference/i.test(reason)) {
    throw new Error(`reference-only layers must be named: ${reason}`);
  }
  if (!/market evidence is (unavailable|stale|unknown)/i.test(reason)) {
    throw new Error(`the market state must be named: ${reason}`);
  }
  if (!reason.includes('PRIMARY_WATCH')) {
    throw new Error(`the promotion condition must be named: ${reason}`);
  }
});

/* ------------------------------------------------------------------ *
 * 21. Catalyst surprise integrity
 * ------------------------------------------------------------------ */

check('21. A surprise requires a consensus forecast and is never faked from the previous print', () => {
  const noConsensus = evaluateIndicatorImpact('US jobs report (NFP)', 162000, null, -23000);
  if (noConsensus.surprise !== null) {
    throw new Error(`surprise must be absent without a consensus, got ${noConsensus.surprise}`);
  }
  if (noConsensus.isVerifiedInterpretation) {
    throw new Error('a change against the previous print is not a verified consensus interpretation');
  }
  if (/vs consensus/i.test(noConsensus.reason)) {
    throw new Error(`reason must not claim a consensus it does not have: ${noConsensus.reason}`);
  }

  // With a consensus, the surprise is measured against the forecast.
  const withConsensus = evaluateIndicatorImpact('US CPI', 3.2, 3.0, 3.1);
  if (withConsensus.surprise === null || Math.abs(withConsensus.surprise - 0.2) > 0.001) {
    throw new Error(`surprise must be measured against the forecast, got ${withConsensus.surprise}`);
  }
  if (!withConsensus.isVerifiedInterpretation) {
    throw new Error('a genuine consensus surprise must remain a verified interpretation');
  }

  // Neither forecast nor previous: nothing to compare against.
  const noBenchmark = evaluateIndicatorImpact('US CPI', 3.2, null, null);
  if (noBenchmark.surprise !== null) {
    throw new Error('surprise must be absent with no benchmark at all');
  }
  if (noBenchmark.isVerifiedInterpretation) {
    throw new Error('an unbenchmarked print cannot be a verified interpretation');
  }

  // A print identical to the previous release is not a consensus beat.
  const unchanged = evaluateIndicatorImpact('Industrial Production', 0.1, null, 0.1);
  if (unchanged.surprise !== null) {
    throw new Error('an unchanged print must not produce a surprise');
  }
});

/* ------------------------------------------------------------------ *
 * 22. Research lead catalysts
 * ------------------------------------------------------------------ */

check('22. The research lead keeps its own verified catalyst evidence', () => {
  const template = makeIntelligence();
  const lead = makeIntelligence({
    symbol: 'GBP/CHF',
    pair: {
      ...template.pair,
      id: 'pair-GBP/CHF',
      symbol: 'GBP/CHF',
      baseCurrency: 'GBP',
      quoteCurrency: 'CHF'
    },
    structuredOpportunity: {
      state: 'MONITOR',
      whyThisPair: 'queued',
      confluenceScore: 49,
      directionalConfidence: 'LOW'
    } as any,
    catalystIntelligence: [
      makeCatalyst({
        id: 'evt-gbp-gdp',
        currency: 'GBP',
        name: 'UK GDP',
        scheduledTime: new Date(NOW.getTime() + 60 * MINUTE).toISOString(),
        timeToEventMinutes: 60,
        lifecycle: 'IMMINENT',
        status: 'UPCOMING'
      }),
      makeCatalyst({
        id: 'evt-gbp-cpi-stale',
        currency: 'GBP',
        name: 'UK CPI',
        lifecycle: 'STALE',
        status: 'STALE',
        scheduledTime: new Date(NOW.getTime() - 600 * MINUTE).toISOString()
      }),
      makeCatalyst({
        id: 'evt-eur-noise',
        currency: 'EUR',
        name: 'Eurozone Flash CPI',
        lifecycle: 'UPCOMING',
        status: 'UPCOMING'
      })
    ]
  });

  const focus = buildMarketFocus([lead], { now: NOW });

  if (focus.selected !== null) throw new Error('no primary may be promoted');
  if (focus.researchLead?.symbol !== 'GBP/CHF') {
    throw new Error(`expected the GBP/CHF lead, got ${focus.researchLead?.symbol}`);
  }
  if (focus.leadCatalysts.length !== 2) {
    throw new Error(`only leg catalysts may be projected, got ${focus.leadCatalysts.length}`);
  }
  if (focus.leadCatalysts.some((c) => c.event.currency === 'EUR')) {
    throw new Error('a third-currency catalyst leaked into the lead narrative');
  }
  if (focus.leadNextCatalyst?.event.id !== 'evt-gbp-gdp') {
    throw new Error('the upcoming lead catalyst must be selectable as next');
  }
  if (focus.leadNextCatalyst?.countdownState !== 'COUNTDOWN') {
    throw new Error(`an imminent future event must be COUNTDOWN, got ${focus.leadNextCatalyst?.countdownState}`);
  }
  if (focus.catalysts.length !== 0) {
    throw new Error('lead catalysts must not be presented as a promoted primary’s catalysts');
  }
});

/* ------------------------------------------------------------------ *
 * 23. Basket standing
 * ------------------------------------------------------------------ */

check('23. Basket standing is derived from real market values only', () => {
  const focus = buildMarketFocus([makeIntelligence()], {
    now: NOW,
    currencyStrengths: [
      { currency: 'GBP', marketStrength: 0.49, classification: 'STRONG' },
      { currency: 'JPY', marketStrength: 0.29, classification: 'STRONG' },
      { currency: 'USD', marketStrength: 0.05, classification: 'NEUTRAL' },
      { currency: 'EUR', marketStrength: -0.11, classification: 'WEAK' },
      { currency: 'AUD', marketStrength: -0.29, classification: 'WEAK' }
    ]
  });

  if (focus.basket.leader?.code !== 'GBP') {
    throw new Error(`expected GBP to lead, got ${focus.basket.leader?.code}`);
  }
  if (focus.basket.laggard?.code !== 'AUD') {
    throw new Error(`expected AUD to lag, got ${focus.basket.laggard?.code}`);
  }
  if (focus.basket.currenciesWithEvidence !== 5 || focus.basket.currenciesAssessed !== 5) {
    throw new Error('basket counts must reflect the assessed universe');
  }
  if (!focus.basket.statement.includes('GBP is leading')) {
    throw new Error(`unexpected statement: ${focus.basket.statement}`);
  }
  if (!focus.basket.statement.includes('AUD trails')) {
    throw new Error(`the laggard must be named: ${focus.basket.statement}`);
  }
});

check('23b. A missing basket never produces a leader or a zero score', () => {
  const empty = buildMarketFocus([makeIntelligence()], { now: NOW, currencyStrengths: [] });
  if (empty.basket.leader !== null) throw new Error('no leader may be invented');
  if (empty.basket.currenciesWithEvidence !== 0) throw new Error('evidence count must be zero, not inferred');
  if (/0\.00%/.test(empty.basket.statement)) {
    throw new Error(`an absent basket must not print a zero: ${empty.basket.statement}`);
  }

  const unusable = buildMarketFocus([makeIntelligence()], {
    now: NOW,
    currencyStrengths: [
      { currency: 'GBP', marketStrength: null, classification: 'DATA_UNAVAILABLE' },
      { currency: 'EUR', marketStrength: null, classification: 'INSUFFICIENT_COVERAGE' }
    ]
  });
  if (unusable.basket.leader !== null) {
    throw new Error('a currency with no market value must never lead the basket');
  }
  if (unusable.basket.currenciesAssessed !== 2 || unusable.basket.currenciesWithEvidence !== 0) {
    throw new Error('unusable entries must be counted as assessed but not as evidence');
  }
});

/* ------------------------------------------------------------------ *
 * 24. Derived evidence wording
 * ------------------------------------------------------------------ */

check('24. Evidence wording is derived from the recorded state, never softened', () => {
  const status = {
    quoteCoverage: { available: 15, required: 15 },
    requiredPairsCount: 15,
    availablePairsCount: 15,
    stalePairs: [],
    quotesCount: 15,
    snapshotHealth: 'FRESH' as const,
    health: 'CONNECTED' as const,
    connectionStatus: 'CONNECTED' as const,
    streamState: 'CONNECTED' as const
  } as any;

  const intelligence = Array.from({ length: 8 }, (_, index) => {
    const code = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'][index];
    const hasMacro = ['USD', 'GBP', 'JPY', 'CAD', 'NZD'].includes(code);
    return {
      currency: { code },
      evidenceAssessment: {
        fundamentals: hasMacro
          ? {
              availability: 'PARTIAL',
              provenance: 'LIVE',
              freshness: 'FRESH',
              evidenceCount: 2
            }
          : {
              availability: 'UNAVAILABLE',
              provenance: 'UNAVAILABLE',
              freshness: 'UNAVAILABLE',
              evidenceCount: 0
            }
      }
    } as any;
  });

  const fundamentals = {
    freshness: 'FRESH',
    isStale: false
  } as any;

  const summary = deriveFeedStatus(status, fundamentals, 'LIVE', intelligence);
  if (summary.fx !== 'FRESH') throw new Error(`expected FRESH market state, got ${summary.fx}`);
  if (summary.fundamentals !== 'DEGRADED') {
    throw new Error(`expected partial macro coverage, got ${summary.fundamentals}`);
  }

  const wording = describeEvidenceCoverage(summary, 8);
  if (wording.market !== 'Market evidence is current') {
    throw new Error(`unexpected market clause: ${wording.market}`);
  }
  if (wording.macro !== 'Macro coverage is partial (5 of 8 currencies)') {
    throw new Error(`unexpected macro clause: ${wording.macro}`);
  }
  if (wording.sentence !== 'Market evidence is current. Macro coverage is partial (5 of 8 currencies).') {
    throw new Error(`unexpected sentence: ${wording.sentence}`);
  }

  // Reference-only macro evidence must never be described as current.
  const benchmark = deriveFeedStatus(status, fundamentals, 'BENCHMARK', intelligence);
  const benchmarkWording = describeEvidenceCoverage(benchmark, 8);
  if (benchmarkWording.macro !== 'Macro evidence is reference only') {
    throw new Error(`benchmark mode must read as reference, got: ${benchmarkWording.macro}`);
  }

  // No market evidence at all must not be described as current.
  const noMarket = deriveFeedStatus(
    { ...status, availablePairsCount: 0, quotesCount: 0, quoteCoverage: { available: 0, required: 15 } } as any,
    fundamentals,
    'LIVE',
    intelligence
  );
  if (describeEvidenceCoverage(noMarket, 8).market !== 'Market evidence is unavailable') {
    throw new Error('absent market evidence must not be described as current');
  }
});

/* ------------------------------------------------------------------ *
 * 25. Basket narrative claims only what exists
 * ------------------------------------------------------------------ */

check('25. The basket narrative names only the layers that are actually present', () => {
  const strengths = [
    { currency: 'GBP', marketStrength: 0.49, classification: 'STRONG', contributors: 4 },
    { currency: 'AUD', marketStrength: -0.29, classification: 'WEAK', contributors: 2 }
  ];

  const withMacro = deriveBasketStanding(strengths, [
    {
      currency: 'GBP',
      marketEvidenceCount: 4,
      marketProvenance: 'LIVE',
      macroEvidenceCount: 2,
      macroProvenance: 'LIVE',
      policyAvailability: 'UNAVAILABLE',
      policyProvenance: 'REFERENCE',
      observations: [
        {
          indicator: 'UK GDP',
          category: 'GROWTH',
          actual: 0.4,
          previous: 0.3,
          forecast: null,
          unit: '%',
          releaseDate: '2026-09-11T06:00:00Z'
        }
      ]
    }
  ]);

  const support = withMacro.supportedBy.join(' ');
  if (!support.includes('live market evidence for GBP across 4 pairs')) {
    throw new Error(`the live market layer must be cited, got: ${support}`);
  }
  if (!support.includes('1 live GBP macro observation')) {
    throw new Error(`the live macro layer must be cited, got: ${support}`);
  }
  if (!withMacro.incomplete.join(' ').includes('policy confirmation is reference context only')) {
    throw new Error(`reference policy must be named as reference, got: ${withMacro.incomplete.join(' ')}`);
  }
  if (withMacro.incomplete.join(' ').includes('macro observation')) {
    throw new Error('GBP has live macro evidence, so it must not be reported as a gap');
  }
  if (withMacro.laggard?.code !== 'AUD') {
    throw new Error(`the laggard must come from the same ranking, got ${withMacro.laggard?.code}`);
  }

  // A leader with no macro or live policy evidence must report both gaps.
  const bare = deriveBasketStanding(
    [{ currency: 'EUR', marketStrength: 0.1, classification: 'STRONG', contributors: 4 }],
    [
      {
        currency: 'EUR',
        marketEvidenceCount: 4,
        marketProvenance: 'LIVE',
        macroEvidenceCount: 0,
        macroProvenance: 'UNAVAILABLE',
        policyAvailability: 'UNAVAILABLE',
        policyProvenance: 'UNAVAILABLE',
        observations: []
      }
    ]
  );

  const gaps = bare.incomplete.join(' ');
  if (!gaps.includes('no live EUR macro observation has arrived')) {
    throw new Error(`the missing macro layer must be named, got: ${gaps}`);
  }
  if (!gaps.includes('EUR policy confirmation is incomplete')) {
    throw new Error(`the missing policy layer must be named, got: ${gaps}`);
  }
  if (bare.supportedBy.join(' ').includes('macro')) {
    throw new Error('a currency with no macro evidence must not be described as macro-supported');
  }
  if (bare.macroContext.length !== 0) {
    throw new Error('no observation may be invented for a currency without one');
  }
});

/* ------------------------------------------------------------------ *
 * 26. Market record usability is a data verdict, not a transport phase
 * ------------------------------------------------------------------ */

check('26. A connection phase never disqualifies an otherwise verified quote', () => {
  // The provider stamps quotes with its own health at production time, so a
  // fresh quote can carry a transient phase label.
  for (const phase of ['CONNECTED', 'DEGRADED', 'CONNECTING', 'RECONNECTING', 'STALE']) {
    if (isUnusableMarketRecordStatus(phase)) {
      throw new Error(`${phase} must not disqualify a timestamped, attributed record`);
    }
  }

  // A record that affirmatively says it is not usable is still rejected.
  for (const dead of ['DISCONNECTED', 'ERROR', 'NOT_CONFIGURED']) {
    if (!isUnusableMarketRecordStatus(dead)) {
      throw new Error(`${dead} must remain rejected`);
    }
  }
  if (!isUnusableMarketRecordStatus(undefined)) {
    throw new Error('an unknown status must not be treated as verified');
  }
});

/* ------------------------------------------------------------------ *
 * 27. Catalyst reason strings
 * ------------------------------------------------------------------ */

check('27. Catalyst reason strings render a single sign and never claim a consensus', () => {
  // Positive deviation, no consensus: exactly one sign, no "vs consensus".
  const positive = evaluateIndicatorImpact('UK GDP', 0.4, null, 0.3);
  if (!/(\+\d|-)/.test(positive.reason)) {
    throw new Error(`positive deviation must carry a sign: ${positive.reason}`);
  }
  if (positive.reason.includes('++')) {
    throw new Error(`double sign must never be printed: ${positive.reason}`);
  }
  if (!positive.reason.includes('+0.1')) {
    throw new Error(`positive deviation must read +0.1: ${positive.reason}`);
  }
  if (/consensus/i.test(positive.reason.replace(/no consensus was published/i, ''))) {
    throw new Error(`no consensus was published, so none may be claimed: ${positive.reason}`);
  }

  // Negative deviation, no consensus.
  const negative = evaluateIndicatorImpact('UK GDP', 0.2, null, 0.3);
  if (negative.reason.includes('--') || !negative.reason.includes('-0.1')) {
    throw new Error(`negative deviation must read -0.1: ${negative.reason}`);
  }
  if (negative.reason.includes('+')) {
    throw new Error(`negative deviation must not carry a positive sign: ${negative.reason}`);
  }

  // With a consensus the sign is still single and the claim is legitimate.
  const consensus = evaluateIndicatorImpact('UK GDP', 0.4, 0.3, 0.2);
  if (consensus.reason.includes('++') || !consensus.reason.includes('+0.1')) {
    throw new Error(`consensus deviation must read +0.1: ${consensus.reason}`);
  }
  if (consensus.surprise === null) {
    throw new Error('a consensus-based deviation must still report a surprise');
  }
  if (!consensus.isVerifiedInterpretation) {
    throw new Error('a consensus-based interpretation must remain verified');
  }

  // Neither benchmark at all.
  const noBenchmark = evaluateIndicatorImpact('UK GDP', 0.4, null, null);
  if (noBenchmark.reason.includes('++') || noBenchmark.surprise !== null) {
    throw new Error(`an unbenchmarked print must stay unbenchmarked: ${noBenchmark.reason}`);
  }
});

/* ------------------------------------------------------------------ *
 * 28. Research lead keeps its full explanation when no primary exists
 * ------------------------------------------------------------------ */

check('28. The research lead keeps its full explanation when no primary exists', () => {
  const template = makeIntelligence();
  const lead = makeIntelligence({
    symbol: 'GBP/CHF',
    pair: {
      ...template.pair,
      id: 'pair-GBP/CHF',
      symbol: 'GBP/CHF',
      baseCurrency: 'GBP',
      quoteCurrency: 'CHF'
    },
    relativeStrengthDelta: 0.69,
    supportingEvidence: ['GBP has superior live relative strength versus CHF.'],
    counterEvidence: ['The CHF leg carries the stronger policy reference.'],
    structuredOpportunity: {
      state: 'MONITOR',
      whyThisPair: 'queued',
      confluenceScore: 49,
      directionalConfidence: 'LOW'
    } as any,
    structuredInvalidation: [
      makeCondition({
        id: 'inv-gbp-chf',
        description: 'The GBP relative-strength advantage over CHF unwinds.',
        triggered: false
      })
    ],
    catalystIntelligence: [
      makeCatalyst({
        id: 'evt-gbp-gdp',
        currency: 'GBP',
        name: 'UK GDP',
        scheduledTime: new Date(NOW.getTime() + 60 * MINUTE).toISOString(),
        timeToEventMinutes: 60,
        lifecycle: 'IMMINENT',
        status: 'UPCOMING'
      })
    ]
  });

  const focus = buildMarketFocus([lead], { now: NOW, activeOverlaps: ['London / New York overlap'] });

  if (focus.selected !== null) throw new Error('no primary may be promoted');
  if (focus.researchLead?.symbol !== 'GBP/CHF') {
    throw new Error(`expected the GBP/CHF lead, got ${focus.researchLead?.symbol}`);
  }

  // The primary fields stay empty so the lead is never a disguised promotion.
  if (focus.why !== null) throw new Error('the primary why must stay null when there is no primary');
  if (focus.supportingEvidence.length !== 0) {
    throw new Error('primary supporting evidence must stay empty when there is no primary');
  }
  if (focus.catalysts.length !== 0) {
    throw new Error('primary catalysts must stay empty when there is no primary');
  }

  // The lead keeps its own explanation.
  if (!focus.leadWhy || !focus.leadWhy.includes('0.69')) {
    throw new Error(`the lead must explain itself, got: ${focus.leadWhy}`);
  }
  if (focus.leadSupportingEvidence.length === 0) {
    throw new Error('the lead must keep its verified supporting evidence');
  }
  if (focus.leadSupportingEvidence.some((item) => item.text.includes('relative strength') === false)) {
    throw new Error('the lead supporting evidence must be the pair’s real statement');
  }
  if (focus.leadContradictingEvidence.length === 0) {
    throw new Error('the lead must keep its real contradicting evidence');
  }
  if (focus.leadContradictingEvidence.some((item) => item.text.includes('policy reference') === false)) {
    throw new Error('the lead contradicting evidence must be the pair’s real statement');
  }
  if (focus.leadChangeConditions.length !== 1) {
    throw new Error(`the lead must keep its invalidation conditions, got ${focus.leadChangeConditions.length}`);
  }
  if (focus.leadHasVerifiedChangeConditions !== true) {
    throw new Error('an untriggered, evaluated invalidation condition is still a verified condition');
  }
  if (focus.leadResearchWindow === null) {
    throw new Error('the lead must keep its research window when there is no primary');
  }
  if (focus.leadResearchWindow.watchState !== 'ACTIVE') {
    throw new Error(`the lead window state must pass through, got ${focus.leadResearchWindow.watchState}`);
  }
  if (focus.leadResearchWindow.headline !== 'London / New York overlap') {
    throw new Error(`the lead window must use the active overlap, got ${focus.leadResearchWindow.headline}`);
  }
  if (focus.leadNextCatalyst?.event.id !== 'evt-gbp-gdp') {
    throw new Error(`the lead must keep its upcoming catalyst, got ${focus.leadNextCatalyst?.event.id}`);
  }
});

check('28b. A lead with no verified change condition says so honestly', () => {
  const lead = makeIntelligence({
    structuredOpportunity: { state: 'MONITOR', whyThisPair: 'q', confluenceScore: 30, directionalConfidence: 'LOW' } as any
  });
  delete (lead as any).structuredInvalidation;

  const focus = buildMarketFocus([lead], { now: NOW });
  if (focus.leadChangeConditions.length !== 0) {
    throw new Error('no invalidation conditions must project as none');
  }
  if (focus.leadHasVerifiedChangeConditions !== false) {
    throw new Error('a lead with no conditions must not claim verified change conditions');
  }
});

/* ------------------------------------------------------------------ *
 * 29. Basket narrative names verified macro observations
 * ------------------------------------------------------------------ */

check('29. The basket narrative names verified macro observations rather than counting them', () => {
  const focus = buildMarketFocus([makeIntelligence()], {
    now: NOW,
    currencyStrengths: [
      { currency: 'GBP', marketStrength: 0.49, classification: 'STRONG', contributors: 4 },
      { currency: 'JPY', marketStrength: 0.3, classification: 'STRONG', contributors: 6 }
    ],
    currencyEvidence: [
      {
        currency: 'GBP',
        marketEvidenceCount: 4,
        marketProvenance: 'LIVE',
        macroEvidenceCount: 2,
        macroProvenance: 'LIVE',
        policyAvailability: 'UNAVAILABLE',
        policyProvenance: 'REFERENCE',
        observations: [
          {
            indicator: 'UK GDP',
            category: 'GROWTH',
            actual: 0.4,
            previous: 0.3,
            forecast: null,
            unit: '%',
            releaseDate: '2026-09-11T06:00:00Z'
          },
          {
            indicator: 'UK CPI Inflation',
            category: 'INFLATION',
            actual: 3.1,
            previous: 2.9,
            forecast: null,
            unit: '%',
            releaseDate: '2026-09-16T06:00:00Z'
          }
        ]
      }
    ]
  });

  const basket = focus.basket;
  if (basket.macroContext.length !== 2) {
    throw new Error(`both observations must be named, got ${basket.macroContext.length}`);
  }
  if (basket.macroContext[0].indicator !== 'UK GDP' || basket.macroContext[0].actual !== 0.4) {
    throw new Error('the UK GDP observation must be carried through unchanged');
  }
  if (basket.macroContext[0].forecast !== null) {
    throw new Error('a missing forecast must stay missing');
  }
  if (basket.observed?.code !== 'GBP' || basket.observed.contributors !== 4) {
    throw new Error('the observed measurement must be reported separately from the reading');
  }
  if (!basket.reading.includes('does not assert they caused the move')) {
    throw new Error(`the reading must not claim causation: ${basket.reading}`);
  }
  if (!basket.incomplete.join(' ').includes('reference context only')) {
    throw new Error('reference policy must be reported as incomplete support');
  }
});

check('29b. A leader with no macro evidence names the gap and claims no context', () => {
  const focus = buildMarketFocus([makeIntelligence()], {
    now: NOW,
    currencyStrengths: [{ currency: 'EUR', marketStrength: 0.2, classification: 'STRONG', contributors: 4 }],
    currencyEvidence: [
      {
        currency: 'EUR',
        marketEvidenceCount: 4,
        marketProvenance: 'LIVE',
        macroEvidenceCount: 0,
        macroProvenance: 'UNAVAILABLE',
        policyAvailability: 'UNAVAILABLE',
        policyProvenance: 'UNAVAILABLE',
        observations: []
      }
    ]
  });

  if (focus.basket.macroContext.length !== 0) {
    throw new Error('no observation may be invented for a currency without one');
  }
  if (!focus.basket.reading.includes('No live macro observation')) {
    throw new Error(`the reading must state that no macro context exists: ${focus.basket.reading}`);
  }
  if (!focus.basket.incomplete.join(' ').includes('no live EUR macro observation has arrived')) {
    throw new Error(`the macro gap must be named: ${focus.basket.incomplete.join(' ')}`);
  }
});

/* ------------------------------------------------------------------ *
 * 30. Evidence language mapping
 * ------------------------------------------------------------------ */

check('30. Raw evidence states map to human language without losing the truth', () => {
  const expected: [string, string][] = [
    ['FRESH', 'Current'],
    ['STALE', 'Stale'],
    ['PARTIAL', 'Partial coverage'],
    ['DEGRADED', 'Coverage needs attention'],
    ['UNAVAILABLE', 'Not available'],
    ['REFERENCE', 'Reference context'],
    ['LIVE', 'Live evidence'],
    ['CONNECTED', 'Feed connected'],
    ['DATA_UNAVAILABLE', 'Not available']
  ];
  for (const [raw, label] of expected) {
    if (evidenceLabel(raw) !== label) {
      throw new Error(`${raw} must read as "${label}", got "${evidenceLabel(raw)}"`);
    }
  }
  if (evidenceLabel(null) !== 'Not available' || evidenceLabel(undefined) !== 'Not available') {
    throw new Error('an absent state must read as not available');
  }
  if (evidenceLabel('SOMETHING_NEW') !== 'SOMETHING_NEW') {
    throw new Error('an unmapped state must pass through rather than be invented');
  }
  if (evidenceLabel('DATA_AVAILABLE') === 'DATA_AVAILABLE') {
    throw new Error('known engine states must be mapped');
  }
});

/* ------------------------------------------------------------------ *
 * 31. Session projection stays consistent
 * ------------------------------------------------------------------ */

check('31. The research window is projected from the existing session truth', () => {
  const live = makeIntelligence();
  const window = buildResearchWindow(live, ['London / New York overlap'], true);

  // The window must read from the pair's own session relevance, not a new clock.
  if (window.primarySession !== live.sessionRelevance.primarySession) {
    throw new Error('the primary session must come from the pair session relevance');
  }
  if (window.watchState !== live.watchWindow.watchState) {
    throw new Error('the watch state must pass through unchanged');
  }
  if (window.window !== live.watchWindow.watchWindow) {
    throw new Error('the window string must pass through unchanged');
  }
  if (window.detail.length === 0) {
    throw new Error('a window must always carry a derived explanation');
  }
  if (window.activeOverlaps.length !== 1) {
    throw new Error('only overlaps the pair actually cares about may be listed');
  }

  // An overlap the pair does not care about must not be shown.
  const irrelevant = buildResearchWindow(live, ['Sydney / Tokyo (Asia-Pacific)'], true);
  if (irrelevant.activeOverlaps.length !== 0) {
    throw new Error('an unrelated overlap must not be presented as this pair’s window');
  }
});

check('31b. A negative differential is never described as outperformance', () => {
  const template = makeIntelligence();
  const bearish = makeIntelligence({
    symbol: 'EUR/GBP',
    pair: {
      ...template.pair,
      id: 'pair-EUR/GBP',
      symbol: 'EUR/GBP',
      baseCurrency: 'EUR',
      quoteCurrency: 'GBP'
    },
    orientationDirection: 'BEARISH_BASE',
    relativeStrengthDelta: -0.49
  });

  const focus = buildMarketFocus([bearish], { now: NOW });
  const why = focus.leadWhy ?? focus.why ?? '';

  if (why.includes('outperforming') && !why.includes('underperforming')) {
    throw new Error(`a negative differential must never be called outperformance: ${why}`);
  }
  if (!why.includes('underperforming')) {
    throw new Error(`a negative differential must read as underperformance: ${why}`);
  }

  // A verified market-strength statement must be filed as market evidence.
  const supporting = collectSupportingEvidence(
    makeIntelligence({
      supportingEvidence: [
        'GBP has superior live relative strength versus EUR (Δ = -0.49%).'
      ]
    })
  );
  const item = supporting[0];
  if (item.layer !== 'MARKET') {
    throw new Error(`a relative-strength statement is market evidence, filed as ${item.layer}`);
  }
  if (item.verified !== true) {
    throw new Error('verified market evidence must not be labelled as an unlive layer');
  }
});

/* ------------------------------------------------------------------ *
 * 32. Change-condition presentation filter
 * ------------------------------------------------------------------ */

check('32. The user-facing change section shows only evaluable conditions', () => {
  // 1. A VALID condition is displayed.
  const valid = makeCondition({
    id: 'inv-valid',
    description: 'The base relative-strength advantage unwinds.',
    evaluationStatus: 'VALID',
    triggered: false
  });

  // Unevaluable conditions are present in the underlying truth.
  const unevaluableA = makeCondition({
    id: 'inv-unable-a',
    description: 'The base central bank pivots to easing.',
    evaluationStatus: 'UNABLE_TO_EVALUATE',
    triggered: false
  });
  const unevaluableB = makeCondition({
    id: 'inv-unable-b',
    description: 'Release surprises persist against the base currency.',
    evaluationStatus: 'UNABLE_TO_EVALUATE',
    triggered: false
  });

  const mixed = [valid, unevaluableA, unevaluableB];

  // Project first: the presentation filter operates on the projection, not on
  // the engine's raw records.
  const intelligence = makeIntelligence({
    structuredInvalidation: mixed,
    structuredOpportunity: { state: 'MONITOR', whyThisPair: 'q', confluenceScore: 49, directionalConfidence: 'LOW' } as any
  });
  const focus = buildMarketFocus([intelligence], { now: NOW });
  const projected = focus.leadChangeConditions;

  if (projected.length !== 3) {
    throw new Error(`the projection must retain all three conditions, got ${projected.length}`);
  }

  const selection = selectDisplayableChangeConditions(projected);

  // 1. The VALID condition is displayed.
  if (selection.evaluable.length !== 1) {
    throw new Error(`only the evaluable condition may be displayed, got ${selection.evaluable.length}`);
  }
  if (selection.evaluable[0].condition.id !== 'inv-valid') {
    throw new Error(`the wrong condition was displayed: ${selection.evaluable[0].condition.id}`);
  }

  // 2. UNABLE_TO_EVALUATE conditions are not displayed as change conditions.
  if (selection.evaluable.some((entry) => entry.evaluationStatus !== 'VALID')) {
    throw new Error('an unevaluable condition must never be displayed as a change condition');
  }
  if (selection.unevaluableCount !== 2) {
    throw new Error(`both unevaluable conditions must be counted, got ${selection.unevaluableCount}`);
  }

  // 3. UNABLE_TO_EVALUATE remains present in the underlying truth data.
  if (
    projected.filter((entry) => entry.evaluationStatus === 'UNABLE_TO_EVALUATE').length !== 2
  ) {
    throw new Error('the unevaluable conditions must remain in the underlying truth data');
  }
  if (focus.leadHasVerifiedChangeConditions !== true) {
    throw new Error('a recorded condition must still report a verified condition set in the payload');
  }

  // 4. No condition is incorrectly marked triggered.
  if (projected.some((entry) => entry.triggered)) {
    throw new Error('an unevaluable condition must never be reported as triggered');
  }
  if (selection.evaluable.some((entry) => entry.triggered)) {
    throw new Error('a displayed condition must carry the engine’s own triggered flag');
  }
  if (unevaluableA.triggered || unevaluableB.triggered || valid.triggered) {
    throw new Error('the fixture must not pre-trigger any condition');
  }
});

check('32b. With no evaluable condition the section says so honestly', () => {
  const intelligence = makeIntelligence({
    structuredOpportunity: { state: 'MONITOR', whyThisPair: 'q', confluenceScore: 49, directionalConfidence: 'LOW' } as any,
    structuredInvalidation: [
      makeCondition({ id: 'u1', evaluationStatus: 'UNABLE_TO_EVALUATE', triggered: false }),
      makeCondition({ id: 'u2', evaluationStatus: 'UNABLE_TO_EVALUATE', triggered: false })
    ]
  });

  const projected = buildMarketFocus([intelligence], { now: NOW }).leadChangeConditions;
  const selection = selectDisplayableChangeConditions(projected);

  if (selection.evaluable.length !== 0) {
    throw new Error('no condition may be displayed when none is evaluable');
  }
  if (selection.unevaluableCount !== 2) {
    throw new Error('the unevaluable conditions must still be counted for the explanation');
  }

  const empty = selectDisplayableChangeConditions([]);
  if (empty.evaluable.length !== 0 || empty.unevaluableCount !== 0) {
    throw new Error('an empty set must project as empty');
  }
});

check('32c. A triggered condition is still displayed as triggered', () => {
  const intelligence = makeIntelligence({
    structuredOpportunity: { state: 'MONITOR', whyThisPair: 'q', confluenceScore: 49, directionalConfidence: 'LOW' } as any,
    structuredInvalidation: [
      makeCondition({ id: 'inv-triggered', evaluationStatus: 'VALID', triggered: true })
    ]
  });

  const projected = buildMarketFocus([intelligence], { now: NOW }).leadChangeConditions;
  const selection = selectDisplayableChangeConditions(projected);

  if (selection.evaluable.length !== 1) {
    throw new Error('a triggered but evaluable condition must still be displayed');
  }
  if (selection.evaluable[0].triggered !== true) {
    throw new Error('the engine’s triggered state must pass through unchanged');
  }
});

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

console.log(`\n================================================================`);
console.log(`MARKET FOCUS: ${passed}/${total} PASSED`);
console.log(`================================================================\n`);

if (passed !== total) {
  process.exit(1);
}
