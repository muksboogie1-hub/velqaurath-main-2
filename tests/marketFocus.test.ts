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
  deriveBias,
  deriveDataQuality,
  isLayerVerified,
  selectNextCatalyst,
  verifiedEvidenceLayers
} from '../src/engines/focus/marketFocus';

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
  if (!focus.noPrimaryReason || !focus.noPrimaryReason.includes('PRIMARY_WATCH')) {
    throw new Error('the reason must name the missing watch state');
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
 * Summary
 * ------------------------------------------------------------------ */

console.log(`\n================================================================`);
console.log(`MARKET FOCUS: ${passed}/${total} PASSED`);
console.log(`================================================================\n`);

if (passed !== total) {
  process.exit(1);
}
