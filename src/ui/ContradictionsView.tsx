import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, ArrowLeftRight, CheckCircle2, Filter } from 'lucide-react';
import { PairIntelligence } from '../types';
import { StructuredContradiction, ContradictionCategory, ContradictionSeverity } from '../types/intelligence';

interface ContradictionsViewProps {
  pairIntelligences: PairIntelligence[];
  onSelectPair?: (symbol: string) => void;
  onSelectCurrency?: (code: string) => void;
}

export const ContradictionsView: React.FC<ContradictionsViewProps> = ({
  pairIntelligences,
  onSelectPair,
  onSelectCurrency
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<ContradictionSeverity | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<ContradictionCategory | 'ALL'>('ALL');

  // Gather all structured contradictions across all pairs
  const allContradictions: { pairSymbol: string; contradiction: StructuredContradiction }[] = [];
  pairIntelligences.forEach((p) => {
    (p.structuredContradictions || []).forEach((c) => {
      allContradictions.push({
        pairSymbol: p.pair.symbol,
        contradiction: c
      });
    });
  });

  const filtered = allContradictions.filter(({ contradiction: c }) => {
    if (selectedSeverity !== 'ALL' && c.severity !== selectedSeverity) return false;
    const cat = c.contradictionType || c.category;
    if (selectedCategory !== 'ALL' && cat !== selectedCategory) return false;
    return true;
  });

  const highCount = allContradictions.filter((c) => c.contradiction.severity === 'HIGH').length;
  const medCount = allContradictions.filter((c) => c.contradiction.severity === 'MEDIUM').length;
  const lowCount = allContradictions.filter((c) => c.contradiction.severity === 'LOW').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="velqo-card px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="velqo-eyebrow mb-1.5">Cross-currents</p>
            <h2 className="velqo-display flex items-center gap-2 text-lg text-white sm:text-xl">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Contradictions
            </h2>
            <p className="mt-1.5 max-w-2xl text-[0.75rem] leading-relaxed text-slate-400">
              Genuine conflicts between market momentum, macro structure, central bank guidance and
              realized surprises. Absence of evidence is never counted as a contradiction.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <span className="velqo-chip !border-rose-400/25 !text-rose-200">{highCount} high</span>
            <span className="velqo-chip !border-amber-400/25 !text-amber-200">{medCount} medium</span>
            <span className="velqo-chip">{lowCount} low</span>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4">
          <div className="velqo-eyebrow mr-1 flex items-center gap-1.5">
            <Filter className="h-3 w-3" /> Severity
          </div>
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`min-h-8 rounded-full border px-2.5 text-[0.7rem] font-semibold transition-colors ${
                selectedSeverity === sev
                  ? sev === 'HIGH'
                    ? 'border-rose-400/30 bg-rose-400/[0.1] text-rose-200'
                    : sev === 'MEDIUM'
                    ? 'border-amber-400/30 bg-amber-400/[0.1] text-amber-200'
                    : 'border-white/[0.12] bg-white/[0.05] text-slate-200'
                  : 'border-white/[0.07] bg-white/[0.02] text-slate-500 hover:text-slate-300'
              }`}
            >
              {sev}
            </button>
          ))}

          <div className="mx-1 hidden h-4 w-px bg-white/[0.08] sm:block" />

          <div className="velqo-eyebrow mr-1">Type</div>
          {(
            [
              { id: 'ALL', label: 'All types' },
              { id: 'MARKET_VS_FUNDAMENTAL', label: 'Market vs macro' },
              { id: 'POLICY_VS_MARKET', label: 'Policy vs carry' },
              { id: 'FUNDAMENTAL_VS_EXPECTATION', label: 'Expectations' },
              { id: 'EVENT_VOLATILITY_RISK', label: 'Event risk' },
              { id: 'DATA_QUALITY', label: 'Data quality' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedCategory(t.id as any)}
              className={`min-h-8 rounded-full border px-2.5 text-[0.7rem] transition-colors ${
                selectedCategory === t.id
                  ? 'border-white/[0.12] bg-white/[0.05] text-slate-200'
                  : 'border-white/[0.07] bg-white/[0.02] text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contradictions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="velqo-card px-4 py-10 text-center">
            <CheckCircle2 className="mx-auto mb-2.5 h-6 w-6 text-teal-300" />
            <p className="text-[0.85rem] font-semibold text-slate-200">
              No contradictions for the current filter
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[0.75rem] leading-relaxed text-slate-500">
              Price action, macro structure and central bank guidance currently align within
              tolerance. This is an absence of conflict, not an absence of evidence.
            </p>
          </div>
        ) : (
          filtered.map(({ pairSymbol, contradiction: c }) => {
            const isHigh = c.severity === 'HIGH';
            const isMed = c.severity === 'MEDIUM';

            return (
              <div
                key={c.id}
                className="velqo-card velqo-card-interactive space-y-3 px-4 py-4"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="velqo-display text-base text-white">{pairSymbol}</span>
                    <span
                      className={`velqo-chip !py-0.5 !text-[0.62rem] ${
                        isHigh
                          ? '!border-rose-400/30 !bg-rose-400/[0.1] !text-rose-200'
                          : isMed
                          ? '!border-amber-400/30 !bg-amber-400/[0.1] !text-amber-200'
                          : ''
                      }`}
                    >
                      {String(c.severity).toLowerCase()} severity
                    </span>
                    <span className="velqo-chip !py-0.5 !text-[0.62rem]">
                      {(c.contradictionType || c.category).replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[0.68rem] text-slate-500 tnum">
                      −{c.penaltyPoints} confluence
                    </span>
                    {onSelectPair && (
                      <button
                        onClick={() => onSelectPair(pairSymbol)}
                        className="rounded-full px-2 py-1 text-[0.68rem] font-medium text-teal-300 transition-colors hover:bg-teal-400/10"
                      >
                        Inspect pair →
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-[0.78rem] leading-relaxed text-slate-200">
                  {c.description || c.conflictDescription}
                </p>

                {/* Statement A vs Statement B Side-by-Side */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <span className="velqo-eyebrow mb-1 block">{c.sourceA}</span>
                    <span className="text-[0.75rem] leading-relaxed text-slate-300">{c.statementA}</span>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <span className="velqo-eyebrow mb-1 block">{c.sourceB}</span>
                    <span className="text-[0.75rem] leading-relaxed text-slate-300">{c.statementB}</span>
                  </div>
                </div>

                {/* Directional Impact & Affected Components */}
                <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[0.7rem] leading-relaxed text-slate-500">
                    <span className="velqo-eyebrow mr-1.5">Impact</span>
                    {c.directionalImpact}
                  </span>
                  {c.affectedComponents && c.affectedComponents.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {c.affectedComponents.map((comp, idx) => (
                        <span key={idx} className="velqo-chip !px-1.5 !py-0 !text-[0.58rem]">
                          {comp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
