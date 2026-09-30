import React from 'react';
import { Telescope } from 'lucide-react';
import type { MarketFocus } from '../types/focus';
import { AlignmentChip, BiasBadge, ConfidenceChip, biasBasisNote, StateChip } from './focus/atoms';
import { ChangeConditions, DataTrust, NoPrimaryFocus, SupportingEvidence, WhyThisBias } from './focus/FocusNarrative';

interface PairInFocusCardProps {
  focus: MarketFocus | null;
  onSelectPair: (symbol: string) => void;
}

/**
 * PAIR IN FOCUS — the answer the user came for, delivered bias first.
 *
 * Every value on this card is read from the focus projection. The card does not
 * re-derive evidence, re-classify a layer or substitute a fallback chain of its
 * own; the focus engine has already projected the existing intelligence and
 * recorded which layers were genuinely present.
 *
 * The order is deliberate: what the view is, why, what supports it, what
 * disagrees, what would change it, and how far that conclusion can be trusted.
 */
export const PairInFocusCard: React.FC<PairInFocusCardProps> = ({
  focus,
  onSelectPair
}) => {
  const selected = focus?.selected ?? null;

  if (!focus || selected === null) {
    return (
      <section className="velqo-card overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3 sm:px-6">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
          <span className="velqo-eyebrow">Pair in focus</span>
        </div>
        <div className="px-4 py-4 sm:px-6">
          {focus ? (
            <NoPrimaryFocus
              reason={focus.noPrimaryReason}
              lead={focus.researchLead}
              leadReason={focus.leadReason}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Telescope className="h-6 w-6 text-slate-600" />
              <p className="max-w-sm text-[0.8rem] leading-relaxed text-slate-400">
                Pair intelligence has not been derived yet. Nothing is promoted to a watch state
                while the underlying layers are unavailable.
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  const { dataQuality } = selected;
  const confluence = selected.confluenceScore;
  const marketStale = dataQuality.marketEvidenceState === 'STALE';
  const marketMissing = dataQuality.marketEvidenceState !== 'AVAILABLE';

  return (
    <section className="velqo-card velqo-rise-late overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
          <span className="velqo-eyebrow">Pair in focus</span>
          <StateChip state={selected.opportunityState} />
        </div>
        <button
          onClick={() => onSelectPair(selected.symbol)}
          className="rounded-full px-2 py-1 text-[0.7rem] font-medium text-teal-300 transition-colors hover:bg-teal-400/10"
        >
          Full intelligence →
        </button>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        {/* Identity and bias — the first thing to understand. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <BiasBadge bias={selected.bias} size="lg" />
              <button
                onClick={() => onSelectPair(selected.symbol)}
                className="velqo-display text-3xl text-white transition-colors hover:text-teal-200 sm:text-4xl"
              >
                {selected.symbol}
              </button>
            </div>

            <p className="mt-3 max-w-md text-[0.9rem] font-medium leading-relaxed text-slate-100">
              {selected.headline}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span
                className={`velqo-chip ${
                  selected.biasBasis === 'MACRO_DERIVED'
                    ? '!border-amber-400/25 !text-amber-200'
                    : ''
                }`}
              >
                {biasBasisNote(selected.biasBasis)}
              </span>

              <span className="velqo-chip tnum">
                {selected.relativeStrengthDelta === null
                  ? 'Market Δ unavailable'
                  : `Δ ${selected.relativeStrengthDelta >= 0 ? '+' : ''}${selected.relativeStrengthDelta.toFixed(2)}%`}
              </span>

              {marketMissing && (
                <span
                  className={`velqo-chip ${
                    marketStale
                      ? '!border-amber-400/25 !text-amber-200'
                      : '!border-slate-500/30 !text-slate-400'
                  }`}
                >
                  {marketStale ? 'Quotes stale' : 'Quotes unavailable'}
                </span>
              )}

              <AlignmentChip alignment={selected.evidenceAlignment} />
              <ConfidenceChip confidence={selected.directionalConfidence} />
            </div>
          </div>

          {/* Confluence stays transparent without dominating the card. */}
          <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5 sm:min-w-52">
            <div className="flex items-baseline justify-between gap-3">
              <span className="velqo-eyebrow">Confluence</span>
              <span className="text-[0.7rem] text-slate-500 tnum">{dataQuality.dataQuality}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="velqo-display text-xl text-white tnum">
                {confluence === null ? '—' : confluence}
              </span>
              <span className="text-[0.7rem] text-slate-500">/ 100</span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-[width] duration-500"
                style={{ width: `${confluence === null ? 0 : Math.max(0, Math.min(100, confluence))}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.65rem] text-slate-500">
              {confluence === null
                ? 'No confluence assessment is available'
                : 'Points earned from the layers actually present'}
            </p>
          </div>
        </div>

        {focus.selectionReason && (
          <p className="mt-4 text-[0.7rem] leading-relaxed text-slate-500">
            <span className="text-slate-400">Why this pair:</span> {focus.selectionReason}
          </p>
        )}

        <div className="mt-4 space-y-3">
          <WhyThisBias why={focus.why} />
          <SupportingEvidence
            supporting={focus.supportingEvidence}
            contradicting={focus.contradictingEvidence}
          />
          <ChangeConditions
            conditions={focus.changeConditions}
            hasVerified={focus.hasVerifiedChangeConditions}
          />
          <DataTrust quality={dataQuality} />
        </div>      </div>
    </section>
  );
};
