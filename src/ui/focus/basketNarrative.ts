import type { CurrencyFundamentalIntelligence } from '../../types';
import type { FocusBasketStanding } from '../../types/focus';

export interface BasketNarrative {
  /** The plain reading of the basket — the answer to "what changed". */
  statement: string;
  /** Only the layers that actually carry a value for the leading currency. */
  supportedBy: string[];
  /** Only the layers that are genuinely missing, stale or reference-only. */
  incomplete: string[];
}

function isLiveCounted(availability?: string, provenance?: string, count = 0): boolean {
  return (
    count > 0 &&
    (availability === 'AVAILABLE' || availability === 'PARTIAL') &&
    provenance === 'LIVE'
  );
}

/**
 * Composes the "what changed" narrative from evidence that already exists.
 *
 * Every clause is conditional on a layer actually being present. A currency
 * with no live macro observation is never described as macro-supported, and
 * reference policy context is always named as reference context rather than
 * being presented as confirmation.
 */
export function deriveBasketNarrative(
  basket: FocusBasketStanding | null | undefined,
  intelligence: CurrencyFundamentalIntelligence[]
): BasketNarrative {
  if (!basket || !basket.leader) {
    return {
      statement:
        basket?.statement ??
        'No currency carries a verified market value in the current basket.',
      supportedBy: [],
      incomplete: ['Live market evidence is unavailable']
    };
  }

  const code = basket.leader.code.toUpperCase();
  const leader = intelligence.find(
    (item) => item.currency.code.toUpperCase() === code
  );

  const supportedBy: string[] = [
    `current market strength across ${basket.currenciesWithEvidence} of ${basket.currenciesAssessed} currencies`
  ];
  const incomplete: string[] = [];

  const market = leader?.evidenceAssessment?.market;
  if (isLiveCounted(market?.availability, market?.provenance, market?.evidenceCount ?? 0)) {
    supportedBy.push(
      `live market evidence for ${basket.leader.code} across ${market?.evidenceCount} pairs`
    );
  }

  const fundamentals = leader?.evidenceAssessment?.fundamentals;
  if (
    isLiveCounted(
      fundamentals?.availability,
      fundamentals?.provenance,
      fundamentals?.evidenceCount ?? 0
    )
  ) {
    const count = fundamentals?.evidenceCount ?? 0;
    supportedBy.push(
      `${count} live ${basket.leader.code} macro observation${count === 1 ? '' : 's'}`
    );
  } else {
    incomplete.push(`no live ${basket.leader.code} macro observation has arrived`);
  }

  const policy = leader?.evidenceAssessment?.policy;
  if (!isLiveCounted(policy?.availability, policy?.provenance, policy?.evidenceCount ?? 0)) {
    incomplete.push(
      policy?.provenance === 'REFERENCE' || policy?.provenance === 'STATIC'
        ? `${basket.leader.code} policy confirmation is reference context only`
        : `${basket.leader.code} policy confirmation is incomplete`
    );
  }

  return { statement: basket.statement, supportedBy, incomplete };
}
