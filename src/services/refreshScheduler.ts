/**
 * VELQOARATH — AUTOMATIC DATA REFRESH SCHEDULER
 *
 * Implements server-authoritative independent background refresh lifecycles:
 * 1. Market Snapshot Refresh (~5 min): Refreshes daily basket quotes, recalculates
 *    currency strengths, and updates state without restarting server or reopening client.
 * 2. Fundamental Refresh (~15 min): Synchronizes macroeconomic calendar and releases
 *    when Finance Calendar is configured.
 * 3. Opportunity Recalculation: Recalculates pair intelligence and confluence whenever
 *    either market or fundamental data succeeds.
 *
 * STRICT GUARANTEES:
 * - Exactly one scheduler instance (singleton)
 * - No overlapping refreshes (mutex / in-flight protection)
 * - No duplicate timers
 * - Preserves last successful snapshot on failure
 * - Explicit degraded / stale detection
 * - Never fabricates market or fundamental data
 */

import { marketDataService } from '../marketData/service/marketDataService';
import { fundamentalService } from '../fundamentals/service/fundamentalService';
import { globalStore } from '../data/store';
import { MARKET_REFRESH_INTERVAL_MS, FUNDAMENTAL_REFRESH_INTERVAL_MS } from '../marketData/config';

export interface SchedulerStatus {
  market: {
    intervalMs: number;
    isRefreshing: boolean;
    lastAttemptAt: string | null;
    lastSuccessfulUpdate: string | null;
    timestamp: string | null;
    nextRefresh: string | null;
    health: string;
  };
  fundamentals: {
    intervalMs: number;
    isRefreshing: boolean;
    lastAttemptAt: string | null;
    lastSuccessfulUpdate: string | null;
    timestamp: string | null;
    nextRefresh: string | null;
    isConfigured: boolean;
    health: string;
    isStale: boolean;
  };
  opportunity: {
    calculatedAt: string | null;
    marketDataTimestamp: string | null;
    fundamentalDataTimestamp: string | null;
    dataQuality: string;
  };
}

export class RefreshScheduler {
  private static instance: RefreshScheduler | null = null;

  private marketIntervalMs: number = MARKET_REFRESH_INTERVAL_MS;
  private fundamentalIntervalMs: number = FUNDAMENTAL_REFRESH_INTERVAL_MS;

  private marketTimer: NodeJS.Timeout | null = null;
  private fundamentalTimer: NodeJS.Timeout | null = null;

  private isMarketRefreshing: boolean = false;
  private isFundamentalRefreshing: boolean = false;

  private marketDataTimestamp: string | null = null;
  private marketDataLastSuccessfulUpdate: string | null = null;
  private marketDataLastAttemptAt: string | null = null;
  private nextMarketRefresh: string | null = null;

  private fundamentalDataTimestamp: string | null = null;
  private fundamentalDataLastSuccessfulUpdate: string | null = null;
  private fundamentalDataLastAttemptAt: string | null = null;
  private nextFundamentalRefresh: string | null = null;

  private opportunityCalculatedAt: string | null = null;

  private constructor() {}

  public static getInstance(): RefreshScheduler {
    if (!RefreshScheduler.instance) {
      RefreshScheduler.instance = new RefreshScheduler();
    }
    return RefreshScheduler.instance;
  }

  /**
   * Initializes schedulers and performs startup refresh.
   * Immediately runs initial LIVE fundamental synchronization and market snapshot.
   */
  public async start(): Promise<void> {
    this.stop(); // Clear any existing timers to prevent duplicates

    // 1. Establish background interval timers first
    this.marketTimer = setInterval(() => {
      this.refreshMarketSnapshot(true).catch((err) => {
        console.error('[VELQOARATH] Background market refresh error:', err?.message || err);
      });
    }, this.marketIntervalMs);

    this.fundamentalTimer = setInterval(() => {
      this.refreshFundamentals(false).catch((err) => {
        console.error('[VELQOARATH] Background fundamental refresh error:', err?.message || err);
      });
    }, this.fundamentalIntervalMs);

    this.nextMarketRefresh = new Date(Date.now() + this.marketIntervalMs).toISOString();
    this.nextFundamentalRefresh = new Date(Date.now() + this.fundamentalIntervalMs).toISOString();

    console.log(
      `[VELQOARATH] RefreshScheduler active: Market interval ${this.marketIntervalMs / 1000}s, Fundamentals interval ${this.fundamentalIntervalMs / 1000}s`
    );

    // 2. Perform immediate startup synchronization without waiting for first interval
    // Fundamentals and Market snapshots execute concurrently so neither blocks the other
    const fundamentalStartupPromise = this.refreshFundamentals(true).catch((err) => {
      console.warn('[VELQOARATH] Initial fundamental sync error:', err?.message || err);
      return false;
    });

    const marketStartupPromise = this.refreshMarketSnapshot(true).catch((err) => {
      console.warn('[VELQOARATH] Initial market snapshot refresh error:', err?.message || err);
      return false;
    });

    try {
      await marketDataService.startLiveStream();
    } catch (err: any) {
      console.warn('[VELQOARATH] Live stream start deferred:', err?.message || err);
    }

    await Promise.allSettled([fundamentalStartupPromise, marketStartupPromise]);
  }

  public stop(): void {
    if (this.marketTimer) {
      clearInterval(this.marketTimer);
      this.marketTimer = null;
    }
    if (this.fundamentalTimer) {
      clearInterval(this.fundamentalTimer);
      this.fundamentalTimer = null;
    }
    this.nextMarketRefresh = null;
    this.nextFundamentalRefresh = null;
  }

