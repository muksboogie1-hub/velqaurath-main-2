/**
 * VELQAURATH — MARKET FOCUS TYPES
 *
 * MarketFocus is a *presentation and sequencing* layer. It owns no new
 * intelligence of its own: every field below is a projection of an existing
 * source of truth (PairIntelligence, StructuredOpportunity, StructuredThesis,
 * StructuredInvalidationCondition, CatalystEvent, WatchWindow).
 *
 * Rules enforced by this contract:
 * - Bias is a 1:1 projection of PairIntelligence.orientationDirection. The
 *   focus layer never promotes an unconfirmed pair to a directional bias.
 * - Selection reuses OpportunityState. A pair is only ever "in focus" when the
 *   opportunity engine already holds it at PRIMARY_WATCH.
 * - Missing evidence is reported as missing, never as zero, neutral or fresh.
 */

import type {
  CatalystEvent,
  OpportunityState,
  PairOrientationDirection,
  StructuredContradiction,
  StructuredInvalidationCondition,
  ThesisStatus
} from './index';

export type FocusBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'UNCONFIRMED';

/** How the directional call was reached. Never implies more evidence than exists. */
export type FocusBiasBasis =
  | 'MARKET_CONFIRMED'
  | 'MACRO_DERIVED'
  | 'BALANCED'
  | 'NO_DIRECTIONAL_EVIDENCE';

export type FocusEvidenceAlignment =
  | 'ALIGNED'
  | 'PARTIALLY_ALIGNED'
  | 'CONFLICTED'
  | 'UNVERIFIED';

export type FocusBand = 'PRIMARY_WATCH' | 'SECONDARY_WATCH' | 'RADAR' | 'INSUFFICIENT';

export type CatalystCountdownState =
  | 'COUNTDOWN'
  | 'RELEASED'
  | 'REASSESSMENT_PENDING'
  | 'NO_TRUSTED_TIME'
  | 'PAST'
  /**
   * The source lifecycle and the scheduled timestamp disagree (for example a
   * record labelled UPCOMING whose time has already passed). The inconsistency
   * is surfaced as-is; the record is never quietly promoted to an upcoming
   * event.
   */
  | 'INCONSISTENT';

export interface FocusEvidenceItem {
  /** Which intelligence layer produced the statement. */
  layer:
    | 'MARKET'
    | 'FUNDAMENTALS'
    | 'POLICY'
    | 'EXPECTATIONS'
    | 'CATALYST'
    | 'SESSION'
    | 'CONTRADICTION'
    | 'THESIS'
    | 'DATA_QUALITY';
  text: string;
  /**
   * Whether the underlying layer was actually present when this statement was
   * produced. A statement is never attributed to a layer that was missing.
   */
  verified: boolean;
}

export interface FocusCatalyst {
  event: CatalystEvent;
  /** True when the event currency is the base or quote leg of the focus pair. */
  relatesToPair: boolean;
  countdownState: CatalystCountdownState;
  /** Human countdown such as "2h 14m" or "18m". Null unless countdownState is COUNTDOWN. */
  countdownLabel: string | null;
  /** Plain-language relationship to the current bias. */
  relationship: string;
  /**
   * True only when the engine holds a verified interpretation that runs
   * against the current bias. Unknown direction never counts as a challenge.
   */
  canChallengeBias: boolean;
  challengeVerified: boolean;
}

export interface FocusChangeCondition {
  condition: StructuredInvalidationCondition;
  description: string;
  triggered: boolean;
  evaluationStatus: StructuredInvalidationCondition['evaluationStatus'];
  currentValue: string;
  triggerCondition: string;
}

export interface FocusResearchWindow {
  /** Plain-language heading, e.g. "London → New York overlap". */
  headline: string;
  /** Existing watch state, passed through unchanged. */
  watchState: string;
  detail: string;
  primarySession: string;
  window: string;
  activeOverlaps: string[];
  /** True when the window is only meaningful once the clock is connected. */
  dataAvailable: boolean;
}

export interface FocusDataQuality {
  dataQuality: string;
  freshness: string;
  thesisStatus: ThesisStatus;
  evidenceQuality: string;
  marketEvidenceState: 'AVAILABLE' | 'STALE' | 'UNAVAILABLE' | 'UNKNOWN';
  availableComponents: string[];
  missingComponents: string[];
  staleComponents: string[];
  referenceOnlyComponents: string[];
  /** Only set when a cross-asset layer genuinely exists. Currently always false. */
  crossAssetAvailable: boolean;
  crossAssetNote: string;
}

