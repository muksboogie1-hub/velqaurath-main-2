/**
 * VELQOARATH — CENTRAL BANK INTELLIGENCE (PHASE B)
 *
 * Structured profiles for the 8 major central banks:
 * - USD: Federal Reserve
 * - EUR: European Central Bank
 * - GBP: Bank of England
 * - JPY: Bank of Japan
 * - CHF: Swiss National Bank
 * - CAD: Bank of Canada
 * - AUD: Reserve Bank of Australia
 * - NZD: Reserve Bank of New Zealand
 *
 * Strict non-fabrication rule: If data is missing or live provider is not configured,
 * dataStatus explicitly returns NOT_CONFIGURED or UNAVAILABLE.
 */

import { CentralBankProfile, FundamentalDataStatus } from '../../types/fundamentals';
import { INITIAL_CENTRAL_BANKS } from '../../data/centralBanks';

export const CENTRAL_BANK_METADATA_MAP: Record<string, {
  institution: string;
  currency: string;
  source: string;
  sourceUrl: string;
}> = {
  USD: {
    institution: 'Federal Reserve',
    currency: 'USD',
    source: 'Federal Reserve Board of Governors',
    sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'
  },
  EUR: {
    institution: 'European Central Bank',
    currency: 'EUR',
    source: 'European Central Bank Press Office',
    sourceUrl: 'https://www.ecb.europa.eu/press/pr/date/html/index.en.html'
  },
  GBP: {
    institution: 'Bank of England',
    currency: 'GBP',
    source: 'Bank of England Monetary Policy Committee',
    sourceUrl: 'https://www.bankofengland.co.uk/monetary-policy'
  },
  JPY: {
    institution: 'Bank of Japan',
    currency: 'JPY',
    source: 'Bank of Japan Monetary Policy Releases',
    sourceUrl: 'https://www.boj.or.jp/en/mopo/index.htm'
  },
  CHF: {
    institution: 'Swiss National Bank',
    currency: 'CHF',
    source: 'Swiss National Bank Media Relations',
    sourceUrl: 'https://www.snb.ch/en/iabout/monpol'
  },
  CAD: {
    institution: 'Bank of Canada',
    currency: 'CAD',
    source: 'Bank of Canada Policy Statements',
    sourceUrl: 'https://www.bankofcanada.ca/core-functions/monetary-policy/'
  },
  AUD: {
    institution: 'Reserve Bank of Australia',
    currency: 'AUD',
    source: 'Reserve Bank of Australia Board Decisions',
    sourceUrl: 'https://www.rba.gov.au/monetary-policy/'
  },
  NZD: {
    institution: 'Reserve Bank of New Zealand',
    currency: 'NZD',
    source: 'Reserve Bank of New Zealand MPC',
    sourceUrl: 'https://www.rbnz.govt.nz/monetary-policy'
  }
};

/**
 * Maps an existing CentralBank record into the strongly-typed CentralBankProfile.
 */
