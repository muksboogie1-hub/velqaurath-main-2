/**
 * VELQOARATH — LIVE POLICY EVIDENCE DERIVATION
 *
 * Establishes whether a currency has CURRENT, VERIFIED central-bank policy
 * evidence, and what that evidence actually is.
 *
 * EVIDENCE INTEGRITY RULES:
 * - REFERENCE / STATIC central-bank benchmarks are contextual only and never
 *   become live policy evidence.
 * - A live policy rate may also be established from a verified, source-bound,
 *   current monetary-policy RELEASE (for example a delivered rate decision)
 *   published by the live fundamental feed.
 * - Missing policy evidence stays missing. It is never converted into 0%,
 *   a NEUTRAL stance, or a fabricated timestamp.
 * - The stance derived from a release reflects only the observed direction of
 *   the decision. When the direction cannot be established from the release it
 *   stays UNAVAILABLE rather than defaulting to a manufactured NEUTRAL.
 */

import { FundamentalObservation } from '../../types/fundamentals';
import { CentralBankStance, CentralBank, EconomicObservation } from '../../types';

export type LivePolicyDirection = 'HIKING' | 'CUTTING' | 'HOLDING' | 'UNAVAILABLE';
export type LivePolicyAvailability = 'AVAILABLE' | 'UNAVAILABLE';
export type LivePolicyFreshness = 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';

export interface LivePolicyEvidence {
  currency: string;
  institution: string;
  availability: LivePolicyAvailability;
  provenance: 'LIVE' | 'UNAVAILABLE';
  freshness: LivePolicyFreshness;
  policyRate: number | null;
  previousPolicyRate: number | null;
  direction: LivePolicyDirection;
  stance: CentralBankStance;
  effectiveAt: string | null;
  source: string | null;
  sourceUrl: string | null;
  fetchedAt: string | null;
  evidenceCount: number;
  reason: string;
  contextualPolicyRate: number | null;
  contextualStance: CentralBankStance;
}

type AnyObservation = (FundamentalObservation | EconomicObservation) & {
  fetchedAt?: string | null;
  freshness?: string;
  dataStatus?: string;
  provenance?: string;
  surpriseType?: string;
  sourceName?: string;
};

const POLICY_CATEGORIES = new Set([
  'CENTRAL_BANK',
  'CENTRAL_BANK_MONETARY_POLICY',
  'INTEREST_RATES',
  'MONETARY_POLICY'
]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * A policy rate is only accepted from a monetary-policy release whose reported
 * value is a plausible percentage-point level (policy rates live well below
 * 100% and are never negative).
 */
function isPlausiblePolicyRate(value: number | null | undefined): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 30;
}

