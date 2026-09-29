import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Search, Clock, ArrowUpRight } from 'lucide-react';
import { PairIntelligence } from '../types';

interface PairsListProps {
  pairIntelligences: PairIntelligence[];
  onSelectPair: (symbol: string) => void;
}

const WATCH_TONE: Record<string, string> = {
  PRIMARY_WATCH: '!border-teal-400/30 !bg-teal-400/[0.1] !text-teal-200',
  SECONDARY_WATCH: '!border-sky-400/25 !bg-sky-400/[0.08] !text-sky-200',
  MONITOR: '!border-white/[0.08] !bg-white/[0.03] !text-slate-300',
  WAIT: '!border-amber-400/25 !bg-amber-400/[0.07] !text-amber-200',
  INSUFFICIENT_DATA: '!border-rose-400/25 !bg-rose-400/[0.07] !text-rose-200'
};

/**
 * PAIRS — the watchable universe.
 *
 * Each pair leads with its direction and the reasoning behind it. Confluence
 * and watch state remain visible, and a pair without market evidence says so
 * rather than showing a zero delta.
 */
export const PairsList: React.FC<PairsListProps> = ({ pairIntelligences, onSelectPair }) => {
  const [filter, setFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'CONVERGENCE'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = pairIntelligences.filter((p) => {
    if (search.trim()) {
      const term = search.toUpperCase();
      if (
        !p.pair.symbol.includes(term) &&
        !p.baseCurrency.code.includes(term) &&
        !p.quoteCurrency.code.includes(term)
      ) {
        return false;
      }
    }

    if (filter === 'BULLISH') return p.orientationDirection === 'BULLISH_BASE';
    if (filter === 'BEARISH') return p.orientationDirection === 'BEARISH_BASE';
    if (filter === 'CONVERGENCE') return p.convergenceDivergence === 'CONVERGENCE';
    return true;
  });

  return (
    <section className="space-y-4">
      <div className="velqo-card flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1">
          {(['ALL', 'BULLISH', 'BEARISH', 'CONVERGENCE'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`min-h-9 shrink-0 rounded-full px-3.5 text-[0.72rem] font-semibold tracking-wide transition-colors ${
                filter === mode
                  ? 'bg-teal-400/[0.12] text-teal-200'
                  : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search a pair or currency"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search pairs"
            className="w-full rounded-full border border-white/[0.07] bg-white/[0.03] py-2 pl-8 pr-3 text-[0.75rem] text-slate-200 placeholder-slate-500 focus:border-teal-400/30 focus:outline-none sm:w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => {
          const delta = item.relativeStrengthDelta;
          const isBullish = item.orientationDirection === 'BULLISH_BASE';
          const isBearish = item.orientationDirection === 'BEARISH_BASE';
          const watchState = item.structuredOpportunity?.state;

          return (
            <button
              key={item.pair.symbol}
              onClick={() => onSelectPair(item.pair.symbol)}
              className="velqo-card velqo-card-interactive flex flex-col px-4 py-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="velqo-display text-lg text-white">
                      {item.pair.symbol}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {watchState && (
                      <span className={`velqo-chip !px-1.5 !py-0 !text-[0.58rem] ${WATCH_TONE[watchState] ?? ''}`}>
                        {watchState.replace(/_/g, ' ')}
                      </span>
                    )}
                    {watchState === 'SECONDARY_WATCH' && item.structuredOpportunity?.whyThisPair?.includes('MACRO-ONLY') && (
                      <span className="velqo-chip !border-amber-400/25 !px-1.5 !py-0 !text-[0.58rem] !text-amber-200">
                        Macro only
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-[0.75rem] font-semibold ${
                      isBullish ? 'text-teal-300' : isBearish ? 'text-rose-300' : 'text-slate-400'
                    }`}
                  >
                    {isBullish && <TrendingUp className="h-3.5 w-3.5" />}
                    {isBearish && <TrendingDown className="h-3.5 w-3.5" />}
                    {isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Neutral'}
                  </span>
                  <span
                    className={`mt-0.5 block text-[0.7rem] tnum ${
                      delta === null ? 'text-amber-200/80' : 'text-slate-400'
                    }`}
                  >
                    {delta === null
                      ? `Δ unavailable${item.marketEvidenceState === 'STALE' ? ' · stale' : ''}`
                      : `Δ ${delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}%`}
                  </span>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-[0.75rem] leading-relaxed text-slate-300">
                {item.orientationExplanation}
              </p>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-[0.68rem] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-sky-300/80" />
                  {item.sessionRelevance.primarySession}
                </span>
                {item.confluence && (
                  <span className="tnum">
                    Confluence {item.confluence.confluenceScore} · {item.confluence.dataQuality}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
