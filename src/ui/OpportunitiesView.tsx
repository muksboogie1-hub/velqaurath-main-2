import React, { useState } from 'react';
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  Layers,
  ChevronRight
} from 'lucide-react';
import { PairIntelligence } from '../types';

interface OpportunitiesViewProps {
  pairIntelligences: PairIntelligence[];
  onSelectPair?: (symbol: string) => void;
  onSelectCurrency?: (code: string) => void;
}

type OpportunityFilter =
  | 'ALL'
  | 'EXPANSION'
  | 'MEAN_REVERSION'
  | 'MONITOR_ONLY'
  | 'WAIT_FOR_CATALYST'
  | 'NO_SETUP'
  | 'DATA_DEFICIENT';

type StateFilter =
  | 'ALL'
  | 'PRIMARY_WATCH'
  | 'SECONDARY_WATCH'
  | 'MONITOR'
  | 'WAIT'
  | 'INSUFFICIENT_DATA';

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  pairIntelligences,
  onSelectPair,
  onSelectCurrency
}) => {
  const [filter, setFilter] = useState<OpportunityFilter>('ALL');
  const [stateFilter, setStateFilter] = useState<StateFilter>('ALL');

  const opportunities = pairIntelligences.map((p) => ({
    pairIntel: p,
    opp: p.structuredOpportunity
  }));

  const filtered = opportunities.filter(({ opp }) => {
    if (!opp) return (filter === 'ALL' || filter === 'DATA_DEFICIENT') && (stateFilter === 'ALL' || stateFilter === 'INSUFFICIENT_DATA');
    if (stateFilter !== 'ALL' && opp.state !== stateFilter) return false;
    const classification = opp.opportunityClassification || 'MONITOR_ONLY';
    if (filter !== 'ALL' && classification !== filter) return false;
    return true;
  });

  // Count per state
  const stateCounts: Record<string, number> = {
    ALL: opportunities.length,
    PRIMARY_WATCH: 0,
    SECONDARY_WATCH: 0,
    MONITOR: 0,
    WAIT: 0,
    INSUFFICIENT_DATA: 0
  };

  // Count per classification
  const counts: Record<string, number> = {
    ALL: opportunities.length,
    EXPANSION: 0,
    MEAN_REVERSION: 0,
    MONITOR_ONLY: 0,
    WAIT_FOR_CATALYST: 0,
    NO_SETUP: 0,
    DATA_DEFICIENT: 0
  };

  opportunities.forEach(({ opp }) => {
    const s = opp?.state || 'INSUFFICIENT_DATA';
    if (stateCounts[s] !== undefined) stateCounts[s]++;
    const classification = opp?.opportunityClassification || 'DATA_DEFICIENT';
    if (counts[classification] !== undefined) {
      counts[classification]++;
    }
  });

  return (
    <div className="space-y-4">
      {/* Engine Header */}
      <div className="velqo-card px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="velqo-eyebrow mb-1.5">What matters now</p>
            <h2 className="velqo-display flex items-center gap-2 text-lg text-white sm:text-xl">
              <Compass className="h-4 w-4 text-teal-300" />
              Watchlist
            </h2>
            <p className="mt-1.5 max-w-2xl text-[0.75rem] leading-relaxed text-slate-400">
              Which pairs deserve analytical attention right now — assessed on market strength,
              fundamental delta, verified policy carry, contradictions and catalyst runways.
            </p>
          </div>
          <span className="velqo-chip shrink-0 tnum">{pairIntelligences.length} pairs evaluated</span>
        </div>

        {/* Dual Filter Bar: State & Setup Classification */}
        <div className="space-y-2.5 pt-4">
          {/* Operational Watch States (Requirement 14 & 20) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="velqo-eyebrow mr-1">Watch state</span>
            {(
              [
                { id: 'ALL', label: 'All states' },
                { id: 'PRIMARY_WATCH', label: 'Primary' },
                { id: 'SECONDARY_WATCH', label: 'Secondary' },
                { id: 'MONITOR', label: 'Monitor' },
                { id: 'WAIT', label: 'Wait' },
                { id: 'INSUFFICIENT_DATA', label: 'Insufficient data' }
              ] as const
            ).map((item) => {
              const count = stateCounts[item.id] || 0;
              const isActive = stateFilter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setStateFilter(item.id)}
                  className={`flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[0.7rem] font-medium transition-colors ${
                    isActive
                      ? item.id === 'PRIMARY_WATCH'
                        ? 'border-teal-400/35 bg-teal-400/[0.12] text-teal-200'
                        : item.id === 'SECONDARY_WATCH'
                        ? 'border-sky-400/30 bg-sky-400/[0.1] text-sky-200'
                        : item.id === 'WAIT'
                        ? 'border-rose-400/30 bg-rose-400/[0.1] text-rose-200'
                        : 'border-white/[0.12] bg-white/[0.05] text-slate-200'
                      : 'border-white/[0.07] bg-white/[0.02] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="tnum text-[0.65rem] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Setup Classification */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-2.5">
            <span className="velqo-eyebrow mr-1">Setup</span>
            {(
              [
                { id: 'ALL', label: 'All setups' },
                { id: 'EXPANSION', label: 'Expansion' },
                { id: 'MEAN_REVERSION', label: 'Mean reversion' },
                { id: 'WAIT_FOR_CATALYST', label: 'Wait for catalyst' },
                { id: 'MONITOR_ONLY', label: 'Monitor only' },
                { id: 'NO_SETUP', label: 'No setup' },
                { id: 'DATA_DEFICIENT', label: 'Data deficient' }
              ] as const
            ).map((item) => {
              const count = counts[item.id] || 0;
              const isActive = filter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={`flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[0.7rem] transition-colors ${
                    isActive
                      ? 'border-white/[0.12] bg-white/[0.05] text-slate-200'
                      : 'border-white/[0.07] bg-white/[0.02] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="tnum text-[0.65rem] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-lg">
            <p className="text-xs font-mono text-neutral-500">
              No pairs currently match the active filter criteria.
            </p>
          </div>
        ) : (
          filtered.map(({ pairIntel, opp }) => {
            if (!opp) return null;

            const classification = opp.opportunityClassification || 'MONITOR_ONLY';
            const delta = pairIntel.relativeStrengthDelta;
            const isBullish = opp.directionalBias === 'BULLISH_BASE';
            const isBearish = opp.directionalBias === 'BEARISH_BASE';

            const stateBadge =
              opp.state === 'PRIMARY_WATCH' ? (
                <span className="velqo-chip !border-teal-400/30 !bg-teal-400/[0.1] !text-teal-200">
                  Primary watch
                </span>
              ) : opp.state === 'SECONDARY_WATCH' ? (
                <span className="velqo-chip !border-sky-400/25 !bg-sky-400/[0.08] !text-sky-200">
                  Secondary watch
                </span>
              ) : opp.state === 'MONITOR' ? (
                <span className="velqo-chip !border-amber-400/25 !bg-amber-400/[0.07] !text-amber-200">
                  Monitor
                </span>
              ) : opp.state === 'WAIT' ? (
                <span className="velqo-chip !border-rose-400/25 !bg-rose-400/[0.07] !text-rose-200">
                  Wait
                </span>
              ) : (
                <span className="velqo-chip !border-white/[0.08] !text-slate-400">
                  Insufficient data
                </span>
              );

            const classificationBadge = (
              <span
                className={`velqo-chip !px-1.5 !py-0 !text-[0.58rem] ${
                  classification === 'EXPANSION'
                    ? '!border-teal-400/25 !text-teal-200'
                    : classification === 'MEAN_REVERSION'
                    ? '!border-amber-400/25 !text-amber-200'
                    : classification === 'WAIT_FOR_CATALYST'
                    ? '!border-violet-400/25 !text-violet-200'
                    : classification === 'MONITOR_ONLY'
                    ? '!border-sky-400/25 !text-sky-200'
                    : classification === 'NO_SETUP'
                    ? '!border-white/[0.08] !text-slate-400'
                    : '!border-rose-400/25 !text-rose-200'
                }`}
              >
                {classification.replace(/_/g, ' ')}
              </span>
            );

            const contradictions = pairIntel.contradictions || pairIntel.structuredContradictions || [];
            const catalysts = opp.keyCatalysts || pairIntel.catalystIntelligence || [];

            return (
              <div
                key={opp.pair}
                className="velqo-card velqo-card-interactive space-y-3 px-4 py-4 sm:px-5"
              >
                {/* Top header row */}
                <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="velqo-display text-lg text-white">
                      {opp.pair}
                    </span>
                    {stateBadge}
                    {classificationBadge}
                    <span className="velqo-chip !px-1.5 !py-0 !text-[0.58rem]">
                      {String(opp.directionalBias).replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[0.72rem]">
                    <div className="flex items-center gap-1.5">
                      <span className="velqo-eyebrow">Confluence</span>
                      <span className="font-semibold text-slate-100 tnum">
                        {opp.confluenceScore}/100
                      </span>
                      <span className="hidden text-[0.65rem] text-sky-300/80 sm:inline">
                        {String(opp.directionalConfidence).replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {delta === null ? (
                        <span
                          className="flex items-center font-semibold text-amber-300"
                          title={`Live market-strength evidence is ${
                            pairIntel.marketEvidenceState === 'STALE'
                              ? 'stale'
                              : 'unavailable'
                          }; no relative Δ is claimed.`}
                        >
                          <AlertTriangle className="mr-0.5 h-3.5 w-3.5" /> Δ unavailable
                        </span>
                      ) : isBullish ? (
                        <span className="flex items-center font-semibold text-teal-300 tnum">
                          <TrendingUp className="mr-0.5 h-3.5 w-3.5" /> +{delta.toFixed(2)}%
                        </span>
                      ) : isBearish ? (
                        <span className="flex items-center font-semibold text-rose-300 tnum">
                          <TrendingDown className="mr-0.5 h-3.5 w-3.5" /> {delta.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="flex items-center text-slate-400 tnum">
                          <Minus className="mr-0.5 h-3.5 w-3.5" /> {delta.toFixed(2)}%
                        </span>
                      )}
                    </div>

                    {onSelectPair && (
                      <button
                        onClick={() => onSelectPair(opp.pair)}
                        className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 transition-colors"
                        title="View Full Pair Intelligence"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Why This Pair / Watch Reason */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[0.78rem] leading-relaxed text-slate-300">
                  <span className="velqo-eyebrow mr-2 !text-teal-300/80">Why now</span>
                  {opp.watchReason || opp.whyThisPair}
                </div>

                {/* Data Provenance & Freshness Bar */}
                <div className="flex flex-wrap items-center gap-2 text-[0.68rem] text-slate-500">
                  <span className="velqo-chip !py-0.5">
                    Quality <strong className="ml-1 font-semibold text-slate-200">{opp.dataQuality}</strong>
                  </span>
                  <span className="velqo-chip !py-0.5">
                    Freshness{' '}
                    <strong className="ml-1 font-semibold text-slate-200">{opp.freshness}</strong>
                  </span>
                  <span className="velqo-chip !py-0.5">{opp.sessionRelevance}</span>
                  {contradictions.length > 0 && (
                    <span className="velqo-chip !border-amber-400/25 !py-0.5 !text-amber-200">
                      {contradictions.length} contradiction
                      {contradictions.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {/* Structured Watch Factors */}
                {opp.watchFactors && opp.watchFactors.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="velqo-eyebrow block">Evidence factors</span>
                    <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                      {opp.watchFactors.map((factor, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[0.72rem] text-slate-300"
                        >
                          <span className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                          <span className="leading-snug">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contradictions Warning if Present */}
                {contradictions.length > 0 && (
                  <div className="space-y-1 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-3.5 py-3">
                    <span className="velqo-eyebrow flex items-center gap-1.5 !text-amber-200/90">
                      <AlertTriangle className="h-3 w-3" /> Active contradictions
                    </span>
                    {contradictions.map((c, i) => (
                      <p key={i} className="text-[0.72rem] leading-relaxed text-slate-300">
                        <strong className="font-semibold text-amber-200/90">{c.severity}</strong>{' '}
                        {c.description || c.conflictDescription}
                      </p>
                    ))}
                  </div>
                )}

                {/* Catalysts Runway */}
                {catalysts.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="velqo-eyebrow block">Scheduled catalysts</span>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {catalysts.slice(0, 2).map((cat, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5"
                        >
                          <span className="mr-2 truncate text-[0.72rem] text-slate-300">{cat.name}</span>
                          <span
                            className={`text-[0.65rem] font-semibold ${
                              cat.importance === 'HIGH' ? 'text-rose-300' : 'text-amber-200'
                            }`}
                          >
                            {cat.importance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invalidation Rules & Risks */}
                {opp.invalidationRules && opp.invalidationRules.length > 0 && (
                  <div className="space-y-1 rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] px-3.5 py-3 text-[0.7rem] leading-relaxed text-rose-100/80">
                    <span className="velqo-eyebrow flex items-center gap-1.5 !text-rose-200/90">
                      <ShieldAlert className="h-3 w-3" /> What would invalidate this
                    </span>
                    <ul className="list-disc space-y-0.5 pl-4">
                      {opp.invalidationRules.map((rule, i) => (
                        <li key={i}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
