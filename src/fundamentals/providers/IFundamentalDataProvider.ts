/**
 * VELQOARATH — Fundamental Data Provider Interface
 *
 * Pluggable provider interface separating fundamental data acquisition
 * from the deterministic intelligence and expectations engines.
 */

import {
  FundamentalCategory,
  FundamentalDataStatus,
  FundamentalObservation,
  CentralBankProfile
} from '../../types/fundamentals';
import { EconomicEvent } from '../../types';

export interface FundamentalProviderStatus {
  providerName: string;
  isConfigured: boolean;
  health: FundamentalDataStatus;
  categoriesAvailable: FundamentalCategory[];
  currenciesAvailable: string[];
  lastFetchedAt: string | null;
  message: string;
}

export interface IFundamentalDataProvider {
  readonly name: string;
  getStatus(): FundamentalProviderStatus;
  getObservations(
    currency?: string,
    category?: FundamentalCategory
  ): Promise<FundamentalObservation[]>;
  getCentralBankProfile(currency: string): Promise<CentralBankProfile | null>;
  getAllCentralBankProfiles(): Promise<CentralBankProfile[]>;
  getEconomicCalendar(currency?: string): Promise<EconomicEvent[]>;
}