  /**
   * Refreshes market data snapshot with strictly enforced overlap protection.
   */
  public async refreshMarketSnapshot(force: boolean = false): Promise<boolean> {
    if (this.isMarketRefreshing) {
      console.log('[VELQOARATH] Market refresh already in progress — skipping overlapping run.');
      return false;
    }

    this.isMarketRefreshing = true;
    this.marketDataLastAttemptAt = new Date().toISOString();

    try {
      const state = globalStore.getState();
      const quotes = await marketDataService.getQuotes(force);
      const strengths = await marketDataService.getCurrencyStrengths(state.thresholds, force);
      const status = marketDataService.getStatus();

      const nowIso = new Date().toISOString();
      this.marketDataLastSuccessfulUpdate = nowIso;
      this.marketDataTimestamp = nowIso;

      // Update global store
      globalStore.setMarketData(quotes, strengths, status);

      // Trigger recalculation of opportunities
      this.recalculateOpportunities();

      return true;
    } catch (err: any) {
      console.warn('[VELQOARATH] Market snapshot refresh failed:', err?.message || err);
      // Preserves existing cached quotes in global store
      return false;
    } finally {
      this.isMarketRefreshing = false;
      this.nextMarketRefresh = new Date(Date.now() + this.marketIntervalMs).toISOString();
    }
  }

  /**
   * Refreshes fundamental calendar with overlap protection.
   */
  public async refreshFundamentals(force: boolean = false): Promise<boolean> {
    if (this.isFundamentalRefreshing) {
      console.log('[VELQOARATH] Fundamental refresh already in progress — skipping overlapping run.');
      return false;
    }

    const liveProvider = fundamentalService.getLiveProvider();
    if (!liveProvider.isConfigured && fundamentalService.getDatasetMode() === 'LIVE') {
      // Honestly report not configured; do not fake live validation
      this.nextFundamentalRefresh = new Date(Date.now() + this.fundamentalIntervalMs).toISOString();
      return false;
    }

    this.isFundamentalRefreshing = true;
    this.fundamentalDataLastAttemptAt = new Date().toISOString();

    try {
      const success = await fundamentalService.refresh(force);
      if (success) {
        const nowIso = new Date().toISOString();
        this.fundamentalDataLastSuccessfulUpdate = nowIso;
        this.fundamentalDataTimestamp = nowIso;

        // Recalculate opportunities with fresh live fundamentals
        this.recalculateOpportunities();
      }
      return success;
    } catch (err: any) {
      console.warn('[VELQOARATH] Fundamental refresh failed:', err?.message || err);
      return false;
    } finally {
      this.isFundamentalRefreshing = false;
      this.nextFundamentalRefresh = new Date(Date.now() + this.fundamentalIntervalMs).toISOString();
    }
  }

  /**
   * Recalculates pair intelligence and confluence assessment across the universe.
   */
  public recalculateOpportunities(): void {
    this.opportunityCalculatedAt = new Date().toISOString();
    // Notify store subscribers of fresh intelligence
    globalStore.notify();
  }

  public getStatus(): SchedulerStatus & {
    fundamentals: {
      datasetMode?: string;
      lifecycleState?: string;
      freshness?: string;
      oldestObservationTimestamp?: string | null;
    };
  } {
    const marketStatus = marketDataService.getStatus();
    const fundStatus = fundamentalService.getStatus();

    return {
      market: {
        intervalMs: this.marketIntervalMs,
        isRefreshing: this.isMarketRefreshing,
        lastAttemptAt: this.marketDataLastAttemptAt,
        lastSuccessfulUpdate: this.marketDataLastSuccessfulUpdate,
        timestamp: this.marketDataTimestamp,
        nextRefresh: this.nextMarketRefresh,
        health: marketStatus.health
      },
      fundamentals: {
        intervalMs: this.fundamentalIntervalMs,
        isRefreshing: this.isFundamentalRefreshing,
        lastAttemptAt: this.fundamentalDataLastAttemptAt,
        lastSuccessfulUpdate: this.fundamentalDataLastSuccessfulUpdate,
        timestamp: this.fundamentalDataTimestamp,
        nextRefresh: this.nextFundamentalRefresh,
        isConfigured: fundStatus.isConfigured,
        health: fundStatus.health,
        lifecycleState: fundStatus.lifecycleState,
        datasetMode: fundStatus.datasetMode,
        freshness: fundStatus.freshness,
        oldestObservationTimestamp: fundStatus.oldestObservationTimestamp,
        isStale: (fundStatus as any).isStale ?? false
      },
      opportunity: {
        calculatedAt: this.opportunityCalculatedAt,
        marketDataTimestamp: this.marketDataTimestamp,
        fundamentalDataTimestamp: this.fundamentalDataTimestamp,
        dataQuality:
          marketStatus.health === 'CONNECTED' &&
          (fundStatus.health === 'AVAILABLE' || fundStatus.health === 'CONNECTED')
            ? 'COMPLETE'
            : marketStatus.health === 'DEGRADED' || (fundStatus as any).isStale
            ? 'DEGRADED'
            : 'PARTIAL'
      }
    };
  }

  public getMarketDataTimestamp(): string | null {
    return this.marketDataTimestamp;
  }

  public getFundamentalDataTimestamp(): string | null {
    return this.fundamentalDataTimestamp;
  }

  public getOpportunityCalculatedAt(): string | null {
    return this.opportunityCalculatedAt;
  }
}

export const refreshScheduler = RefreshScheduler.getInstance();
