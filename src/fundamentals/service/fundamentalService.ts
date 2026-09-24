/**
 * VELQOARATH — FUNDAMENTAL DATA SERVICE
 *
 * Singleton service orchestrating fundamental data providers:
 * - Primary Live: FinanceCalendarProvider (for live economic releases and calendar)
 * - Benchmark: VerifiedDatasetFundamentalProvider (strictly for tests/benchmark data)
 * - Adheres strictly to the NO FABRICATION rule: never labels benchmark data as LIVE.
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
  CentralBankProfile
} from '../../types/fundamentals';
import { EconomicEvent } from '../../types';

export class FundamentalService {
  private static instance: FundamentalService;
  private liveProvider: FinanceCalendarProvider;
  private benchmarkProvider: VerifiedDatasetFundamentalProvider;
  private activeProvider: IFundamentalDataProvider;

  private constructor() {
    this.liveProvider = new FinanceCalendarProvider();
    this.benchmarkProvider = new VerifiedDatasetFundamentalProvider();

    // Default to FinanceCalendarProvider for live operation
    this.activeProvider = this.liveProvider;
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
  }

  public getProvider(): IFundamentalDataProvider {
    return this.activeProvider;
  }

  public useLiveProvider(): void {
    this.activeProvider = this.liveProvider;
  }

  public useBenchmarkProvider(): void {
    this.activeProvider = this.benchmarkProvider;
  }

  public getStatus(): FundamentalProviderStatus {
    return this.activeProvider.getStatus();
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
