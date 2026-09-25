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

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  pairIntelligences,
  onSelectPair,
  onSelectCurrency
}) => {
  const [filter, setFilter] = useState<OpportunityFilter>('ALL');

  const opportunities = pairIntelligences.map((p) => ({
    pairIntel: p,
    opp: p.structuredOpportunity
  }));

  const filtered = opportunities.filter(({ opp }) => {
    if (!opp) return filter === 'ALL' || filter === 'DATA_DEFICIENT';
    const classification = opp.opportunityClassification || 'MONITOR_ONLY';
    if (filter === 'ALL') return true;
    return classification === filter;
  });

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
    const classification = opp?.opportunityClassification || 'DATA_DEFICIENT';
    if (counts[classification] !== undefined) {
      counts[classification]++;
    }
  });

  return (
    <div className="space-y-4">
      {/* Engine Header */}
      <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800 mb-3">
          <div>
            <h2 className="text-sm font-semibold font-mono text-neutral-100 uppercase tracking-wide flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              Opportunity Intelligence Engine
            </h2>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Multi-dimensional operational assessment across the canonical 15-pair universe. Answers &quot;Which pairs deserve analytical attention right now?&quot; based on market strength, fundamental delta, carry, contradictions, and catalyst runways.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
              {pairIntelligences.length} Pairs Evaluated
            </span>
          </div>
        </div>

        {/* 6-State Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {(
            [
              { id: 'ALL', label: 'All Setups' },
              { id: 'EXPANSION', label: 'Expansion' },
              { id: 'MEAN_REVERSION', label: 'Mean Reversion' },
              { id: 'WAIT_FOR_CATALYST', label: 'Wait for Catalyst' },
              { id: 'MONITOR_ONLY', label: 'Monitor Only' },
              { id: 'NO_SETUP', label: 'No Setup' },
              { id: 'DATA_DEFICIENT', label: 'Data Deficient' }
            ] as const
          ).map((item) => {
            const count = counts[item.id] || 0;
            const isActive = filter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-neutral-800 text-neutral-100 border border-neutral-600'
                    : 'bg-neutral-950/60 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded ${
                    isActive ? 'bg-neutral-700 text-emerald-400' : 'bg-neutral-900 text-neutral-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-lg">
            <p className="text-xs font-mono text-neutral-500">
              No pairs currently match the &quot;{filter}&quot; filter state.
            </p>
          </div>
        ) : (
          filtered.map(({ pairIntel, opp }) => {
            if (!opp) return null;

            const classification = opp.opportunityClassification || 'MONITOR_ONLY';
            const delta = pairIntel.relativeStrengthDelta ?? 0;
            const isBullish = opp.directionalBias === 'BULLISH_BASE';
            const isBearish = opp.directionalBias === 'BEARISH_BASE';

            const classificationBadge =
              classification === 'EXPANSION' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  EXPANSION
                </span>
              ) : classification === 'MEAN_REVERSION' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  MEAN REVERSION
                </span>
              ) : classification === 'WAIT_FOR_CATALYST' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  WAIT FOR CATALYST
                </span>
              ) : classification === 'MONITOR_ONLY' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                  MONITOR ONLY
                </span>
              ) : classification === 'NO_SETUP' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 text-neutral-400 border border-neutral-800">
                  NO SETUP
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  DATA DEFICIENT
                </span>
              );

            return (
              <div
                key={opp.pair}
                className="p-4 bg-neutral-900/40 hover:bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors space-y-3"
              >
                {/* Top header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-neutral-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold font-mono text-neutral-100">
                      {opp.pair}
                    </span>
                    <span className="text-xs font-mono text-neutral-500">
                      ({pairIntel.baseCurrency.code}/{pairIntel.quoteCurrency.code})
                    </span>
                    {classificationBadge}
                    {pairIntel.orientation && (
                      <span className="hidden md:inline px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {pairIntel.orientation.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500 text-[10px] uppercase">Confluence:</span>
                      <span className="font-bold text-neutral-100 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                        {opp.confluenceScore}/100
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isBullish ? (
                        <span className="text-emerald-400 font-bold flex items-center">
                          <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{delta.toFixed(2)}%
                        </span>
                      ) : isBearish ? (
                        <span className="text-rose-400 font-bold flex items-center">
                          <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {delta.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-neutral-400 flex items-center">
                          <Minus className="w-3.5 h-3.5 mr-0.5" /> 0.00%
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
                <div className="p-2.5 bg-neutral-950/60 border border-neutral-800/80 rounded font-sans text-xs text-neutral-300 leading-relaxed">
                  <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold mr-1.5">
                    Analytical Thesis:
                  </span>
                  {opp.whyThisPair}
                </div>

                {/* Structured Watch Factors */}
                {opp.watchFactors && opp.watchFactors.length > 0 && (
                  <div className="space-y-1 font-mono text-[11px]">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                      Evidence Factors:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {opp.watchFactors.map((factor, i) => (
                        <div
                          key={i}
                          className="px-2 py-1 rounded bg-neutral-950/40 border border-neutral-800/60 text-neutral-300 flex items-start gap-1.5"
                        >
                          <span className="text-neutral-500 mt-0.5">•</span>
                          <span className="leading-snug">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invalidation Rules & Risks */}
                {opp.invalidationRules && opp.invalidationRules.length > 0 && (
                  <div className="p-2 bg-rose-950/20 border border-rose-900/40 rounded font-mono text-[10px] text-rose-300/90 space-y-1">
                    <span className="font-bold uppercase tracking-wider flex items-center gap-1 text-rose-400">
                      <ShieldAlert className="w-3 h-3" /> Invalidation Rules:
                    </span>
                    <ul className="space-y-0.5 pl-3 list-disc">
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
