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
      <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800 mb-3">
          <div>
            <h2 className="text-sm font-semibold font-mono text-neutral-100 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Structured Contradictions & Divergence Engine
            </h2>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Identifies genuine conflicts across market momentum, structural macro fundamentals, central bank guidance, consensus expectations, and event volatility. Contradictions penalize confluence and warn against one-dimensional bias.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-rose-950/70 border border-rose-800 text-rose-300 font-bold">
              {highCount} High Severity
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800 text-amber-300 font-bold">
              {medCount} Medium
            </span>
            <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400 font-bold">
              {lowCount} Low
            </span>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1 text-neutral-500 text-[10px] uppercase font-bold mr-1">
            <Filter className="w-3 h-3" /> Severity:
          </div>
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                selectedSeverity === sev
                  ? sev === 'HIGH'
                    ? 'bg-rose-900 text-rose-100 border border-rose-700'
                    : sev === 'MEDIUM'
                    ? 'bg-amber-900 text-amber-100 border border-amber-700'
                    : 'bg-neutral-800 text-neutral-100 border border-neutral-600'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              {sev}
            </button>
          ))}

          <div className="hidden sm:block w-px h-4 bg-neutral-800 mx-2" />

          <div className="flex items-center gap-1 text-neutral-500 text-[10px] uppercase font-bold mr-1">
            Type:
          </div>
          {(
            [
              { id: 'ALL', label: 'All Types' },
              { id: 'MARKET_VS_FUNDAMENTAL', label: 'Market vs Macro' },
              { id: 'POLICY_VS_MARKET', label: 'Policy vs Carry' },
              { id: 'FUNDAMENTAL_VS_EXPECTATION', label: 'Expectation Missing' },
              { id: 'EVENT_VOLATILITY_RISK', label: 'Event Volatility' },
              { id: 'DATA_QUALITY', label: 'Data Quality' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedCategory(t.id as any)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                selectedCategory === t.id
                  ? 'bg-neutral-800 text-neutral-100 border border-neutral-600'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
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
          <div className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs font-mono text-neutral-300 font-bold">
              No contradictions detected for the current filter.
            </p>
            <p className="text-[11px] text-neutral-500 mt-1 font-sans">
              Signals across price action, fundamentals, and central bank guidance align within acceptable tolerance.
            </p>
          </div>
        ) : (
          filtered.map(({ pairSymbol, contradiction: c }) => {
            const isHigh = c.severity === 'HIGH';
            const isMed = c.severity === 'MEDIUM';

            return (
              <div
                key={c.id}
                className="p-3.5 bg-neutral-900/40 hover:bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700/80 rounded-lg transition-colors space-y-2.5"
              >
                {/* Header row */}
                <div className="flex items-start justify-between pb-2 border-b border-neutral-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-neutral-100">
                      {pairSymbol}
                    </span>
                    <span className="text-xs font-mono text-neutral-500">
                      [{c.currency}]
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isHigh
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : isMed
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-neutral-900 text-neutral-300 border border-neutral-700'
                      }`}
                    >
                      {c.severity} SEVERITY
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800">
                      {c.contradictionType || c.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-rose-400 font-bold">
                      -{c.penaltyPoints} Penalty Points
                    </span>
                    {onSelectPair && (
                      <button
                        onClick={() => onSelectPair(pairSymbol)}
                        className="text-emerald-400 hover:underline text-[10px]"
                      >
                        Inspect Pair →
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs font-sans text-neutral-200 leading-relaxed">
                  {c.description || c.conflictDescription}
                </p>

                {/* Statement A vs Statement B Side-by-Side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-neutral-950/70 border border-neutral-800/80 rounded">
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-0.5">
                      Source A: {c.sourceA}
                    </span>
                    <span className="text-neutral-300 text-[11px] block">{c.statementA}</span>
                  </div>

                  <div className="p-2 bg-neutral-950/70 border border-neutral-800/80 rounded">
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-0.5">
                      Source B: {c.sourceB}
                    </span>
                    <span className="text-neutral-300 text-[11px] block">{c.statementB}</span>
                  </div>
                </div>

                {/* Directional Impact & Affected Components */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1.5 border-t border-neutral-800/60 font-mono text-[10px] text-neutral-500">
                  <span className="text-neutral-400 font-sans">
                    <span className="font-mono uppercase text-neutral-500 font-bold">Impact: </span>
                    {c.directionalImpact}
                  </span>
                  {c.affectedComponents && c.affectedComponents.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span>Affected:</span>
                      {c.affectedComponents.map((comp, idx) => (
                        <span
                          key={idx}
                          className="px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 text-[9px]"
                        >
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