function isVerifiedLiveRecord(observation: AnyObservation): boolean {
  const sourceStatus = observation.sourceStatus;
  const dataStatus = observation.dataStatus;
  const hasHttpSource = (() => {
    try {
      const url = new URL(observation.sourceUrl);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  })();

  return Boolean(
    sourceStatus === 'CONNECTED' &&
      (dataStatus === 'AVAILABLE' || dataStatus === 'LIVE') &&
      Boolean(observation.provenance) &&
      hasHttpSource &&
      isValidTimestamp(observation.fetchedAt) &&
      isValidTimestamp(observation.releaseDate) &&
      (observation.freshness === undefined ||
        observation.freshness === 'FRESH' ||
        observation.freshness === 'AGING')
  );
}

function unavailable(currency: string, institution: string, reason: string): LivePolicyEvidence {
  return {
    currency,
    institution,
    availability: 'UNAVAILABLE',
    provenance: 'UNAVAILABLE',
    freshness: 'UNAVAILABLE',
    policyRate: null,
    previousPolicyRate: null,
    direction: 'UNAVAILABLE',
    stance: 'UNAVAILABLE',
    effectiveAt: null,
    source: null,
    sourceUrl: null,
    fetchedAt: null,
    evidenceCount: 0,
    reason,
    contextualPolicyRate: null,
    contextualStance: 'UNAVAILABLE'
  };
}

/**
 * Derives current live policy evidence for a currency.
 *
 * Priority:
 * 1. A verified LIVE central-bank record supplied by the caller.
 * 2. A verified, source-bound, current monetary-policy release observation.
 */
export function deriveLivePolicyEvidence(
  currencyCode: string,
  observations: (FundamentalObservation | EconomicObservation)[],
  centralBank?: CentralBank | null,
  institution?: string
): LivePolicyEvidence {
  const code = normalizeSymbol(currencyCode);
  const institutionName =
    institution || centralBank?.institution || `Central Bank of ${code}`;

  // 1. Explicitly verified LIVE central-bank record.
  // A connection flag alone is never proof of a live policy record.
  const bankIsLive =
    centralBank?.sourceType === 'LIVE' &&
    centralBank?.dataSourceMode === 'LIVE' &&
    (centralBank?.dataStatus === 'AVAILABLE' || centralBank?.dataStatus === 'LIVE') &&
    isPlausiblePolicyRate(centralBank?.currentPolicyRate) &&
    centralBank?.stance !== 'UNAVAILABLE' &&
    (centralBank?.freshness === 'FRESH' || centralBank?.freshness === 'AGING');

  if (centralBank && bankIsLive) {
    return {
      currency: code,
      institution: centralBank.institution,
      availability: 'AVAILABLE',
      provenance: 'LIVE',
      freshness: centralBank.freshness === 'FRESH' ? 'FRESH' : 'AGING',
      policyRate: centralBank.currentPolicyRate as number,
      previousPolicyRate: isFiniteNumber(centralBank.previousPolicyRate)
        ? centralBank.previousPolicyRate
        : null,
      direction:
        centralBank.stance === 'HAWKISH'
          ? 'HIKING'
          : centralBank.stance === 'DOVISH'
          ? 'CUTTING'
          : 'HOLDING',
      stance: centralBank.stance,
      effectiveAt: centralBank.latestDecisionDate,
      source: centralBank.source || centralBank.sourceMetadata?.sourceName || null,
      sourceUrl: centralBank.sourceUrl || centralBank.sourceMetadata?.sourceUrl || null,
      fetchedAt: centralBank.fetchedTimestamp ?? centralBank.sourceMetadata?.lastUpdated ?? null,
      evidenceCount: 1,
      reason: 'Verified live central-bank policy record.',
      contextualPolicyRate: isFiniteNumber(centralBank.currentPolicyRate)
        ? centralBank.currentPolicyRate
        : null,
      contextualStance: centralBank.stance
    };
  }

  // 2. Verified, source-bound, current monetary-policy release.
  const policyRecords = (observations || [])
    .filter((observation) => normalizeSymbol(observation.currency) === code)
    .map((observation) => observation as AnyObservation)
    .filter(
      (observation) =>
        POLICY_CATEGORIES.has(String(observation.category)) &&
        isPlausiblePolicyRate(observation.actual) &&
        isVerifiedLiveRecord(observation)
    )
    .sort(
      (first, second) => Date.parse(second.releaseDate) - Date.parse(first.releaseDate)
    );

  const latest = policyRecords[0];

  if (!latest) {
    return unavailable(
      code,
      institutionName,
      'No verified current monetary-policy release is available for this currency.'
    );
  }

  const currentRate = latest.actual as number;
  const previousRate = isPlausiblePolicyRate(latest.previous) ? latest.previous : null;

  let direction: LivePolicyDirection = 'UNAVAILABLE';
  if (previousRate !== null && currentRate > previousRate) direction = 'HIKING';
  else if (previousRate !== null && currentRate < previousRate) direction = 'CUTTING';
  else if (previousRate !== null && currentRate === previousRate) direction = 'HOLDING';

  const stance: CentralBankStance =
    direction === 'HIKING'
      ? 'HAWKISH'
      : direction === 'CUTTING'
      ? 'DOVISH'
      : 'UNAVAILABLE';

  return {
    currency: code,
    institution: institutionName,
    availability: 'AVAILABLE',
    provenance: 'LIVE',
    freshness: latest.freshness === 'FRESH' ? 'FRESH' : 'AGING',
    policyRate: currentRate,
    previousPolicyRate: previousRate,
    direction,
    stance,
    effectiveAt: latest.releaseDate,
    source: latest.source || latest.sourceName || null,
    sourceUrl: latest.sourceUrl || null,
    fetchedAt: isValidTimestamp(latest.fetchedAt) ? latest.fetchedAt : null,
    evidenceCount: policyRecords.length,
    reason: `Verified monetary-policy release: ${latest.indicatorName} at ${currentRate}${
      latest.unit || '%'
    } (${latest.releaseDate}).`,
    contextualPolicyRate: currentRate,
    contextualStance: stance
  };
}

/**
 * Resolves the live policy differential between BASE and QUOTE currencies.
 * Returns null when either side is genuinely unavailable.
 */
export function evaluateLivePolicySpread(
  base: Pick<LivePolicyEvidence, 'availability' | 'policyRate'> | null | undefined,
  quote: Pick<LivePolicyEvidence, 'availability' | 'policyRate'> | null | undefined
): number | null {
  if (
    !base ||
    !quote ||
    base.availability !== 'AVAILABLE' ||
    quote.availability !== 'AVAILABLE' ||
    !isFiniteNumber(base.policyRate) ||
    !isFiniteNumber(quote.policyRate)
  ) {
    return null;
  }
  return Math.round((base.policyRate - quote.policyRate) * 100) / 100;
}
