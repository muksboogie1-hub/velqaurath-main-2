/**
 * VELQOARATH — FUNDAMENTAL DATA SERVICE
 *
 * Singleton service orchestrating fundamental data providers:
 * - Primary Live: FinanceCalendarProvider (for live economic releases and calendar)
 * - Benchmark: VerifiedDatasetFundamentalProvider (strictly for tests/benchmark data)
 * - Adheres strictly to the NO FABRICATION rule: never labels benchmark data as LIVE.
 * - Authoritatively feeds the application globalStore upon refresh.
 */

import {
  IFundamentalDataProvider,
  FundamentalProviderStatus
} from '../providers/IFundamentalDataProvider';
import { VerifiedDatasetFundamentalProvider } from '../providers/VerifiedDatasetFundamentalProvider';
import { FinanceCalendarProvider } from '../providers/FinanceCalendarProvider';
import {
  FundamentalObservation,
  FundamentalCategory,
  CentralBankProfile,
  FundamentalDatasetMode
} from '../../types/fundamentals';
import { EconomicEvent } from '../../types';
import { globalStore } from '../../data/store';

export class FundamentalService {
  private static instance: FundamentalService;
  private liveProvider: FinanceCalendarProvider;
  private benchmarkProvider: VerifiedDatasetFundamentalProvider;
  private activeProvider: IFundamentalDataProvider;
  private datasetMode: FundamentalDatasetMode = 'LIVE';

  private constructor() {
    this.liveProvider = new FinanceCalendarProvider();
    this.benchmarkProvider = new VerifiedDatasetFundamentalProvider();

    // Default to FinanceCalendarProvider for live operation
    this.activeProvider = this.liveProvider;
    this.datasetMode = 'LIVE';
  }

  public static getInstance(): FundamentalService {
    if (!FundamentalService.instance) {
      FundamentalService.instance = new FundamentalService();
    }
    return FundamentalService.instance;
  }

  public getLiveProvider(): FinanceCalendarProvider {
    return this.liveProvider;
  }

  public getBenchmarkProvider(): VerifiedDatasetFundamentalProvider {
    return this.benchmarkProvider;
  }

  public setProvider(provider: IFundamentalDataProvider): void {
    this.activeProvider = provider;
    if (provider instanceof VerifiedDatasetFundamentalProvider || provider.mode === 'BENCHMARK') {
      this.datasetMode = 'BENCHMARK';
    } else {
      this.datasetMode = 'LIVE';
    }
  }

  public getProvider(): IFundamentalDataProvider {
    return this.activeProvider;
  }

  public getDatasetMode(): FundamentalDatasetMode {
    return this.datasetMode;
  }

  /**
   * Switches to Live provider (Finance Calendar).
   */
  public async useLiveProvider(): Promise<void> {
    this.activeProvider = this.liveProvider;
    this.datasetMode = 'LIVE';
    const status = this.liveProvider.getStatus();
    const obs = await this.liveProvider.getObservations();
    const events = await this.liveProvider.getEconomicCalendar();
    globalStore.setFundamentalData(obs as any, events, status, 'LIVE');
  }

  /**
   * Explicitly activates Benchmark mode (for tests and development).
   */
  public async useBenchmarkProvider(): Promise<void> {
    this.activeProvider = this.benchmarkProvider;
    this.datasetMode = 'BENCHMARK';
    const status = this.benchmarkProvider.getStatus();
    const obs = await this.benchmarkProvider.getObservations();
    const events = await this.benchmarkProvider.getEconomicCalendar();
    globalStore.setFundamentalData(obs as any, events, status, 'BENCHMARK');
  }

  /**
   * Refreshes fundamental data from the active provider.
   * If live refresh succeeds, updates the authoritative global store.
   * If live refresh fails, retains the last valid live dataset (if any) and updates status to DEGRADED.
   * Does NOT silently switch to benchmark data on failure.
   */
  public async refresh(force: boolean = false): Promise<boolean> {
    if (this.datasetMode === 'LIVE') {
      const success = await this.liveProvider.refresh(force);
      const status = this.liveProvider.getStatus();

      if (success) {
        const observations = await this.liveProvider.getObservations();
        const events = await this.liveProvider.getEconomicCalendar();
        globalStore.setFundamentalData(observations as any, events, status, 'LIVE');
        return true;
      } else {
        // Retain last known valid live dataset if one exists, mark degraded
        const existingObs = await this.liveProvider.getObservations();
        if (existingObs.length > 0) {
          const events = await this.liveProvider.getEconomicCalendar();
          globalStore.setFundamentalData(existingObs as any, events, status, 'LIVE');
        } else {
          globalStore.setFundamentalStatus(status);
        }
        return false;
      }
    } else {
      // Benchmark mode
      const status = this.benchmarkProvider.getStatus();
      const observations = await this.benchmarkProvider.getObservations();
      const events = await this.benchmarkProvider.getEconomicCalendar();
      globalStore.setFundamentalData(observations as any, events, status, 'BENCHMARK');
      return true;
    }
  }

  public getStatus(): FundamentalProviderStatus {
    const status = this.activeProvider.getStatus();
    return {
      ...status,
      datasetMode: this.datasetMode
    };
  }

  public async getObservations(
    currency?: string,
    category?: FundamentalCategory
  ): Promise<FundamentalObservation[]> {
    return this.activeProvider.getObservations(currency, category);
  }

  public async getCentralBankProfile(currency: string): Promise<CentralBankProfile | null> {
    return this.activeProvider.getCentralBankProfile(currency);
  }

  public async getAllCentralBankProfiles(): Promise<CentralBankProfile[]> {
    return this.activeProvider.getAllCentralBankProfiles();
  }

  public async getEconomicCalendar(currency?: string): Promise<EconomicEvent[]> {
    return this.activeProvider.getEconomicCalendar(currency);
  }
}

export const fundamentalService = FundamentalService.getInstance();
