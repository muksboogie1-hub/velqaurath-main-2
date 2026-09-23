/**
 * VELQOARATH — FUNDAMENTAL DATA SERVICE (PHASE B)
 *
 * Singleton service orchestrating fundamental data providers,
 * caching verified releases, and exposing standard query interfaces.
 */

import {
  IFundamentalDataProvider,
  FundamentalProviderStatus
} from '../providers/IFundamentalDataProvider';
import { VerifiedDatasetFundamentalProvider } from '../providers/VerifiedDatasetFundamentalProvider';
import {
  FundamentalObservation,
  FundamentalCategory,
  CentralBankProfile
} from '../../types/fundamentals';
import { EconomicEvent } from '../../types';

export class FundamentalService {
  private static instance: FundamentalService;
  private provider: IFundamentalDataProvider;

  private constructor() {
    this.provider = new VerifiedDatasetFundamentalProvider();
  }

  public static getInstance(): FundamentalService {
    if (!FundamentalService.instance) {
      FundamentalService.instance = new FundamentalService();
    }
    return FundamentalService.instance;
  }

  public setProvider(provider: IFundamentalDataProvider): void {
    this.provider = provider;
  }

  public getProvider(): IFundamentalDataProvider {
    return this.provider;
  }

  public getStatus(): FundamentalProviderStatus {
    return this.provider.getStatus();
  }

  public async getObservations(
    currency?: string,
    category?: FundamentalCategory
  ): Promise<FundamentalObservation[]> {
    return this.provider.getObservations(currency, category);
  }

  public async getCentralBankProfile(currency: string): Promise<CentralBankProfile | null> {
    return this.provider.getCentralBankProfile(currency);
  }

  public async getAllCentralBankProfiles(): Promise<CentralBankProfile[]> {
    return this.provider.getAllCentralBankProfiles();
  }

  public async getEconomicCalendar(currency?: string): Promise<EconomicEvent[]> {
    return this.provider.getEconomicCalendar(currency);
  }
}

export const fundamentalService = FundamentalService.getInstance();
