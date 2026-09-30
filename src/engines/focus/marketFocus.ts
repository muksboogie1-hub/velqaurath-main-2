/**
 * VELQAURATH — MARKET FOCUS DERIVATION
 *
 * This module is deliberately NOT an engine. It performs no scoring, awards no
 * points and invents no evidence. It sequences and explains intelligence that
 * already exists:
 *
 *   PairIntelligence.orientationDirection  -> Bias
 *   OpportunityEngine.structuredOpportunity -> Queue band (PRIMARY_WATCH etc.)
 *   StructuredThesis                       -> Why / supporting / disagreeing
 *   StructuredInvalidationCondition       -> "What could change this bias"
 *   CatalystEvent (catalystIntelligence)   -> "What's coming" + countdown
 *   WatchWindow + SessionRelevance        -> "When to analyse"
 *   ConfluenceAssessment components        -> Which layers were actually present
 *
 * Selection rule: a pair is only ever promoted to "Pair in focus" when the
 * opportunity engine already holds it at PRIMARY_WATCH. If no pair qualifies,
 * the product says so instead of manufacturing a winner.
 *
 * Truthfulness rules enforced here:
 * - Missing is never rendered as zero, neutral, fresh or live.
 * - A layer is only reported as verified when the engine actually weighed it.
 *   Reference-only and static context is present but is never live evidence.
 * - A catalyst whose lifecycle and timestamp disagree is reported as
 *   inconsistent rather than promoted to an upcoming event.
 */

import type {
  ConfluenceComponentAvailability,
  PairIntelligence,
  StructuredContradiction,
  StructuredInvalidationCondition
} from '../../types';
import type {
  CatalystCountdownState,
  FocusBand,
  FocusBias,
  FocusBiasBasis,
  FocusCatalyst,
  FocusChangeCondition,
  FocusDataQuality,
  FocusEvidenceAlignment,
  FocusEvidenceItem,
  FocusPair,
  FocusBasketStanding,
  FocusMacroObservation,
  FocusResearchWindow,
  MarketFocus
} from '../../types/focus';
import type { CatalystEvent, OpportunityState } from '../../types/intelligence';

export interface MarketFocusOptions {
  /** Overrides the live clock; used by deterministic tests. */
  now?: Date;
  /** Maximum entries surfaced in "On the radar" and "Waiting on evidence". */
  radarLimit?: number;
  /** Active session overlap names, projected into the research window. */
  activeOverlaps?: string[];
  /**
   * The live currency standings from the existing market strength engine. They
   * are passed in rather than recomputed so the basket reading and the market
   * layer can never disagree.
   */
  currencyStrengths?: BasketStandingInput[];
  /** Verified per-currency evidence, used to name the macro context. */
  currencyEvidence?: BasketEvidenceInput[];
}

/** The minimum the basket projection needs from the market strength engine. */
export interface BasketStandingInput {
  currency: string;
  marketStrength: number | null;
  classification: string;
  contributors?: number;
}

/** The minimum the basket projection needs to describe a currency's evidence. */
export interface BasketEvidenceInput {
  currency: string;
  marketEvidenceCount: number;
  marketProvenance: string;
  macroEvidenceCount: number;
  macroProvenance: string;
  policyAvailability: string;
  policyProvenance: string;
  /** Live, source-identified observations already verified upstream. */
  observations: FocusMacroObservation[];
}

const DEFAULT_RADAR_LIMIT = 6;

/* ------------------------------------------------------------------ *
 * EVIDENCE LAYERS
 *
 * A single map between the narrative layer a statement is filed under and
 * the confluence component that decided whether that layer was present. This
 * is how a statement avoids claiming a layer that was actually missing.
 * ------------------------------------------------------------------ */

type EvidenceLayer = FocusEvidenceItem['layer'];

const LAYER_COMPONENT: Record<EvidenceLayer, string> = {
  MARKET: 'Market Strength',
  FUNDAMENTALS: 'Fundamentals',
  POLICY: 'Policy',
  EXPECTATIONS: 'Expectations',
  CATALYST: 'Catalysts',
  SESSION: 'Session',
  CONTRADICTION: 'Contradiction',
  THESIS: 'Thesis',
  DATA_QUALITY: 'Data quality'
};

const LAYER_PROSE: Record<EvidenceLayer, string> = {
  MARKET: 'market',
  FUNDAMENTALS: 'fundamental',
  POLICY: 'policy',
  EXPECTATIONS: 'expectation',
  CATALYST: 'catalyst',
  SESSION: 'session',
  CONTRADICTION: 'conflicting-evidence',
  THESIS: 'thesis',
  DATA_QUALITY: 'data-quality'
};

/** Layers that can carry a directional claim. */
const DIRECTIONAL_LAYERS: EvidenceLayer[] = [
  'MARKET',
  'FUNDAMENTALS',
  'POLICY',
  'EXPECTATIONS'
];

function confluenceComponent(
  intelligence: PairIntelligence,
  component: string
): ConfluenceComponentAvailability | undefined {
  const components = intelligence.confluence?.components;
  if (!components) return undefined;
  const match = (
    [
      ['Market Strength', components.marketStrength],
      ['Fundamentals', components.fundamentals],
      ['Policy', components.policy],
      ['Expectations', components.expectations],
      ['Catalysts', components.catalysts],
      ['Session', components.session]
    ] as [string, { availability?: ConfluenceComponentAvailability } | undefined][]
  ).find(([name]) => name === component);
  return match?.[1]?.availability;
}

/**
 * A layer counts as live evidence only when the engine either weighed it as
 * AVAILABLE/PARTIAL, or — when no confluence verdict exists — the pair engine
 * recorded it as available. REFERENCE_ONLY and STATIC are context, not live
 * support, and never satisfy this test.
 */