export interface FocusPair {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  band: FocusBand;
  opportunityState: OpportunityState;
  /** 1:1 projection of PairIntelligence.orientationDirection. */
  orientationDirection: PairOrientationDirection;
  bias: FocusBias;
  biasBasis: FocusBiasBasis;
  /**
   * The plain-language reading of the bias, suitable as the primary
   * presentation line ("EUR is weaker than USD by 0.13%"). It restates values
   * the engines already produced and never introduces a new calculation.
   */
  headline: string;
  confluenceScore: number | null;
  directionalConfidence: string;
  evidenceAlignment: FocusEvidenceAlignment;
  relativeStrengthDelta: number | null;
  stateReason: string;
  dataQuality: FocusDataQuality;
}

/**
 * A single verified macro observation behind the basket reading.
 *
 * Only observations that are present, source-identified and live reach this
 * type. No forecast is invented and no surprise is computed without a verified
 * consensus baseline.
 */
export interface FocusMacroObservation {
  indicator: string;
  category: string;
  actual: number;
  previous: number | null;
  forecast: number | null;
  unit: string;
  releaseDate: string | null;
}

/**
 * Where the live basket stands, and what is actually behind it.
 *
 * This is the answer to "what changed", and it is deliberately split so the
 * user can tell measurement from reading. Nothing here is inferred from a
 * layer that is missing.
 */
export interface FocusBasketStanding {
  /** The strongest currency with a verified market value, if any. */
  leader: { code: string; strength: number; classification: string } | null;
  /** The weakest currency with a verified market value, if any. */
  laggard: { code: string; strength: number; classification: string } | null;
  /** How many currencies carried a usable market value. */
  currenciesWithEvidence: number;
  /** How many currencies were assessed at all. */
  currenciesAssessed: number;
  /** The plain-language reading of the basket. */
  statement: string;
  /** Measured market movement for the leader, in the provider's own units. */
  observed: { code: string; strength: number; classification: string; contributors: number } | null;
  /** Verified live macro observations for the leader, named individually. */
  macroContext: FocusMacroObservation[];
  /** What VELQAURATH reads from the above. Never presented as a raw fact. */
  reading: string;
  /** Which layers support the reading. */
  supportedBy: string[];
  /** Which layers are missing, stale or reference-only. */
  incomplete: string[];
}

export interface MarketFocus {
  /** Where the live basket stands — the answer to "what changed". */
  basket: FocusBasketStanding;
  /** The promoted pair, or null when no pair qualifies for PRIMARY_WATCH. */
  selected: FocusPair | null;
  /** Why nothing was promoted, when selected is null. */
  noPrimaryReason: string | null;
  /**
   * The strongest pair that did not qualify for primary attention. It uses the
   * same queue ordering as the research list, so it is never a second
   * selection algorithm and never a promoted primary.
   */
  researchLead: FocusPair | null;
  /** What holds the research lead below primary, and what would change that. */
  leadReason: string | null;
  /**
   * The lead's own explanatory projection.
   *
   * The absence of a PRIMARY_WATCH pair must never cost the product its
   * reasoning. These fields are projected from exactly the same intelligence
   * that produces the selected pair's fields — no second selection, no second
   * scoring, and no promotion. They are populated only when selected is null.
   */
  leadWhy: string | null;
  leadSupportingEvidence: FocusEvidenceItem[];
  leadContradictingEvidence: FocusEvidenceItem[];
  leadChangeConditions: FocusChangeCondition[];
  leadHasVerifiedChangeConditions: boolean;
  leadResearchWindow: FocusResearchWindow | null;
  /**
   * Catalysts for the research lead's legs, projected through the same
   * verified pipeline as a promoted primary. They belong to the lead, not to a
   * promoted pair, and are only populated when no primary is selected.
   */
  leadCatalysts: FocusCatalyst[];
  leadNextCatalyst: FocusCatalyst | null;
  /** How the selected pair was chosen, when selected is not null. */
  selectionReason: string | null;
  why: string | null;
  supportingEvidence: FocusEvidenceItem[];
  contradictingEvidence: FocusEvidenceItem[];
  changeConditions: FocusChangeCondition[];
  /** True only when the engine supplied at least one structured condition. */
  hasVerifiedChangeConditions: boolean;
  catalysts: FocusCatalyst[];
  nextCatalyst: FocusCatalyst | null;
  researchWindow: FocusResearchWindow | null;
  contradictions: StructuredContradiction[];
  nextToWatch: FocusPair[];
  onTheRadar: FocusPair[];
  insufficientData: FocusPair[];
  /** Counts across the canonical universe, for an honest queue summary. */
  queueSummary: {
    total: number;
    primaryWatch: number;
    secondaryWatch: number;
    /** OpportunityState MONITOR. */
    monitor: number;
    /** OpportunityState WAIT. */
    wait: number;
    insufficientData: number;
  };
  generatedAt: string;
}