export function buildCentralBankProfile(
  currencyCode: string,
  overrides?: Partial<CentralBankProfile>
): CentralBankProfile {
  const code = currencyCode.toUpperCase();
  const meta = CENTRAL_BANK_METADATA_MAP[code];

  if (!meta) {
    return {
      id: `cb-${code.toLowerCase()}`,
      bank: `Central Bank of ${code}`,
      institution: `Central Bank of ${code}`,
      currency: code,
      associatedCurrency: code,
      policyRate: null,
      currentPolicyRate: null,
      previousPolicyRate: null,
      latestDecisionDate: null,
      lastKnownPolicyEvent: null,
      nextKnownDecisionDate: null,
      stance: 'UNAVAILABLE',
      policyStance: 'UNAVAILABLE',
      policyDirection: 'UNAVAILABLE',
      stanceEvidence: [],
      guidanceSummary: null,
      latestPolicyStatement: null,
      majorRisks: [],
      source: 'Primary Central Bank',
      sourceType: 'UNAVAILABLE',
      sourceUrl: '',
      fetchedTimestamp: new Date().toISOString(),
      freshness: 'UNAVAILABLE',
      dataSourceMode: 'UNAVAILABLE',
      dataStatus: 'NOT_CONFIGURED',
      provenance: `Unconfigured central bank entity for ${code}`,
      ...overrides
    };
  }

  const existing = INITIAL_CENTRAL_BANKS.find(
    (cb) => cb.associatedCurrency.toUpperCase() === code
  );

  if (!existing) {
    return {
      id: `cb-${code.toLowerCase()}`,
      bank: meta.institution,
      institution: meta.institution,
      currency: code,
      associatedCurrency: code,
      policyRate: null,
      currentPolicyRate: null,
      previousPolicyRate: null,
      latestDecisionDate: null,
      lastKnownPolicyEvent: null,
      nextKnownDecisionDate: null,
      stance: 'UNAVAILABLE',
      policyStance: 'UNAVAILABLE',
      policyDirection: 'UNAVAILABLE',
      stanceEvidence: [],
      guidanceSummary: null,
      latestPolicyStatement: null,
      majorRisks: [],
      source: meta.source,
      sourceType: 'UNAVAILABLE',
      sourceUrl: meta.sourceUrl,
      fetchedTimestamp: new Date().toISOString(),
      freshness: 'UNAVAILABLE',
      dataSourceMode: 'UNAVAILABLE',
      dataStatus: 'UNAVAILABLE',
      provenance: `No active official policy record found for ${meta.institution}`,
      ...overrides
    };
  }

  const dataStatus: FundamentalDataStatus =
    existing.sourceMetadata.status === 'CONNECTED' ? 'AVAILABLE' : 'NOT_CONFIGURED';

  let policyDirection: 'HIKING' | 'CUTTING' | 'HOLDING' | 'UNAVAILABLE' = 'HOLDING';
  if (existing.currentPolicyRate !== null && existing.previousPolicyRate !== null) {
    if (existing.currentPolicyRate > existing.previousPolicyRate) {
      policyDirection = 'HIKING';
    } else if (existing.currentPolicyRate < existing.previousPolicyRate) {
      policyDirection = 'CUTTING';
    } else {
      policyDirection = 'HOLDING';
    }
  } else {
    policyDirection = 'UNAVAILABLE';
  }

  const sourceType = overrides?.sourceType ?? 'REFERENCE';
  const dataSourceMode = overrides?.dataSourceMode ?? (sourceType === 'LIVE' ? 'LIVE' : 'REFERENCE');
  const freshness =
    overrides?.freshness ??
    (sourceType === 'LIVE' ? 'FRESH' : sourceType === 'REFERENCE' ? 'STALE' : 'UNAVAILABLE');

  const provenance =
    overrides?.provenance ??
    (sourceType === 'LIVE'
      ? `Live official policy decision wire from ${existing.institution}`
      : sourceType === 'REFERENCE'
      ? `Official policy benchmark & archive from ${existing.institution} (REFERENCE - historical context)`
      : sourceType === 'STATIC'
      ? `Static historical policy benchmark for ${existing.institution} (STATIC)`
      : `No authenticated policy release record for ${existing.institution} (UNAVAILABLE)`);

  return {
    id: existing.id,
    bank: existing.institution,
    institution: existing.institution,
    currency: code,
    associatedCurrency: code,
    policyRate: existing.currentPolicyRate,
    currentPolicyRate: existing.currentPolicyRate,
    previousPolicyRate: existing.previousPolicyRate,
    latestDecisionDate: existing.latestDecisionDate,
    lastKnownPolicyEvent: existing.latestDecisionDate,
    nextKnownDecisionDate: existing.nextKnownDecisionDate,
    stance: existing.stance,
    policyStance: existing.stance,
    policyDirection,
    stanceEvidence: existing.stanceEvidence,
    guidanceSummary: existing.guidanceSummary,
    latestPolicyStatement: existing.guidanceSummary,
    majorRisks: existing.majorRisks,
    source: existing.sourceMetadata.sourceName || meta.source,
    sourceType,
    sourceUrl: existing.sourceMetadata.sourceUrl || meta.sourceUrl,
    fetchedTimestamp: existing.sourceMetadata.lastUpdated || new Date().toISOString(),
    freshness,
    dataSourceMode,
    dataStatus,
    provenance,
    ...overrides
  };
}

/**
 * Retrieves all 8 core central bank profiles.
 */
export function getAllCoreCentralBankProfiles(): CentralBankProfile[] {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
  return currencies.map((c) => buildCentralBankProfile(c));
}