export function isLayerVerified(
  intelligence: PairIntelligence,
  layer: EvidenceLayer
): boolean {
  const availability = confluenceComponent(intelligence, LAYER_COMPONENT[layer]);
  if (availability !== undefined) {
    return availability === 'AVAILABLE' || availability === 'PARTIAL';
  }

  const freshness = intelligence.evidenceFreshness;
  switch (layer) {
    case 'MARKET':
      return intelligence.marketEvidenceState === 'AVAILABLE' || freshness?.market === 'AVAILABLE';
    case 'FUNDAMENTALS':
      return freshness?.fundamental === 'AVAILABLE';
    case 'POLICY':
      return freshness?.policy === 'AVAILABLE';
    case 'CATALYST':
      return freshness?.catalysts === 'AVAILABLE';
    case 'SESSION':
      return freshness?.session === 'AVAILABLE';
    default:
      return false;
  }
}

export function verifiedEvidenceLayers(intelligence: PairIntelligence): EvidenceLayer[] {
  return (Object.keys(LAYER_COMPONENT) as EvidenceLayer[]).filter((layer) =>
    isLayerVerified(intelligence, layer)
  );
}

function describeVerifiedLayers(layers: EvidenceLayer[]): string {
  const directional = DIRECTIONAL_LAYERS.filter((layer) => layers.includes(layer));
  if (directional.length === 0) return '';
  return directional.map((layer) => LAYER_PROSE[layer]).join(' and ');
}

/* ------------------------------------------------------------------ *
 * BIAS
 * ------------------------------------------------------------------ */

interface BiasProjection {
  bias: FocusBias;
  basis: FocusBiasBasis;
}

/**
 * A strict projection of the existing orientation. There is no path here that
 * can produce a directional bias the pair engine did not already produce, and
 * no path that can turn absent evidence into a neutral read.
 */
export function deriveBias(intelligence: PairIntelligence): BiasProjection {
  const dataQuality = intelligence.confluence?.dataQuality ?? intelligence.dataQuality;

  if (
    dataQuality === 'UNAVAILABLE' ||
    intelligence.orientationDirection === 'DATA_UNAVAILABLE'
  ) {
    return { bias: 'UNCONFIRMED', basis: 'NO_DIRECTIONAL_EVIDENCE' };
  }

  const hasCurrentMarketEvidence = intelligence.marketEvidenceState === 'AVAILABLE';
  const hasVerifiableDirectionalEvidence = verifiedEvidenceLayers(intelligence).some((layer) =>
    DIRECTIONAL_LAYERS.includes(layer)
  );

  switch (intelligence.orientationDirection) {
    case 'BULLISH_BASE':
      return {
        bias: 'BULLISH',
        basis: hasCurrentMarketEvidence ? 'MARKET_CONFIRMED' : 'MACRO_DERIVED'
      };
    case 'BEARISH_BASE':
      return {
        bias: 'BEARISH',
        basis: hasCurrentMarketEvidence ? 'MARKET_CONFIRMED' : 'MACRO_DERIVED'
      };
    case 'NEUTRAL':
      // A balanced verdict is only meaningful when something was actually
      // weighed. With no verified directional layer there is no balance to
      // report, so the read stays unconfirmed instead of defaulting to neutral.
      return hasVerifiableDirectionalEvidence
        ? { bias: 'NEUTRAL', basis: 'BALANCED' }
        : { bias: 'UNCONFIRMED', basis: 'NO_DIRECTIONAL_EVIDENCE' };
    default:
      return { bias: 'UNCONFIRMED', basis: 'NO_DIRECTIONAL_EVIDENCE' };
  }
}

export function deriveEvidenceAlignment(intelligence: PairIntelligence): FocusEvidenceAlignment {
  const confluence = intelligence.confluence;
  if (!confluence || confluence.directionalConfidence === 'DATA_UNAVAILABLE') {
    return 'UNVERIFIED';
  }

  const contradictions = intelligence.structuredContradictions ?? intelligence.contradictions ?? [];
  if (contradictions.some((c) => c.severity === 'HIGH')) {
    return 'CONFLICTED';
  }

  const directional = confluence.threeDimensionalModel?.directionalEvidence;
  // An absent model is unverified. It is never read as a score of zero.
  if (!directional || typeof directional.score !== 'number' || directional.maxScore <= 0) {
    return 'UNVERIFIED';
  }

  const ratio = directional.score / directional.maxScore;
  if (ratio >= 0.75) return 'ALIGNED';
  if (ratio > 0) return 'PARTIALLY_ALIGNED';
  return 'UNVERIFIED';
}

/* ------------------------------------------------------------------ *
 * DATA QUALITY
 * ------------------------------------------------------------------ */

export function deriveDataQuality(intelligence: PairIntelligence): FocusDataQuality {
  const confluence = intelligence.confluence;
  return {
    dataQuality: confluence?.dataQuality ?? intelligence.dataQuality ?? 'UNAVAILABLE',
    freshness: intelligence.freshness ?? 'UNAVAILABLE',
    thesisStatus: intelligence.structuredThesis?.status ?? 'INSUFFICIENT_DATA',
    evidenceQuality: intelligence.structuredThesis?.evidenceQuality ?? 'UNAVAILABLE',
    marketEvidenceState: intelligence.marketEvidenceState ?? 'UNKNOWN',
    availableComponents: confluence?.availableComponents ?? [],
    missingComponents: confluence?.missingComponents ?? [],
    staleComponents: confluence?.staleComponents ?? [],
    referenceOnlyComponents: confluence?.referenceOnlyComponents ?? [],
    // No verified rates / commodities / risk-on layer exists in this
    // architecture. Reporting it as unavailable is the truthful position;
    // a missing cross-asset layer must never read as negative evidence.
    crossAssetAvailable: false,
    crossAssetNote:
      'Cross-asset confirmation unavailable — no verified rates, commodity or risk-context feed is configured.'
  };
}

