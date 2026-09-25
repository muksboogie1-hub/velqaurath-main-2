/**
 * VELQOARATH — DATA PROVENANCE & FRESHNESS SERVICE
 *
 * Implements rigorous data provenance tracking and honest freshness evaluation.
 *
 * THRESHOLD STANDARDS:
 * 1. Live Market Quotes:
 *    - FRESH: <= 30s
 *    - AGING: <= 120s
 *    - STALE: > 120s
 * 2. Market Daily Snapshot:
 *    - FRESH: <= 10m (600s)
 *    - AGING: <= 30m (1800s)
 *    - STALE: > 30m
 * 3. Macroeconomic Observations:
 *    - FRESH: <= 24h
 *    - AGING: <= 7 days
 *    - STALE: > 7 days
 * 4. Central Bank Statements:
 *    - FRESH: <= 90 days
 *    - AGING: <= 180 days
 *    - STALE: > 180 days
 */

import {
  DataFreshnessState,
  DataProvenanceRecord,
  ProvenanceType
} from '../types/intelligence';

export class ProvenanceService {
  public static evaluateFreshness(
    timestamp: string | number | null | undefined,
    dataType: 'LIVE_QUOTE' | 'MARKET_SNAPSHOT' | 'MACRO_OBSERVATION' | 'CENTRAL_BANK' | 'CALENDAR_EVENT',
    referenceDate: Date = new Date()
  ): DataFreshnessState {
    if (!timestamp) return 'UNAVAILABLE';

    const timeMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    if (isNaN(timeMs)) return 'UNAVAILABLE';

    const ageSeconds = Math.max(0, (referenceDate.getTime() - timeMs) / 1000);

    switch (dataType) {
      case 'LIVE_QUOTE':
        if (ageSeconds <= 30) return 'FRESH';
        if (ageSeconds <= 120) return 'AGING';
        return 'STALE';

      case 'MARKET_SNAPSHOT':
        if (ageSeconds <= 600) return 'FRESH';
        if (ageSeconds <= 1800) return 'AGING';
        return 'STALE';

      case 'MACRO_OBSERVATION':
        if (ageSeconds <= 86400) return 'FRESH';
        if (ageSeconds <= 7 * 86400) return 'AGING';
        return 'STALE';

      case 'CENTRAL_BANK':
        if (ageSeconds <= 90 * 86400) return 'FRESH';
        if (ageSeconds <= 180 * 86400) return 'AGING';
        return 'STALE';

      case 'CALENDAR_EVENT':
        if (ageSeconds <= 7 * 86400) return 'FRESH';
        return 'AGING';

      default:
        return 'FRESH';
    }
  }

  public static createRecord(params: {
    source: string;
    sourceUrl?: string;
    provider: string;
    publishedAt?: string | null;
    observedAt?: string | null;
    period?: string;
    dataType: string;
    status: string;
    provenanceType: ProvenanceType;
    referenceDate?: Date;
  }): DataProvenanceRecord {
    const fetchedAt = new Date().toISOString();
    const ts = params.observedAt || params.publishedAt || fetchedAt;
    const freshness = this.evaluateFreshness(
      ts,
      params.dataType as any,
      params.referenceDate || new Date()
    );

    return {
      source: params.source,
      sourceUrl: params.sourceUrl,
      provider: params.provider,
      publishedAt: params.publishedAt,
      observedAt: params.observedAt,
      fetchedAt,
      period: params.period,
      dataType: params.dataType,
      status: params.status,
      freshness,
      provenanceType: params.provenanceType
    };
  }
}
