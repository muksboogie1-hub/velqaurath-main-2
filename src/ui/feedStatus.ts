import { ProviderStatus, CurrencyFundamentalIntelligence } from '../types';
import { FundamentalProviderStatus } from '../fundamentals/providers/IFundamentalDataProvider';
import { FundamentalDatasetMode } from '../types/fundamentals';

export type FeedCondition = 'LIVE' | 'DEGRADED' | 'UNAVAILABLE';
export type EvidenceDisplayState = 'FRESH' | 'AGING' | 'STALE' | 'REFERENCE' | 'UNAVAILABLE' | 'DEGRADED';

export interface FeedStatusSummary {
  pipeline: FeedCondition;
  fundamentals: EvidenceDisplayState;
  fundamentalsCurrentCurrencies: number;
  fundamentalsStaleCurrencies: number;
  fx: EvidenceDisplayState;
  freshFxPairs: number;
  requiredFxPairs: number;
  staleFxPairs: number;
  stream: string;
}

export function deriveFeedStatus(
  market: ProviderStatus | undefined,
  fundamentals: FundamentalProviderStatus | undefined,
  datasetMode: FundamentalDatasetMode | undefined,
  intelligence: CurrencyFundamentalIntelligence[]
): FeedStatusSummary {
  const requiredFxPairs = market?.requiredPairsCount ?? market?.quoteCoverage?.required ?? 0;
  const freshFxPairs = Math.min(
    requiredFxPairs || Number.MAX_SAFE_INTEGER,
    market?.availablePairsCount ?? market?.quoteCoverage?.available ?? 0
  );
  const staleFxPairs = market?.stalePairs.length ?? 0;
  const snapshot = market?.snapshotHealth ?? 'UNAVAILABLE';
  const fx: EvidenceDisplayState =
    requiredFxPairs > 0 && freshFxPairs >= requiredFxPairs && snapshot === 'FRESH'
      ? 'FRESH'
      : freshFxPairs > 0
      ? snapshot === 'AGING'
        ? 'AGING'
        : 'DEGRADED'
      : (market?.quotesCount ?? 0) > 0 || staleFxPairs > 0
      ? 'STALE'
      : 'UNAVAILABLE';

  const currentCurrencies = intelligence.filter((item) => {
    const evidence = item.evidenceAssessment?.fundamentals;
    return Boolean(
      evidence &&
      evidence.provenance === 'LIVE' &&
      (evidence.availability === 'AVAILABLE' || evidence.availability === 'PARTIAL') &&
      (evidence.freshness === 'FRESH' || evidence.freshness === 'AGING') &&
      evidence.evidenceCount > 0
    );
  }).length;
  const staleCurrencies = intelligence.filter((item) => {
    const evidence = item.evidenceAssessment?.fundamentals;
    return Boolean(evidence && evidence.evidenceCount > 0 && evidence.freshness === 'STALE');
  }).length;

  let fundamentalState: EvidenceDisplayState = 'UNAVAILABLE';
  if (datasetMode === 'BENCHMARK' || intelligence.some((item) =>
    item.evidenceAssessment?.fundamentals.provenance === 'BENCHMARK'
  )) {
    fundamentalState = 'REFERENCE';
  } else if (currentCurrencies > 0) {
    fundamentalState = currentCurrencies === intelligence.length && staleCurrencies === 0
      ? fundamentals?.freshness === 'FRESH'
        ? 'FRESH'
        : 'DEGRADED'
      : 'DEGRADED';
  } else if (staleCurrencies > 0 || fundamentals?.isStale) {
    fundamentalState = 'STALE';
  }

  const hasAnyEvidence =
    freshFxPairs > 0 ||
    staleFxPairs > 0 ||
    currentCurrencies > 0 ||
    staleCurrencies > 0 ||
    fundamentalState === 'REFERENCE';
  const pipeline: FeedCondition =
    fx === 'FRESH' &&
    fundamentalState === 'FRESH' &&
    datasetMode === 'LIVE'
      ? 'LIVE'
      : hasAnyEvidence
      ? 'DEGRADED'
      : 'UNAVAILABLE';

  return {
    pipeline,
    fundamentals: fundamentalState,
    fundamentalsCurrentCurrencies: currentCurrencies,
    fundamentalsStaleCurrencies: staleCurrencies,
    fx,
    freshFxPairs,
    requiredFxPairs,
    staleFxPairs,
    stream: market?.connectionStatus ?? market?.streamState ?? 'UNAVAILABLE'
  };
}