/* ------------------------------------------------------------------ *
 * FOCUS PAIR
 * ------------------------------------------------------------------ */

/**
 * The plain-language reading of the bias.
 *
 * This is presentation, not a new calculation: it restates the orientation and
 * the verified differential the engines already produced, in the order the user
 * reads them. The engineering detail stays available in the supporting
 * narrative, so nothing is hidden by simplifying the headline.
 */
export function headlineFor(
  intelligence: PairIntelligence,
  bias: FocusBias,
  basis: FocusBiasBasis
): string {
  const base = intelligence.pair.baseCurrency;
  const quote = intelligence.pair.quoteCurrency;
  const delta = intelligence.relativeStrengthDelta;

  if (bias === 'UNCONFIRMED') {
    return `No verified directional view between ${base} and ${quote} yet.`;
  }

  if (bias === 'NEUTRAL') {
    return `${base} and ${quote} are currently balanced.`;
  }

  const direction = bias === 'BULLISH' ? 'stronger' : 'weaker';

  if (basis === 'MARKET_CONFIRMED' && delta !== null) {
    return `${base} is ${direction} than ${quote} by ${Math.abs(delta).toFixed(2)}%.`;
  }

  if (basis === 'MACRO_DERIVED') {
    const layers = describeVerifiedLayers(verifiedEvidenceLayers(intelligence));
    const evidence = layers ? ` on ${layers} evidence` : ' on verified macro evidence';
    return `${base} is currently favoured over ${quote}${evidence}.`;
  }

  return `${base} is currently ${direction} than ${quote} on the available evidence.`;
}

export function buildFocusPair(
  intelligence: PairIntelligence,
  band: FocusBand
): FocusPair {
  const { bias, basis } = deriveBias(intelligence);
  const opportunity = intelligence.structuredOpportunity;

  return {
    symbol: intelligence.symbol,
    baseCurrency: intelligence.pair.baseCurrency,
    quoteCurrency: intelligence.pair.quoteCurrency,
    band,
    opportunityState: opportunity?.state ?? 'INSUFFICIENT_DATA',
    orientationDirection: intelligence.orientationDirection,
    bias,
    biasBasis: basis,
    headline: headlineFor(intelligence, bias, basis),
    confluenceScore: intelligence.confluence?.confluenceScore ?? null,
    directionalConfidence:
      intelligence.confluence?.directionalConfidence ?? 'DATA_UNAVAILABLE',
    evidenceAlignment: deriveEvidenceAlignment(intelligence),
    relativeStrengthDelta: intelligence.relativeStrengthDelta,
    stateReason: opportunity?.whyThisPair ?? intelligence.orientationExplanation,
    dataQuality: deriveDataQuality(intelligence)
  };
}

/**
 * Why the research lead stopped short of primary attention, stated from the
 * evidence that is actually present. The final line always names the real
 * promotion condition rather than implying the pair is close to qualifying.
 */
function describeResearchLead(lead: PairIntelligence): string {
  const focus = buildFocusPair(lead, bandForState(lead.structuredOpportunity?.state ?? 'INSUFFICIENT_DATA'));
  const quality = focus.dataQuality;
  const parts: string[] = [];

  parts.push(
    `${focus.symbol} is held at ${focus.opportunityState}${
      focus.confluenceScore === null
        ? ' with no confluence assessment available'
        : ` on a confluence of ${focus.confluenceScore}/100`
    }.`
  );

  if (quality.missingComponents.length > 0) {
    parts.push(`${quality.missingComponents.join(', ')} evidence is missing.`);
  }
  if (quality.staleComponents.length > 0) {
    parts.push(`${quality.staleComponents.join(', ')} evidence is stale.`);
  }
  if (quality.referenceOnlyComponents.length > 0) {
    parts.push(
      `${quality.referenceOnlyComponents.join(', ')} is reference context only and earns no support.`
    );
  }
  if (quality.marketEvidenceState !== 'AVAILABLE') {
    parts.push(
      `Market evidence is ${String(quality.marketEvidenceState).toLowerCase()}, so no direction is market-confirmed.`
    );
  }

  parts.push(
    'It reaches primary attention when the opportunity engine raises it to PRIMARY_WATCH on verified evidence — not before.'
  );

  return parts.join(' ');
}

function bandForState(state: OpportunityState): FocusBand {
  switch (state) {
    case 'PRIMARY_WATCH':
      return 'PRIMARY_WATCH';
    case 'SECONDARY_WATCH':
      return 'SECONDARY_WATCH';
    case 'INSUFFICIENT_DATA':
      return 'INSUFFICIENT';
    default:
      return 'RADAR';
  }
}

/**
 * Ranking used for every queue. It reuses the existing confluence score and
 * never introduces a new composite: opportunity state is the primary key,
 * then existing confluence, then verified directional separation.
 */
function compareForQueue(a: PairIntelligence, b: PairIntelligence): number {
  const scoreA = a.confluence?.confluenceScore ?? -1;
  const scoreB = b.confluence?.confluenceScore ?? -1;
  if (scoreB !== scoreA) return scoreB - scoreA;

  const deltaA = a.relativeStrengthDelta;
  const deltaB = b.relativeStrengthDelta;
  // A missing differential must never outrank a verified one.
  const magA = deltaA === null ? -1 : Math.abs(deltaA);
  const magB = deltaB === null ? -1 : Math.abs(deltaB);
  if (magB !== magA) return magB - magA;

  const conflictsA = (a.structuredContradictions ?? a.contradictions ?? []).length;
  const conflictsB = (b.structuredContradictions ?? b.contradictions ?? []).length;
  if (conflictsA !== conflictsB) return conflictsA - conflictsB;

  return a.symbol.localeCompare(b.symbol);
}

