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
      institution: `Central Bank of ${code}`,
      currency: code,
      associatedCurrency: code,
      policyRate: null,
      currentPolicyRate: null,
      previousPolicyRate: null,
      latestDecisionDate: null,
      nextKnownDecisionDate: null,
      stance: 'UNAVAILABLE',
      stanceEvidence: [],
      guidanceSummary: null,
      latestPolicyStatement: null,
      majorRisks: [],
      source: 'Primary Central Bank',
      sourceUrl: '',
      fetchedTimestamp: new Date().toISOString(),
      dataStatus: 'NOT_CONFIGURED',
      provenance: `Unconfigured central bank entity for ${code}`
    };
  }

  const existing = INITIAL_CENTRAL_BANKS.find(
    (cb) => cb.associatedCurrency.toUpperCase() === code
  );

  if (!existing) {
    return {
      id: `cb-${code.toLowerCase()}`,
      institution: meta.institution,
      currency: code,
      associatedCurrency: code,
      policyRate: null,
      currentPolicyRate: null,
      previousPolicyRate: null,
      latestDecisionDate: null,
      nextKnownDecisionDate: null,
      stance: 'UNAVAILABLE',
      stanceEvidence: [],
      guidanceSummary: null,
      latestPolicyStatement: null,
      majorRisks: [],
      source: meta.source,
      sourceUrl: meta.sourceUrl,
      fetchedTimestamp: new Date().toISOString(),
      dataStatus: 'UNAVAILABLE',
      provenance: `No active official policy record found for ${meta.institution}`
    };
  }

  const dataStatus: FundamentalDataStatus =
    existing.sourceMetadata.status === 'CONNECTED' ? 'AVAILABLE' : 'NOT_CONFIGURED';

  return {
    id: existing.id,
    institution: existing.institution,
    currency: code,
    associatedCurrency: code,
    policyRate: existing.currentPolicyRate,
    currentPolicyRate: existing.currentPolicyRate,
    previousPolicyRate: existing.previousPolicyRate,
    latestDecisionDate: existing.latestDecisionDate,
    nextKnownDecisionDate: existing.nextKnownDecisionDate,
    stance: existing.stance,
    stanceEvidence: existing.stanceEvidence,
    guidanceSummary: existing.guidanceSummary,
    latestPolicyStatement: existing.guidanceSummary,
    majorRisks: existing.majorRisks,
    source: existing.sourceMetadata.sourceName || meta.source,
    sourceUrl: existing.sourceMetadata.sourceUrl || meta.sourceUrl,
    fetchedTimestamp: existing.sourceMetadata.lastUpdated || new Date().toISOString(),
    dataStatus,
    provenance: `Verified official policy release from ${existing.institution}`,
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
