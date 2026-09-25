export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'NZD';

export type PairRole = 'BASE' | 'QUOTE';

export type MarketDataHealth =
  | 'CONNECTED'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'NOT_CONFIGURED'
  | 'CONNECTING';

export type ProviderHealth = MarketDataHealth;

/**
 * Authoritative provider stream connection states.
 */
export type ProviderConnectionStatus =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

/**
 * Authoritative daily snapshot health states.
 */
export type SnapshotHealth =
  | 'FRESH'
  | 'AGING'
  | 'STALE'
  | 'UNAVAILABLE';

/**
 * Authoritative runtime feed states:
 * - CONFIGURED: Provider initialized and ready, awaiting first payload
 * - CONNECTED: Live tick stream connected and daily snapshot fresh with full 15-pair coverage
 * - DATA_AVAILABLE: Usable quotes actively available from valid REST snapshot (even if stream is disconnected/reconnecting)
 * - DEGRADED: Partial quote coverage, aging snapshot, or stream disconnected with active cached snapshot
 * - STALE: Cached snapshot has exceeded its validity window
 * - UNAVAILABLE: Zero usable quotes available
 */
export type RuntimeFeedState =
  | 'CONFIGURED'
  | 'CONNECTED'
  | 'DATA_AVAILABLE'
  | 'DEGRADED'
  | 'STALE'
  | 'UNAVAILABLE';

export type StreamState =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'OFFLINE'
  | 'STOPPED';

export type StrengthClassification =
  | 'STRONG'
  | 'NEUTRAL'
  | 'WEAK'
  | 'DATA_UNAVAILABLE'
  | 'INSUFFICIENT_COVERAGE';

export interface MarketQuote {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  timestamp: number | null;
  interval: string;
  source: string;
  sourceStatus: 'CONNECTED' | 'DISCONNECTED' | 'STALE' | MarketDataHealth;
  fetchedAt: string;
  providerTimestamp?: string;
  receivedAt?: string;
  quoteAgeSeconds?: number;
  stale?: boolean;
  marketState?: string;
  bid?: number;
  ask?: number;
  mid?: number;
  spread?: number;
  dailyReturnPercent?: number | null; // Preserved daily return distinct from live tick change
  snapshotTimestamp?: string;
  snapshotAgeSeconds?: number;
}

export interface PairContribution {
  pairSymbol: string;
  pairReturnPercent: number;
  role: PairRole;
  signedContribution: number;
  timestamp: number;
}

export interface CurrencyCoverageInfo {
  available: number;
  required: number;
  percent: number;
  missingPairs?: string[];
  validPairs?: string[];
  stalePairs?: string[];
  status?: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';
}

export interface CurrencyMarketStrength {
  currency: string;
  marketStrength: number | null; // Basket-relative percentage movement in percentage points (e.g. +0.21 = +0.21%)
  classification: StrengthClassification;
  dailyMovementPercent: number | null; // Raw average daily return across currency's valid basket pairs
  basketRelativeMovementPercent: number | null; // Basket-relative movement (avgReturn - basketMean)
  rawRelativeReturn: number | null; // Preserved for compatibility (= basketRelativeMovementPercent)
  avgReturn: number | null; // Preserved for compatibility (= dailyMovementPercent)
  momentum: number | null;
  coverage: CurrencyCoverageInfo;
  contributors: PairContribution[];
  explanation: string;
  calculatedAt: string;
  providerStatus: MarketDataHealth | string;
  source: string;
  basketMean?: number;
  scaledScore?: number;
}

export interface ProviderStatus {
  providerName: string;
  activeProvider: string;
  health: MarketDataHealth;
  connectionStatus?: ProviderConnectionStatus;
  snapshotHealth?: SnapshotHealth;
  runtimeFeedState?: RuntimeFeedState;
  quoteCoverage?: {
    available: number;
    required: number;
    ratio: string;
  };
  strengthAvailability?: {
    available: number;
    total: number;
    ratio: string;
  };
  streamState: StreamState;
  message: string;
  lastFetchedAt: string | null;
  lastSuccessfulUpdate?: string | null;
  lastSuccessfulSnapshotAt?: string | null;
  lastAttemptAt?: string | null;
  nextRefreshAt?: string | null;
  quotesCount: number;
  requiredPairsCount: number;
  availablePairsCount: number;
  missingPairs: string[];
  stalePairs: string[];
  oldestQuoteAge: number | null;
  cacheExpiresAt: string | null;
  isConfigured: boolean;
  source: string;
  fallbackAvailable?: boolean;
  fallbackStatus?: string;
  refreshIntervalMs?: number;
}

export interface MarketCoverageReport {
  overallHealth: MarketDataHealth;
  totalRequiredPairs: number;
  availablePairs: number;
  missingPairs: string[];
  currencyCoverage: Record<string, CurrencyCoverageInfo>;
  generatedAt: string;
}

export interface CacheInfo {
  hasData: boolean;
  isExpired: boolean;
  cachedAt: string | null;
  expiresAt: string | null;
  count: number;
}

export interface StrengthThresholds {
  strongThreshold: number;
  weakThreshold: number;
}

export interface StrengthEngineOptions {
  currencies?: string[];
  requiredPairs?: string[];
  scaleFactor?: number;
  minCoverageThreshold?: number; // Minimum coverage ratio required (e.g. 0.5 = 50%)
  providerStatus?: MarketDataHealth | string;
  providerSource?: string;
  snapshotHealth?: SnapshotHealth | string;
}