/* ------------------------------------------------------------------ *
 * EVIDENCE
 * ------------------------------------------------------------------ */

const LAYER_PATTERNS: { layer: EvidenceLayer; patterns: RegExp[] }[] = [
  { layer: 'CONTRADICTION', patterns: [/\bconflict|\bcontradict|\bdiverg|\bdiverge|\boppos/i] },
  { layer: 'DATA_QUALITY', patterns: [/\bdata quality|\bunavailable|\bstale|\bprovenance|\bfreshness/i] },
  { layer: 'SESSION', patterns: [/\bsession\b|\bliquidity\b|\boverlap\b|\bwatch window/i] },
  { layer: 'CATALYST', patterns: [/\bcatalyst|\bevent\b|\brelease\b|\bupcoming\b|\bscheduled/i] },
  { layer: 'EXPECTATIONS', patterns: [/\bexpectation|\bforecast|\bconsensus|\bsurprise/i] },
  { layer: 'POLICY', patterns: [/\bpolicy\b|\bcarry\b|\brate\b|\bcentral bank\b|\bhawkish|\bdovish/i] },
  { layer: 'FUNDAMENTALS', patterns: [/\bfundamental|\binflation|\bgrowth\b|\bemployment|\bgdp\b|\bmacro/i] },
  {
    layer: 'MARKET',
    patterns: [
      /\bmarket\b|\bprice|\bquote|\bbasket|\brelative position|\brelative strength|\bdelta|\bΔ|\boutperform|\bunderperform/i
    ]
  }
];

function classifyLayer(text: string): EvidenceLayer {
  for (const entry of LAYER_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(text))) return entry.layer;
  }
  return 'THESIS';
}

/**
 * A statement is only marked verified when the layer it is filed under was
 * actually present. A missing layer is never used to manufacture either
 * support or contradiction.
 */
function toEvidenceItem(text: string, intelligence: PairIntelligence): FocusEvidenceItem {
  const layer = classifyLayer(text);
  return { layer, text, verified: isLayerVerified(intelligence, layer) };
}

/**
 * Supporting evidence is taken from verified engine output only. When a layer
 * was missing the engine does not emit a statement for it, and this layer does
 * not backfill one.
 */
export function collectSupportingEvidence(intelligence: PairIntelligence): FocusEvidenceItem[] {
  const thesis = intelligence.structuredThesis;
  const source = thesis?.supportingEvidence?.length
    ? thesis.supportingEvidence
    : intelligence.supportingEvidence ?? [];
  return source
    .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
    .map((text) => toEvidenceItem(text, intelligence));
}