export interface EvidenceCoverageNarrative {
  /** One short clause describing the market layer. */
  market: string;
  /** One short clause describing the macro layer. */
  macro: string;
  /** A single sentence combining both, derived only from recorded state. */
  sentence: string;
}

/**
 * Human-readable labels for the raw evidence states.
 *
 * The raw values are never changed or removed — they remain the truth model and
 * stay visible in the detail views, the inspector and the status surfaces. This
 * map only decides what the primary experience says, so a person reads
 * "Partial coverage" instead of "DEGRADED" while an engineer can still find the
 * exact state one disclosure away.
 */
const EVIDENCE_LABEL: Record<string, string> = {
  FRESH: 'Current',
  AGING: 'Aging',
  STALE: 'Stale',
  DEGRADED: 'Coverage needs attention',
  PARTIAL: 'Partial coverage',
  UNAVAILABLE: 'Not available',
  DATA_UNAVAILABLE: 'Not available',
  UNCLASSIFIED: 'Not classified',
  REFERENCE: 'Reference context',
  AVAILABLE: 'Present',
  LIVE: 'Live evidence',
  STATIC: 'Static reference',
  BENCHMARK: 'Benchmark reference',
  CONNECTED: 'Feed connected',
  DISCONNECTED: 'Feed disconnected',
  CONNECTING: 'Connecting',
  ERROR: 'Feed error',
  NOT_CONFIGURED: 'Not configured',
  COMPLETE: 'Complete',
  INSUFFICIENT_DATA: 'Not enough evidence',
  DATA_AVAILABLE: 'Data available'
};

export function evidenceLabel(state: string | null | undefined): string {
  if (!state) return 'Not available';
  return EVIDENCE_LABEL[state.toUpperCase()] ?? state;
}

/**
 * Turns the feed status into language a person can act on.
 *
 * The underlying states are never softened. "Partial" is used only when the
 * status is genuinely partial, and it always carries the real counts, so the
 * engineering state stays visible underneath the plain wording.
 */
export function describeEvidenceCoverage(
  summary: FeedStatusSummary,
  currencyCount: number
): EvidenceCoverageNarrative {
  const market =
    summary.fx === 'FRESH'
      ? 'Market evidence is current'
      : summary.fx === 'AGING'
      ? 'Market evidence is aging'
      : summary.fx === 'DEGRADED'
      ? 'Market coverage is partial'
      : summary.fx === 'STALE'
      ? 'Market evidence is stale'
      : 'Market evidence is unavailable';

  const currenciesWithMacro = summary.fundamentalsCurrentCurrencies;
  const totalCurrencies = Math.max(
    currencyCount,
    currenciesWithMacro + summary.fundamentalsStaleCurrencies
  );

  const macro =
    summary.fundamentals === 'FRESH'
      ? 'Macro evidence is current'
      : summary.fundamentals === 'DEGRADED'
      ? currenciesWithMacro > 0
        ? `Macro coverage is partial (${currenciesWithMacro} of ${totalCurrencies} currencies)`
        : 'Macro coverage is partial'
      : summary.fundamentals === 'REFERENCE'
      ? 'Macro evidence is reference only'
      : summary.fundamentals === 'STALE'
      ? 'Macro evidence is stale'
      : 'Macro evidence is unavailable';

  return {
    market,
    macro,
    sentence: `${market}. ${macro}.`
  };
}