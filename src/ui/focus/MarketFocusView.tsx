import React from 'react';
import { Telescope } from 'lucide-react';
import type { MarketFocus } from '../../types/focus';
import { ResearchQueue, TodaysCatalysts, WhenToWatch } from './FocusNarrative';

interface MarketFocusViewProps {
  focus: MarketFocus | null;
  onSelectPair: (symbol: string) => void;
}

/**
 * WHAT COMES NEXT — the research that follows the headline bias.
 *
 * The bias, the reason, the evidence and the trust state sit in the Pair in
 * Focus card above. This surface carries the rest of the analysis the user
 * would otherwise have to assemble by hand: the catalysts worth waiting on, the
 * window worth watching, and the pairs queued behind the current one.
 *
 * Nothing here is scored, re-derived or re-labelled. Every value is the
 * projection the focus engine produced from intelligence that already existed.
 */
export const MarketFocusView: React.FC<MarketFocusViewProps> = ({
  focus,
  onSelectPair
}) => {
  if (!focus) {
    return (
      <section className="velqo-card px-4 py-5 sm:px-6">
        <p className="velqo-eyebrow">What comes next</p>
        <p className="mt-2 text-[0.78rem] leading-relaxed text-slate-500">
          The research queue has not been derived yet. It appears once pair intelligence is
          available.
        </p>
      </section>
    );
  }

  const selected = focus.selected;

  return (
    <section className="velqo-card velqo-rise-late space-y-3 overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <span className="text-teal-300">
          <Telescope className="h-3.5 w-3.5" />
        </span>
        <span className="velqo-eyebrow">What comes next</span>
        <span className="ml-auto text-[0.65rem] text-slate-600 tnum">
          {focus.queueSummary.total} pairs assessed
        </span>
      </div>

      <div className="space-y-3 px-3.5 pb-4 sm:px-4 sm:pb-5">
        {selected === null ? (
          <>
            {/*
             * With no promoted primary, the lead's own verified catalyst
             * evidence is shown. It belongs to the research lead and is never
             * presented as if a pair had been promoted.
             */}
            <TodaysCatalysts
              catalysts={focus.leadCatalysts}
              leadSymbol={focus.researchLead?.symbol ?? null}
            />
            <ResearchQueue focus={focus} onSelectPair={onSelectPair} />
          </>
        ) : (
          <>
            <WhenToWatch window={focus.researchWindow} />
            <TodaysCatalysts catalysts={focus.catalysts} leadSymbol={selected.symbol} />
            <ResearchQueue focus={focus} onSelectPair={onSelectPair} />
          </>
        )}
      </div>
    </section>
  );
};