export function collectContradictingEvidence(intelligence: PairIntelligence): FocusEvidenceItem[] {
  const thesis = intelligence.structuredThesis;
  const statements = thesis?.counterEvidence?.length
    ? thesis.counterEvidence
    : intelligence.counterEvidence?.length
    ? intelligence.counterEvidence
    : intelligence.opposingEvidence ?? [];

  const fromStatements = statements
    .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
    .map((text) => toEvidenceItem(text, intelligence));

  // A missing field is never promoted into a contradiction.
  const contradictions: StructuredContradiction[] =
    intelligence.structuredContradictions ?? intelligence.contradictions ?? [];

  const fromContradictions = contradictions.map((contradiction) => ({
    layer: 'CONTRADICTION' as EvidenceLayer,
    text: `${contradiction.category.replace(/_/g, ' ').toLowerCase()}: ${contradiction.conflictDescription}`,
    verified: true
  }));

  const seen = new Set<string>();
  return [...fromStatements, ...fromContradictions].filter((item) => {
    const key = item.text.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * WHY THIS BIAS
 * ------------------------------------------------------------------ */

function formatDelta(delta: number | null): string {
  if (delta === null) return 'unavailable';
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`;
}

/**
 * Plain-English synthesis assembled exclusively from fields the engines
 * already produced. Nothing is added that is not present upstream, and no
 * layer is named unless the engine actually weighed it.
 */
export function synthesiseWhy(
  intelligence: PairIntelligence,
  bias: FocusBias,
  basis: FocusBiasBasis
): string {
  if (bias === 'UNCONFIRMED') {
    return (
      intelligence.orientationExplanation ||
      'Current evidence does not support a directional read on this pair.'
    );
  }

  const parts: string[] = [];
  const base = intelligence.pair.baseCurrency;
  const quote = intelligence.pair.quoteCurrency;
  const delta = intelligence.relativeStrengthDelta;

  if (basis === 'MARKET_CONFIRMED' && delta !== null) {
    const direction = delta >= 0 ? 'outperforming' : 'underperforming';
    parts.push(
      `${intelligence.symbol} has a ${bias.toLowerCase()} bias because ${base} is ${direction} ${quote} by ${formatDelta(
        delta
      )} across the observed basket, and the pair engine classified that relative position as ${intelligence.orientationDirection}.`
    );
  } else if (basis === 'MACRO_DERIVED') {
    const marketNote =
      intelligence.marketEvidenceState === 'STALE'
        ? 'live market quotes are stale'
        : intelligence.marketEvidenceState === 'AVAILABLE'
        ? 'no current relative-strength differential is recorded'
        : 'live market quotes are unavailable';
    const layers = describeVerifiedLayers(verifiedEvidenceLayers(intelligence));
    const evidencePhrase = layers
      ? `verified ${layers} evidence`
      : 'the macro evidence the pair engine verified';
    parts.push(
      `${intelligence.symbol} has a ${bias.toLowerCase()} bias derived from ${evidencePhrase} rather than price, because ${marketNote}.`
    );
  } else {
    parts.push(
      `${intelligence.symbol} is classified as ${bias.toLowerCase()} on the current evidence base.`
    );
  }

  const thesisSummary = intelligence.structuredThesis?.summary;
  if (thesisSummary && thesisSummary.trim().length > 0) {
    parts.push(thesisSummary.trim());
  }

  const supporting = collectSupportingEvidence(intelligence);
  if (supporting.length === 0) {
    parts.push('No verified supporting evidence is currently recorded for this pair.');
  }

  const contradicting = collectContradictingEvidence(intelligence);
  if (contradicting.length > 0) {
    parts.push(`The main opposing factor is ${contradicting[0].text}`);
  } else {
    parts.push('No verified contradicting evidence is currently recorded for this pair.');
  }

  const quality = deriveDataQuality(intelligence);
  if (quality.missingComponents.length > 0) {
    parts.push(
      `The ${quality.missingComponents.join(', ')} layer${
        quality.missingComponents.length === 1 ? ' is' : 's are'
      } missing and ${quality.missingComponents.length === 1 ? 'earns' : 'earn'} no support.`
    );
  }

  return parts.join(' ');
}

/* ------------------------------------------------------------------ *
 * WHAT COULD CHANGE THIS BIAS
 * ------------------------------------------------------------------ */

export function collectChangeConditions(
  intelligence: PairIntelligence
): FocusChangeCondition[] {
  const structured: StructuredInvalidationCondition[] = intelligence.structuredInvalidation ?? [];
  return structured.map((condition) => ({
    condition,
    description: condition.description,
    triggered: condition.triggered,
    evaluationStatus: condition.evaluationStatus,
    currentValue: condition.currentValue,
    triggerCondition: condition.triggerCondition
  }));
}

/* ------------------------------------------------------------------ *
 * CATALYSTS
 * ------------------------------------------------------------------ */

function hasTrustedTimestamp(event: CatalystEvent): boolean {
  if (typeof event.scheduledTime !== 'string' || event.scheduledTime.length === 0) return false;
  return Number.isFinite(new Date(event.scheduledTime).getTime());
}

export function formatCountdown(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const days = Math.floor(total / (60 * 24));
  const hours = Math.floor((total % (60 * 24)) / 60);
  const mins = total % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

function resolveCountdown(
  event: CatalystEvent,
  now: Date
): { state: CatalystCountdownState; label: string | null } {
  const trusted = hasTrustedTimestamp(event);
  const minutesUntil = trusted
    ? (new Date(event.scheduledTime).getTime() - now.getTime()) / (60 * 1000)
    : null;
  const pastDated = event.isPastDated === true || (minutesUntil !== null && minutesUntil <= 0);

  switch (event.lifecycle) {
    case 'RELEASED':
      return { state: 'RELEASED', label: null };
    case 'REACTING':
      return { state: 'REASSESSMENT_PENDING', label: null };
    case 'PASSED':
    case 'STALE':
      return { state: 'PAST', label: null };
    case 'UPCOMING':
    case 'IMMINENT': {
      if (!trusted) {
        return { state: 'NO_TRUSTED_TIME', label: null };
      }
      if (pastDated) {
        // The record still claims to be upcoming, but its own timestamp has
        // passed. The disagreement is reported rather than resolved in favour
        // of "upcoming".
        return { state: 'INCONSISTENT', label: null };
      }
      return { state: 'COUNTDOWN', label: formatCountdown(minutesUntil as number) };
    }
    default:
      return { state: 'NO_TRUSTED_TIME', label: null };
  }
}

const LIFECYCLE_PRIORITY: Record<string, number> = {
  IMMINENT: 0,
  UPCOMING: 1,
  REACTING: 2,
  RELEASED: 3,
  PASSED: 4,
  STALE: 5,
  UNAVAILABLE: 6
};

const IMPORTANCE_PRIORITY: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Countdown states that represent something the user can still act on. */
const ACTIONABLE_COUNTDOWN: CatalystCountdownState[] = [
  'COUNTDOWN',
  'REASSESSMENT_PENDING',
  'RELEASED'
];

/**
 * The catalyst worth waiting on. Past, stale and unverified records are never
 * returned, so a historical event can never be presented as "next".
 */
export function selectNextCatalyst(catalysts: FocusCatalyst[]): FocusCatalyst | null {
  return catalysts.find((catalyst) => ACTIONABLE_COUNTDOWN.includes(catalyst.countdownState)) ?? null;
}

export function buildFocusCatalyst(
  event: CatalystEvent,
  baseCurrency: string,
  quoteCurrency: string,
  focusBias: FocusBias,
  now: Date
): FocusCatalyst {
  const relatesToPair = event.currency === baseCurrency || event.currency === quoteCurrency;
  const countdown = resolveCountdown(event, now);

  const opposed =
    (focusBias === 'BULLISH' && event.directionalEvidence.bias === 'BEARISH') ||
    (focusBias === 'BEARISH' && event.directionalEvidence.bias === 'BULLISH');

  const challengeVerified = opposed && event.directionalEvidence.isVerifiedInterpretation === true;

  let relationship: string;
  if (event.currency === baseCurrency) {
    relationship = `Direct ${baseCurrency} input to the base leg of ${baseCurrency}/${quoteCurrency}.`;
  } else if (event.currency === quoteCurrency) {
    relationship = `Direct ${quoteCurrency} input to the quote leg of ${baseCurrency}/${quoteCurrency}.`;
  } else {
    relationship = `No direct leg in ${baseCurrency}/${quoteCurrency}; wider ${event.currency} context only.`;
  }

  if (challengeVerified) {
    relationship += ' The verified interpretation runs against the current bias.';
  } else if (opposed) {
    relationship += ' The directional effect is not yet a verified interpretation.';
  }

  if (countdown.state === 'PAST') {
    relationship += ' This record is not an upcoming event.';
  } else if (countdown.state === 'INCONSISTENT') {
    relationship +=
      ' The source still labels this record upcoming although its scheduled time has passed, so no countdown is shown.';
  } else if (countdown.state === 'NO_TRUSTED_TIME') {
    relationship += ' The scheduled time could not be verified, so no countdown is shown.';
  }

  return {
    event,
    relatesToPair,
    countdownState: countdown.state,
    countdownLabel: countdown.label,
    relationship,
    canChallengeBias: opposed,
    challengeVerified
  };
}

/* ------------------------------------------------------------------ *
 * RESEARCH WINDOW
 * ------------------------------------------------------------------ */

const WATCH_STATE_HEADLINES: Record<string, string> = {
  ACTIVE: 'Session is active',
  UPCOMING: 'Session opening soon',
  'EVENT-SENSITIVE': 'Event-sensitive window',
  MONITORING: 'Monitoring',
  'WAITING FOR CATALYST': 'Waiting for catalyst',
  'LOW-ACTIVITY': 'Low-activity window',
  WATCH: 'Watch window',
  'DATA_UNAVAILABLE': 'Research window unavailable',
  'DATA UNAVAILABLE': 'Research window unavailable'
};

export function buildResearchWindow(
  intelligence: PairIntelligence,
  activeOverlaps: string[],
  evidenceAvailable: boolean
): FocusResearchWindow {
  const watch = intelligence.watchWindow;
  const session = intelligence.sessionRelevance;
  const watchState = watch?.watchState ?? 'DATA_UNAVAILABLE';
  const watchUnavailable = watchState === 'DATA_UNAVAILABLE' || watchState === 'DATA UNAVAILABLE';
  const dataAvailable = evidenceAvailable && !watchUnavailable;

  const primarySession = session?.primarySession || 'UNKNOWN';
  const relevantOverlaps = activeOverlaps.filter((overlap) =>
    (session?.relevantSessions ?? []).some(
      (name) => overlap.toLowerCase().includes(name.toLowerCase())
    )
  );

  let headline: string;
  if (!dataAvailable) {
    // Unavailability is never dressed up as an active window.
    headline = WATCH_STATE_HEADLINES.DATA_UNAVAILABLE;
  } else if (relevantOverlaps.length > 0) {
    headline = relevantOverlaps.join(' · ');
  } else {
    // An unmapped watch state is shown as the session it belongs to rather
    // than being assigned an invented state name.
    const stateHeadline = WATCH_STATE_HEADLINES[watchState];
    headline = stateHeadline ? `${stateHeadline} — ${primarySession}` : `${primarySession} session`;
  }

  const detailParts: string[] = [];
  if (session?.structuralRationale) detailParts.push(session.structuralRationale);
  if (watch?.rationale) detailParts.push(watch.rationale);
  if (watch?.whyThisWindowMatters) detailParts.push(watch.whyThisWindowMatters);
  if (detailParts.length === 0) {
    detailParts.push('No session rationale is currently derived for this pair.');
  }

  return {
    headline,
    watchState,
    detail: detailParts.join(' '),
    primarySession,
    window: watch?.watchWindow ?? 'Unavailable',
    activeOverlaps: relevantOverlaps,
    dataAvailable
  };
}

/* ------------------------------------------------------------------ *
 * MARKET FOCUS
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * BASKET STANDING
 * ------------------------------------------------------------------ */

function isLiveCounted(
  availability?: string,
  provenance?: string,
  count = 0
): boolean {
  return (
    count > 0 &&
    (availability === 'AVAILABLE' || availability === 'PARTIAL') &&
    provenance === 'LIVE'
  );
}

/**
 * Projects where the live basket stands, what was measured, and what VELQAURATH
 * reads from it.
 *
 * This is a reading of the market strength engine, not a second score: it only
 * ranks currencies the engine already gave a numeric value, and it never treats
 * a missing value as zero. The result is deliberately split into `observed`
 * (what the provider measured), `macroContext` (the named live observations
 * that add context) and `reading` (the product's interpretation), so the user
 * is never shown an interpretation dressed up as a raw market fact.
 */
export function deriveBasketStanding(
  strengths: BasketStandingInput[] = [],
  evidence: BasketEvidenceInput[] = []
): FocusBasketStanding {
  const usable = strengths.filter(
    (entry) =>
      entry.marketStrength !== null &&
      Number.isFinite(entry.marketStrength) &&
      entry.classification !== 'DATA_UNAVAILABLE' &&
      entry.classification !== 'INSUFFICIENT_COVERAGE'
  );

  const evidenceByCode = new Map(
    evidence.map((entry) => [entry.currency.toUpperCase(), entry])
  );

  if (usable.length === 0) {
    return {
      leader: null,
      laggard: null,
      currenciesWithEvidence: 0,
      currenciesAssessed: strengths.length,
      statement: 'No currency carries a verified market value in the current basket.',
      observed: null,
      macroContext: [],
      reading: 'Nothing is claimed while the market layer carries no verified value.',
      supportedBy: [],
      incomplete: ['Live market evidence is unavailable']
    };
  }

  const sorted = [...usable].sort(
    (a, b) => (b.marketStrength as number) - (a.marketStrength as number)
  );
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const leader = {
    code: top.currency,
    strength: top.marketStrength as number,
    classification: top.classification
  };
  const laggard = {
    code: bottom.currency,
    strength: bottom.marketStrength as number,
    classification: bottom.classification
  };

  const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`;

  const statement =
    leader.strength > 0
      ? `${leader.code} is leading the current currency basket at ${signed(
          leader.strength
        )}% relative to the basket average.`
      : `No currency is ahead of the basket average on current market evidence; ${leader.code} is the closest at ${signed(
          leader.strength
        )}%.`;

  const spreadNote =
    sorted.length > 1 && laggard.code !== leader.code
      ? ` ${laggard.code} trails at ${signed(laggard.strength)}%.`
      : '';

  /*
   * Only observations that are already source-identified and live are carried
   * through. They are named individually rather than counted, so the user can
   * see what is actually behind the reading.
   */
  const leaderEvidence = evidenceByCode.get(leader.code.toUpperCase());
  const macroContext = (leaderEvidence?.observations ?? []).filter(
    (observation) =>
      typeof observation.actual === 'number' &&
      Number.isFinite(observation.actual)
  );

  const supportedBy = [
    `current market strength across ${usable.length} of ${strengths.length} currencies`
  ];
  const incomplete: string[] = [];

  if (
    leaderEvidence &&
    isLiveCounted(
      leaderEvidence.marketProvenance === 'LIVE' ? 'AVAILABLE' : 'UNAVAILABLE',
      leaderEvidence.marketProvenance,
      leaderEvidence.marketEvidenceCount
    )
  ) {
    supportedBy.push(
      `live market evidence for ${leader.code} across ${leaderEvidence.marketEvidenceCount} pairs`
    );
  }

  if (
    macroContext.length > 0 &&
    leaderEvidence &&
    isLiveCounted('PARTIAL', leaderEvidence.macroProvenance, leaderEvidence.macroEvidenceCount)
  ) {
    supportedBy.push(
      `${macroContext.length} live ${leader.code} macro observation${
        macroContext.length === 1 ? '' : 's'
      }`
    );
  } else {
    incomplete.push(`no live ${leader.code} macro observation has arrived`);
  }

  if (
    !leaderEvidence ||
    !isLiveCounted(
      leaderEvidence.policyAvailability,
      leaderEvidence.policyProvenance,
      leaderEvidence.policyAvailability === 'AVAILABLE' ? 1 : 0
    )
  ) {
    incomplete.push(
      leaderEvidence?.policyProvenance === 'REFERENCE' ||
        leaderEvidence?.policyProvenance === 'STATIC'
        ? `${leader.code} policy confirmation is reference context only`
        : `${leader.code} policy confirmation is incomplete`
    );
  }

  /*
   * The reading states what the measured evidence shows. It deliberately does
   * not claim the macro observations caused the move — they provide context.
   */
  const reading =
    macroContext.length > 0
      ? `Market evidence currently shows ${leader.code} leading the basket. The ${macroContext.length} live ${
          macroContext.length === 1 ? 'observation adds' : 'observations add'
        } macro context; VELQAURATH does not assert they caused the move.`
      : `Market evidence currently shows ${leader.code} leading the basket. No live macro observation is available to add context.`;

  return {
    leader,
    laggard,
    currenciesWithEvidence: usable.length,
    currenciesAssessed: strengths.length,
    statement: statement + spreadNote,
    observed: {
      code: leader.code,
      strength: leader.strength,
      classification: leader.classification,
      contributors: top.contributors ?? 0
    },
    macroContext,
    reading,
    supportedBy,
    incomplete
  };
}

/**
 * The complete explanatory projection for one pair.
 *
 * Both the promoted primary and the research lead are projected through this
 * single function, from the same intelligence, with the same rules. The only
 * difference between them is the opportunity state the opportunity engine
 * already assigned — never a second selection or scoring pass.
 */
function projectExplanation(
  intelligence: PairIntelligence,
  activeOverlaps: string[],
  now: Date
): {
  bias: FocusBias;
  basis: FocusBiasBasis;
  why: string;
  supportingEvidence: FocusEvidenceItem[];
  contradictingEvidence: FocusEvidenceItem[];
  changeConditions: FocusChangeCondition[];
  hasVerifiedChangeConditions: boolean;
  researchWindow: FocusResearchWindow;
  catalysts: FocusCatalyst[];
  nextCatalyst: FocusCatalyst | null;
} {
  const { bias, basis } = deriveBias(intelligence);
  const changeConditions = collectChangeConditions(intelligence);
  const catalysts = projectCatalysts(intelligence, bias, now);

  return {
    bias,
    basis,
    why: synthesiseWhy(intelligence, bias, basis),
    supportingEvidence: collectSupportingEvidence(intelligence),
    contradictingEvidence: collectContradictingEvidence(intelligence),
    changeConditions,
    hasVerifiedChangeConditions: changeConditions.length > 0,
    researchWindow: buildResearchWindow(
      intelligence,
      activeOverlaps,
      intelligence.dataQuality !== 'UNAVAILABLE'
    ),
    catalysts,
    nextCatalyst: selectNextCatalyst(catalysts)
  };
}

/**
 * Projects the verified catalyst evidence for one pair's legs.
 *
 * The same projection is used for a promoted primary and for the research lead,
 * so the lead is never shown as having no catalysts when its legs genuinely
 * have upcoming releases.
 */
function projectCatalysts(
  intelligence: PairIntelligence,
  bias: FocusBias,
  now: Date
): FocusCatalyst[] {
  const base = intelligence.pair.baseCurrency;
  const quote = intelligence.pair.quoteCurrency;

  return (intelligence.catalystIntelligence ?? [])
    .filter((event) => event.currency === base || event.currency === quote)
    .map((event) => buildFocusCatalyst(event, base, quote, bias, now))
    .sort((a, b) => {
      const lifeA = LIFECYCLE_PRIORITY[a.event.lifecycle] ?? 9;
      const lifeB = LIFECYCLE_PRIORITY[b.event.lifecycle] ?? 9;
      if (lifeA !== lifeB) return lifeA - lifeB;

      const impA = IMPORTANCE_PRIORITY[a.event.importance] ?? 9;
      const impB = IMPORTANCE_PRIORITY[b.event.importance] ?? 9;
      if (impA !== impB) return impA - impB;

      return a.event.timeToEventMinutes - b.event.timeToEventMinutes;
    });
}

export function buildMarketFocus(
  intelligences: PairIntelligence[],
  options: MarketFocusOptions = {}
): MarketFocus {
  const now = options.now ?? new Date();
  const radarLimit = options.radarLimit ?? DEFAULT_RADAR_LIMIT;
  const activeOverlaps = options.activeOverlaps ?? [];
  const iso = now.toISOString();
  const basket = deriveBasketStanding(options.currencyStrengths ?? [], options.currencyEvidence ?? []);

  const buckets: Record<FocusBand, PairIntelligence[]> = {
    PRIMARY_WATCH: [],
    SECONDARY_WATCH: [],
    RADAR: [],
    INSUFFICIENT: []
  };

  /*
   * Counts are taken from the opportunity state itself. MONITOR and WAIT share
   * a display band, so banding them together and counting the band would report
   * the same pairs twice.
   */
  const stateCounts = {
    primaryWatch: 0,
    secondaryWatch: 0,
    monitor: 0,
    wait: 0,
    insufficientData: 0
  };

  for (const intelligence of intelligences) {
    const state: OpportunityState = intelligence.structuredOpportunity?.state ?? 'INSUFFICIENT_DATA';
    buckets[bandForState(state)].push(intelligence);
    if (state === 'PRIMARY_WATCH') stateCounts.primaryWatch += 1;
    else if (state === 'SECONDARY_WATCH') stateCounts.secondaryWatch += 1;
    else if (state === 'MONITOR') stateCounts.monitor += 1;
    else if (state === 'WAIT') stateCounts.wait += 1;
    else stateCounts.insufficientData += 1;
  }

  const queueSummary = {
    total: intelligences.length,
    ...stateCounts
  };

  for (const band of Object.keys(buckets) as FocusBand[]) {
    buckets[band].sort(compareForQueue);
  }

  const primary = buckets.PRIMARY_WATCH[0] ?? null;

  const queue = {
    nextToWatch: buckets.SECONDARY_WATCH.map((p) => buildFocusPair(p, 'SECONDARY_WATCH')),
    onTheRadar: buckets.RADAR.slice(0, radarLimit).map((p) => buildFocusPair(p, 'RADAR')),
    insufficientData: buckets.INSUFFICIENT.slice(0, radarLimit).map((p) =>
      buildFocusPair(p, 'INSUFFICIENT')
    )
  };

  if (!primary) {
    /*
     * No pair is promoted, but the research decision is still reported and the
     * lead is still explained. The lead comes from the same queue ordering used
     * everywhere else, and is projected through the same explanation function
     * as a promoted pair — so nothing is invented, nothing is promoted, and no
     * reasoning is lost just because nothing cleared the primary threshold.
     */
    const lead = buckets.SECONDARY_WATCH[0] ?? buckets.RADAR[0] ?? null;
    const reason = lead
      ? `No pair currently meets the evidence threshold for primary attention. The strongest candidate, ${lead.symbol}, is held at ${
          lead.structuredOpportunity?.state ?? 'INSUFFICIENT_DATA'
        }.`
      : 'No pair is held at a verified watch state on the current evidence, so no research lead can be named.';

    const explanation = lead
      ? projectExplanation(lead, activeOverlaps, now)
      : null;

    return {
      basket,
      selected: null,
      noPrimaryReason: reason,
      researchLead: lead
        ? buildFocusPair(lead, bandForState(lead.structuredOpportunity?.state ?? 'INSUFFICIENT_DATA'))
        : null,
      leadReason: lead ? describeResearchLead(lead) : null,
      leadWhy: explanation?.why ?? null,
      leadSupportingEvidence: explanation?.supportingEvidence ?? [],
      leadContradictingEvidence: explanation?.contradictingEvidence ?? [],
      leadChangeConditions: explanation?.changeConditions ?? [],
      leadHasVerifiedChangeConditions: explanation?.hasVerifiedChangeConditions ?? false,
      leadResearchWindow: explanation?.researchWindow ?? null,
      leadCatalysts: explanation?.catalysts ?? [],
      leadNextCatalyst: explanation?.nextCatalyst ?? null,
      selectionReason: null,
      // A lead is not a promotion, so the primary fields stay empty.
      why: null,
      supportingEvidence: [],
      contradictingEvidence: [],
      changeConditions: [],
      hasVerifiedChangeConditions: false,
      catalysts: [],
      nextCatalyst: null,
      researchWindow: null,
      contradictions: [],
      ...queue,
      queueSummary,
      generatedAt: iso
    };
  }

  const explanation = projectExplanation(primary, activeOverlaps, now);

  return {
    basket,
    selected: buildFocusPair(primary, 'PRIMARY_WATCH'),
    noPrimaryReason: null,
    researchLead: null,
    leadReason: null,
    leadWhy: null,
    leadSupportingEvidence: [],
    leadContradictingEvidence: [],
    leadChangeConditions: [],
    leadHasVerifiedChangeConditions: false,
    leadResearchWindow: null,
    leadCatalysts: [],
    leadNextCatalyst: null,
    selectionReason:
      primary.structuredOpportunity?.whyThisPair ??
      'Highest-ranked PRIMARY_WATCH opportunity on current evidence.',
    why: explanation.why,
    supportingEvidence: explanation.supportingEvidence,
    contradictingEvidence: explanation.contradictingEvidence,
    changeConditions: explanation.changeConditions,
    hasVerifiedChangeConditions: explanation.hasVerifiedChangeConditions,
    catalysts: explanation.catalysts,
    nextCatalyst: explanation.nextCatalyst,
    researchWindow: explanation.researchWindow,
    contradictions: primary.structuredContradictions ?? primary.contradictions ?? [],
    ...queue,
    queueSummary,
    generatedAt: iso
  };
}
