import React from 'react';
import { ChevronRight, Landmark, LineChart, Scale } from 'lucide-react';
import { CurrencyFundamentalIntelligence, CurrencyState } from '../types';

interface CurrencyLandscapeProps {
  currencies: CurrencyState[];
  /**
   * The aggregated fundamental evidence per currency. The card shows the real
   * evidence state rather than a bare score, so a currency carrying live
   * observations is never presented as though nothing arrived.
   */
  intelligences: CurrencyFundamentalIntelligence[];
  onSelectCurrency: (code: string) => void;
}

/**
 * CURRENCY LANDSCAPE
 *
 * A visual read of the eight core currencies rather than a dense terminal
 * table. Every layer the matrix used to expose is still present — market
 * strength, fundamental impulse, policy posture and availability — but on
 * mobile each currency is a card with comfortable touch targets, and on larger
 * screens the same content becomes a comparative grid.
 */
export const CurrencyLandscape: React.FC<CurrencyLandscapeProps> = ({
  currencies,
  intelligences,
  onSelectCurrency
}) => {
  const evidenceByCurrency = new Map(
    intelligences.map((intelligence) => [intelligence.currency.code, intelligence])
  );

  return (
    <section className="velqo-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-6">
        <div>
          <p className="velqo-eyebrow mb-1.5">Currency landscape</p>
          <h2 className="velqo-display text-lg text-white sm:text-xl">
            Eight core currencies, one view
          </h2>
          <p className="mt-1 text-[0.72rem] leading-relaxed text-slate-500">
            Relative strength, fundamental impulse and monetary posture — with every
            unavailable layer shown as unavailable.
          </p>
        </div>
        <span className="velqo-chip">{currencies.length} tracked</span>
      </div>

      {/* Mobile: expressive cards. Desktop: comparative grid. */}
      <div className="grid gap-2.5 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-4">
        {currencies.map((currency) => {
          const marketValue = currency.marketStrength;
          const centralBank = currency.centralBank;

          const intelligence = evidenceByCurrency.get(currency.currency.code);
          const fundamentals = intelligence?.evidenceAssessment?.fundamentals;
          const fundamentalEvidenceCount = fundamentals?.evidenceCount ?? 0;
          const fundamentalAvailability = fundamentals?.availability ?? 'UNAVAILABLE';
          const hasFundamentalEvidence =
            fundamentalEvidenceCount > 0 &&
            (fundamentalAvailability === 'AVAILABLE' ||
              fundamentalAvailability === 'PARTIAL');

          /*
           * A scored fundamental impulse is only shown when the engine actually
           * produced one. Live evidence without a score is reported as evidence,
           * never converted into a number.
           */
          const fundamentalValue = hasFundamentalEvidence
            ? intelligence?.fundamentalScore ?? null
            : null;

          const fundamentalTone = hasFundamentalEvidence
            ? fundamentalValue === null
              ? 'text-teal-200/80'
              : fundamentalValue > 0.05
              ? 'text-teal-300'
              : fundamentalValue < -0.05
              ? 'text-rose-300'
              : 'text-slate-300'
            : 'text-slate-500';

          const fundamentalLabel = hasFundamentalEvidence
            ? fundamentalValue === null
              ? `${fundamentalEvidenceCount} live ${
                  fundamentalEvidenceCount === 1 ? 'observation' : 'observations'
                }`
              : `${fundamentalValue >= 0 ? '+' : ''}${fundamentalValue.toFixed(2)}`
            : 'No live observations';

          const fundamentalDetail = hasFundamentalEvidence
            ? fundamentalValue === null
              ? 'Present, not scored — no verified forecast baseline to measure a surprise against.'
              : undefined
            : 'No source-identified live observations with an actual value have arrived for this currency.';

          const isLivePolicy =
            centralBank.policyAvailability === 'AVAILABLE' &&
            centralBank.policyProvenance === 'LIVE' &&
            centralBank.currentPolicyRate !== null &&
            centralBank.currentPolicyRate !== undefined;

          const hasReferencePolicy =
            centralBank.policyAvailability === 'REFERENCE_ONLY' ||
            centralBank.sourceType === 'REFERENCE' ||
            centralBank.dataSourceMode === 'REFERENCE';

          const policyStance = isLivePolicy
            ? centralBank.stance
            : hasReferencePolicy
            ? centralBank.contextualStance
            : null;

          const policyRate = isLivePolicy
            ? centralBank.currentPolicyRate
            : hasReferencePolicy
            ? centralBank.contextualPolicyRate
            : null;

          const policyIsAvailable =
            policyStance !== null &&
            policyStance !== undefined &&
            policyStance !== 'UNAVAILABLE';

          const policyIsReference = !isLivePolicy && hasReferencePolicy;

          const coverage = currency.relativeStrengthBreakdown?.coverage;
          const coverageReduced =
            coverage && coverage.available < coverage.required;

          const marketTone =
            marketValue === null
              ? 'text-slate-500'
              : marketValue > 0
              ? 'text-teal-300'
              : marketValue < 0
              ? 'text-rose-300'
              : 'text-slate-300';

          /*
           * A visual strength rail. It encodes the real value only; it never
           * invents one, and it renders nothing when the value is null.
           */
          const railPosition =
            marketValue === null
              ? null
              : Math.max(3, Math.min(97, 50 + marketValue * 60));

          return (
            <button
              key={currency.currency.code}
              onClick={() => onSelectCurrency(currency.currency.code)}
              className="velqo-card velqo-card-interactive group flex w-full flex-col gap-3 px-3.5 py-3.5 text-left sm:px-4"
            >
              {/* Identity */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="velqo-display text-xl text-white transition-colors group-hover:text-teal-200">
                      {currency.currency.code}
                    </span>
                    {coverageReduced && (
                      <span className="text-[0.6rem] text-amber-300/80 tnum">
                        {coverage!.available}/{coverage!.required}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[0.7rem] text-slate-500">
                    {currency.currency.name}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-teal-300" />
              </div>

              {/* Market strength with rail */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <LineChart className="h-3 w-3" />
                    <span className="text-[0.65rem]">Market</span>
                  </span>
                  <span className={`text-[0.85rem] font-semibold tnum ${marketTone}`}>
                    {marketValue === null
                      ? 'Unavailable'
                      : `${marketValue >= 0 ? '+' : ''}${marketValue.toFixed(2)}%`}
                  </span>
                </div>
                <div className="relative mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  {railPosition !== null && (
                    <>
                      <span className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                      <span
                        className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full ${
                          marketValue! >= 0 ? 'bg-teal-300' : 'bg-rose-300'
                        }`}
                        style={{ left: `${railPosition}%` }}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Fundamental impulse */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Scale className="h-3 w-3" />
                    <span className="text-[0.65rem]">Fundamentals</span>
                  </span>
                  <span className={`text-[0.78rem] font-medium tnum ${fundamentalTone}`}>
                    {fundamentalLabel}
                  </span>
                </div>
                {fundamentalDetail && (
                  <p className="mt-1 text-[0.62rem] leading-relaxed text-slate-600">
                    {fundamentalDetail}
                  </p>
                )}
              </div>

              {/* Policy posture, with provenance made explicit */}
              <div className="mt-auto border-t border-white/[0.06] pt-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Landmark className="h-3 w-3" />
                    <span className="text-[0.65rem]">Policy</span>
                  </span>
                  {!policyIsAvailable ? (
                    <span className="text-[0.7rem] text-slate-500">Unavailable</span>
                  ) : (
                    <span className="flex items-baseline gap-1.5">
                      <span
                        className={`text-[0.75rem] font-medium ${
                          policyStance === 'HAWKISH'
                            ? 'text-teal-300'
                            : policyStance === 'DOVISH'
                            ? 'text-rose-300'
                            : 'text-slate-300'
                        }`}
                      >
                        {policyStance}
                      </span>
                      <span className="text-[0.68rem] text-slate-500 tnum">
                        {policyRate === null || policyRate === undefined
                          ? 'n/a'
                          : `${policyRate}%`}
                      </span>
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`velqo-chip !px-1.5 !py-0 !text-[0.58rem] ${
                      currency.marketState === 'STRONG'
                        ? '!border-teal-400/25 !text-teal-200'
                        : currency.marketState === 'WEAK'
                        ? '!border-rose-400/25 !text-rose-200'
                        : '!border-white/[0.08] !text-slate-400'
                    }`}
                  >
                    {currency.marketState.replace(/_/g, ' ')}
                  </span>

                  {isLivePolicy && (
                    <span className="velqo-chip !border-teal-400/20 !px-1.5 !py-0 !text-[0.58rem] !text-teal-300/90">
                      Live policy
                    </span>
                  )}
                  {policyIsReference && (
                    <span className="velqo-chip !border-amber-400/25 !px-1.5 !py-0 !text-[0.58rem] !text-amber-200/90">
                      Reference
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
