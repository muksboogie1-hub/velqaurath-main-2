/**
 * VELQOARATH — Fundamental Data Provider Interface
 *
 * Pluggable provider interface separating fundamental data acquisition
 * from the deterministic intelligence and expectations engines.
 */

import {
  FundamentalCategory,
  FundamentalDataStatus,
  FundamentalProviderLifecycle,
  FundamentalDatasetMode,
  FundamentalObservation,
  CentralBankProfile
} from '../../types/fundamentals';
import { EconomicEvent } from '../../types';

export interface FundamentalProviderStatus {
  providerName: string;
  isConfigured: boolean;
  health: FundamentalDataStatus | FundamentalProviderLifecycle;
  categoriesAvailable: FundamentalCategory[];
  currenciesAvailable: string[];
  lastFetchedAt: string | null;
  message: string;
  lifecycleState?: FundamentalProviderLifecycle;
  datasetMode?: FundamentalDatasetMode;
  lastSuccessfulUpdate?: string | null;
  lastAttemptAt?: string | null;
  nextRefreshAt?: string | null;
  freshness?: 'FRESH' | 'STALE' | 'DEGRADED' | 'UNAVAILABLE';
  isStale?: boolean;
  oldestObservationTimestamp?: string | null;
  count?: number;
}

export interface IFundamentalDataProvider {
  readonly name: string;
  readonly mode?: FundamentalDatasetMode;
  getStatus(): FundamentalProviderStatus;
  getObservations(
    currency?: string,
    category?: FundamentalCategory
  ): Promise<FundamentalObservation[]>;
  getCentralBankProfile(currency: string): Promise<CentralBankProfile | null>;
  getAllCentralBankProfiles(): Promise<CentralBankProfile[]>;
  getEconomicCalendar(currency?: string): Promise<EconomicEvent[]>;
}
