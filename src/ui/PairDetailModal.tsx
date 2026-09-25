import React from 'react';
import { X, TrendingUp, TrendingDown, Clock, ShieldAlert, ArrowLeftRight, Scale } from 'lucide-react';
import { PairIntelligence } from '../types';

interface PairDetailModalProps {
  intelligence: PairIntelligence | null;
  onClose: () => void;
  onSelectCurrency?: (code: string) => void;
}

export const PairDetailModal: React.FC<PairDetailModalProps> = ({
  intelligence,
  onClose,
  onSelectCurrency
}) => {
  if (!intelligence) return null;

  const {
    pair,
    baseCurrency,
    quoteCurrency,
    baseState,
    quoteState,
    relativeStrengthDelta,
    orientationDirection,
    orientationExplanation,
    convergenceDivergence,
    convergenceExplanation,
    supportingEvidence,
    counterEvidence,
    catalysts,
    risks,
    thesis,
    invalidationConditions,
    sessionRelevance,
    watchWindow,
    fundamentalDifferential,
    structuredThesis,
    structuredInvalidation,
    structuredContradictions,
    catalystIntelligence,
    structuredOpportunity
  } = intelligence;

  const delta = relativeStrengthDelta ?? 0;
  const isBullish = orientationDirection === 'BULLISH_BASE';
  const isBearish = orientationDirection === 'BEARISH_BASE';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-4 sm:p-6 text-neutral-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-neutral-100">
                {pair.symbol}
              </span>
              <span className="text-xs font-mono text-neutral-500">
                ({baseCurrency.code} Base / {quoteCurrency.code} Quote)
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => onSelectCurrency?.(baseCurrency.code)}
                className="text-xs font-mono text-emerald-400 hover:underline"
              >
                Inspect {baseCurrency.code} →
              </button>
              <span className="text-neutral-600">·</span>
              <button
                onClick={() => onSelectCurrency?.(quoteCurrency.code)}
                className="text-xs font-mono text-emerald-400 hover:underline"
              >
                Inspect {quoteCurrency.code} →
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* Macro Bias Banner */}
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 mb-2 font-mono">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider">
                Macro Relative Bias
              </span>
              <div className="flex items-center gap-2">
                {structuredOpportunity && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      structuredOpportunity.state === 'PRIMARY_WATCH'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : structuredOpportunity.state === 'SECONDARY_WATCH'
                        ? 'bg-sky-950 text-sky-300 border border-sky-800'
                        : structuredOpportunity.state === 'WAIT'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    {structuredOpportunity.state}
                  </span>
                )}
                <span className="text-xs font-bold">
                  {isBullish ? (
                    <span className="text-emerald-400 flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" /> BULLISH BIAS (Δ +{delta.toFixed(2)}%)
                    </span>
                  ) : isBearish ? (
                    <span className="text-rose-400 flex items-center">
                      <TrendingDown className="w-3.5 h-3.5 mr-1" /> BEARISH BIAS (Δ {delta.toFixed(2)}%)
                    </span>
                  ) : (
                    <span className="text-neutral-400">NEUTRAL (Δ {delta.toFixed(2)}%)</span>
                  )}
                </span>
              </div>
            </div>
            <p className="text-neutral-300 leading-relaxed font-sans">{orientationExplanation}</p>
            {structuredOpportunity && (
              <p className="text-[11px] text-neutral-400 font-sans mt-2 pt-2 border-t border-neutral-800/60">
                <span className="text-neutral-500 font-mono uppercase text-[10px]">Watch Rationale: </span>
                {structuredOpportunity.whyThisPair}
              </p>
            )}
          </div>

          {/* Confluence & Directional Confidence Breakdown */}
          {intelligence.confluence && (
            <div className="p-3 bg-neutral-900/70 border border-emerald-900/60 rounded space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800 font-mono text-xs">
                <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  Multi-Factor Confluence Model
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-100 bg-neutral-800 px-2 py-0.5 rounded">
                    {intelligence.confluence.confluenceScore}/100
                  </span>
                  <span className="text-[10px] font-bold text-sky-400">
                    [{intelligence.confluence.directionalConfidence} CONFIDENCE]
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                {intelligence.confluence.explanation}
              </p>

              {/* Evidence Inventory Tags */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                {intelligence.confluence.availableComponents && intelligence.confluence.availableComponents.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                    Active: {intelligence.confluence.availableComponents.join(', ')}
                  </span>
                )}
                {intelligence.confluence.missingComponents && intelligence.confluence.missingComponents.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-900 text-rose-300">
                    Missing: {intelligence.confluence.missingComponents.join(', ')}
                  </span>
                )}
                {intelligence.confluence.referenceOnlyComponents && intelligence.confluence.referenceOnlyComponents.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800 text-purple-300">
                    Reference Context: {intelligence.confluence.referenceOnlyComponents.join(', ')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px] pt-1">
                {/* 1. Market Strength */}
                <div className="p-2 bg-neutral-950/80 border border-neutral-800 rounded flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-neutral-500 uppercase">MARKET STRENGTH</span>
                    <span className={`text-[9px] font-bold px-1 rounded ${
                      intelligence.confluence.components.marketStrength.availability === 'AVAILABLE'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {intelligence.confluence.components.marketStrength.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400 text-xs">
                    +{intelligence.confluence.components.marketStrength.points}/25 pts
                  </span>
                  <span className="text-[9px] text-neutral-500 mt-1 truncate">
                    {intelligence.confluence.components.marketStrength.source || 'Biquote'} · {intelligence.confluence.components.marketStrength.freshness || 'FRESH'}
                  </span>
                </div>

                {/* 2. Fundamentals */}
                <div className="p-2 bg-neutral-950/80 border border-neutral-800 rounded flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-neutral-500 uppercase">FUNDAMENTALS</span>
                    <span className={`text-[9px] font-bold px-1 rounded ${
                      intelligence.confluence.components.fundamentals.availability === 'AVAILABLE'
                        ? 'bg-emerald-950 text-emerald-400'
                        : intelligence.confluence.components.fundamentals.availability === 'UNAVAILABLE'
                        ? 'bg-rose-950 text-rose-400'
                        : 'bg-amber-950 text-amber-400'
                    }`}>
                      {intelligence.confluence.components.fundamentals.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className={`font-bold text-xs ${
                    intelligence.confluence.components.fundamentals.points > 0 ? 'text-emerald-400' : 'text-neutral-500'
                  }`}>
                    +{intelligence.confluence.components.fundamentals.points}/20 pts
                  </span>
                  <span className="text-[9px] text-neutral-500 mt-1 truncate">
                    {intelligence.confluence.components.fundamentals.source || 'Finance Calendar'} · {intelligence.confluence.components.fundamentals.freshness || 'FRESH'}
                  </span>
                </div>

                {/* 3. Policy & Carry */}
                <div className="p-2 bg-neutral-950/80 border border-neutral-800 rounded flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-neutral-500 uppercase">POLICY & CARRY</span>
                    <span className={`text-[9px] font-bold px-1 rounded ${
                      intelligence.confluence.components.policy.availability === 'AVAILABLE'
                        ? 'bg-emerald-950 text-emerald-400'
                        : intelligence.confluence.components.policy.availability === 'REFERENCE_ONLY'
                        ? 'bg-purple-950 text-purple-400'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {intelligence.confluence.components.policy.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className={`font-bold text-xs ${
                    intelligence.confluence.components.policy.points > 0 ? 'text-emerald-400' : 'text-neutral-500'
                  }`}>
                    +{intelligence.confluence.components.policy.points}/20 pts
                  </span>
                  <span className="text-[9px] text-neutral-500 mt-1 truncate">
                    {intelligence.confluence.components.policy.source || 'Central Bank'} · {intelligence.confluence.components.policy.freshness || 'REFERENCE'}
                  </span>
                </div>

                {/* 4. Expectations */}
                <div className="p-2 bg-neutral-950/80 border border-neutral-800 rounded flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-neutral-500 uppercase">EXPECTATIONS</span>
                    <span className={`text-[9px] font-bold px-1 rounded ${
                      intelligence.confluence.components.expectations.availability === 'AVAILABLE'
                        ? 'bg-emerald-950 text-emerald-400'
                        : intelligence.confluence.components.expectations.availability === 'PARTIAL'
                        ? 'bg-amber-950 text-amber-400'
                        : 'bg-rose-950 text-rose-400'
                    }`}>
                      {intelligence.confluence.components.expectations.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className={`font-bold text-xs ${
                    intelligence.confluence.components.expectations.points > 0 ? 'text-emerald-400' : 'text-neutral-500'
                  }`}>
                    +{intelligence.confluence.components.expectations.points}/15 pts
                  </span>
                  <span className="text-[9px] text-neutral-500 mt-1 truncate">
                    {intelligence.confluence.components.expectations.source || 'Finance Calendar'} · {intelligence.confluence.components.expectations.freshness || 'FRESH'}
                  </span>
                </div>

                {/* 5. Session */}
                <div className="p-2 bg-neutral-950/80 border border-neutral-800 rounded flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-neutral-500 uppercase">SESSION CONTEXT</span>
                    <span className="text-[9px] font-bold px-1 rounded bg-emerald-950 text-emerald-400">
                      AVAILABLE
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400 text-xs">
                    +{intelligence.confluence.components.session.points}/10 pts
                  </span>
                  <span className="text-[9px] text-neutral-500 mt-1 truncate">
                    Session · DERIVED
                  </span>
                </div>

                {/* 6. Catalysts */}
                <div className="p-2 bg-neutral-950/80 border border-neutral-800 rounded flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-neutral-500 uppercase">CATALYSTS & RISK</span>
                    <span className={`text-[9px] font-bold px-1 rounded ${
                      intelligence.confluence.components.catalysts.availability === 'AVAILABLE'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-rose-950 text-rose-400'
                    }`}>
                      {intelligence.confluence.components.catalysts.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400 text-xs">
                    +{intelligence.confluence.components.catalysts.points}/10 pts
                  </span>
                  <span className="text-[9px] text-neutral-500 mt-1 truncate">
                    {intelligence.confluence.components.catalysts.source || 'Finance Calendar'} · {intelligence.confluence.components.catalysts.freshness || 'FRESH'}
                  </span>
                </div>
              </div>

              {intelligence.confluence.components.contradictionPenalty.penaltyPoints > 0 && (
                <div className="p-2 bg-rose-950/30 border border-rose-900/50 rounded font-mono text-[10px] text-rose-300">
                  <span className="font-bold uppercase block mb-1">
                    CONTRADICTION DEDUCTION: -{intelligence.confluence.components.contradictionPenalty.penaltyPoints} PTS
                  </span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {intelligence.confluence.components.contradictionPenalty.reasons.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Phase B: Fundamental Differential Section */}
          {fundamentalDifferential && (
            <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800 font-mono text-xs">
                <span className="font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-sky-400" /> Fundamental Differential ({pair.baseCurrency} vs {pair.quoteCurrency})
                </span>
                <span className="text-[10px] text-sky-400 font-bold">
                  QUALITY: {fundamentalDifferential.dataQuality}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="p-2 bg-neutral-950/70 border border-neutral-800/70 rounded">
                  <span className="text-[10px] text-neutral-500 block uppercase">MARKET STRENGTH Δ</span>
                  <span className="font-bold text-neutral-200">
                    {fundamentalDifferential.marketStrengthDifferential !== null
                      ? `${fundamentalDifferential.marketStrengthDifferential >= 0 ? '+' : ''}${fundamentalDifferential.marketStrengthDifferential.toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="p-2 bg-neutral-950/70 border border-neutral-800/70 rounded">
                  <span className="text-[10px] text-neutral-500 block uppercase">FUNDAMENTAL Δ</span>
                  <span className="font-bold text-neutral-200">
                    {fundamentalDifferential.fundamentalDifferential.delta !== null
                      ? `${fundamentalDifferential.fundamentalDifferential.delta >= 0 ? '+' : ''}${fundamentalDifferential.fundamentalDifferential.delta.toFixed(2)}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="p-2 bg-neutral-950/70 border border-neutral-800/70 rounded">
                  <span className="text-[10px] text-neutral-500 block uppercase">POLICY RATE SPREAD</span>
                  <span className="font-bold text-neutral-200">
                    {fundamentalDifferential.policyDifferential.rateSpread !== null
                      ? `${fundamentalDifferential.policyDifferential.rateSpread >= 0 ? '+' : ''}${fundamentalDifferential.policyDifferential.rateSpread.toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Policy Stance Comparison */}
              <div className="p-2 bg-neutral-950/70 border border-neutral-800/70 rounded text-[11px] font-sans text-neutral-300">
                <span className="font-mono text-[10px] text-neutral-500 uppercase block mb-0.5">CENTRAL BANK POLICY DIVERGENCE</span>
                {fundamentalDifferential.policyDifferential.stanceDelta}
              </div>

              {/* Expectations Comparison */}
              <div className="p-2 bg-neutral-950/70 border border-neutral-800/70 rounded text-[11px] font-sans text-neutral-300">
                <span className="font-mono text-[10px] text-neutral-500 uppercase block mb-0.5">EXPECTATIONS MOMENTUM</span>
                {fundamentalDifferential.expectationsDifferential.comparison}
              </div>
            </div>
          )}

          {/* Convergence / Divergence */}
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 mb-2 font-mono">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-400" /> Market vs Fundamental Alignment
              </span>
              <span
                className={`text-xs font-bold ${
                  convergenceDivergence === 'CONVERGENCE'
                    ? 'text-emerald-400'
                    : convergenceDivergence === 'DIVERGENCE'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {convergenceDivergence}
              </span>
            </div>
            <p className="text-neutral-300 leading-relaxed font-sans">{convergenceExplanation}</p>
          </div>

          {/* Structural Thesis */}
          <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800/80 mb-2 font-mono">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                Structural Macro Thesis
              </span>
              {structuredThesis && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      structuredThesis.status === 'SUPPORTED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : structuredThesis.status === 'MIXED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : structuredThesis.status === 'WEAKENED'
                        ? 'bg-orange-950 text-orange-300 border border-orange-800'
                        : structuredThesis.status === 'INVALIDATED'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    {structuredThesis.status}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    [{structuredThesis.evidenceQuality}]
                  </span>
                </div>
              )}
            </div>
            <p className="text-neutral-200 leading-relaxed font-sans">
              {structuredThesis?.summary || thesis}
            </p>
            {structuredThesis && structuredThesis.dataGaps.length > 0 && (
              <div className="mt-2 pt-2 border-t border-neutral-800/60 font-mono text-[10px] text-neutral-500">
                <span className="text-amber-500 uppercase">Data Gaps: </span>
                {structuredThesis.dataGaps.join(' · ')}
              </div>
            )}
          </div>

          {/* Structured Contradictions */}
          {structuredContradictions && structuredContradictions.length > 0 && (
            <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-rose-900/40 font-mono text-xs text-rose-300">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Detected Contradictions ({structuredContradictions.length})
                </span>
                <span className="text-[10px] bg-rose-900/50 px-2 py-0.5 rounded font-bold">
                  UNRESOLVED CONFLICTS
                </span>
              </div>
              <div className="space-y-2">
                {structuredContradictions.map((c) => (
                  <div key={c.id} className="p-2 bg-neutral-950/80 border border-rose-950 rounded text-[11px] font-sans">
                    <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                      <span className="text-rose-400 font-bold uppercase">{c.category.replace(/_/g, ' ')}</span>
                      <span className="text-neutral-500">Severity: {c.severity}</span>
                    </div>
                    <p className="text-neutral-300 leading-snug">{c.conflictDescription}</p>
                    <div className="grid grid-cols-2 gap-2 mt-1.5 pt-1.5 border-t border-neutral-800/50 font-mono text-[10px] text-neutral-400">
                      <div><span className="text-neutral-500">A: </span>{c.statementA}</div>
                      <div><span className="text-neutral-500">B: </span>{c.statementB}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invalidation Conditions */}
          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 block mb-1.5 font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Invalidation Conditions & Trigger Status
            </span>
            {structuredInvalidation && structuredInvalidation.length > 0 ? (
              <div className="space-y-2 font-mono text-[11px]">
                {structuredInvalidation.map((cond) => (
                  <div key={cond.id} className="p-2 bg-neutral-900/40 border border-neutral-800 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-neutral-300 font-bold">{cond.description}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          cond.triggered
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {cond.evaluationStatus}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-500">
                      <span>Current: <span className="text-neutral-300">{cond.currentValue}</span></span>
                      <span>Trigger: <span className="text-neutral-400">{cond.triggerCondition}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-1.5 text-neutral-300 list-disc list-inside font-sans">
                {invalidationConditions.map((cond, idx) => (
                  <li key={idx} className="leading-snug">{cond}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Session Relevance & Watch Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Institutional Session
              </span>
              <p className="font-bold text-neutral-200 font-mono text-sm">{sessionRelevance.primarySession}</p>
              <p className="text-neutral-400 text-[11px] mt-1 font-sans">{sessionRelevance.structuralRationale}</p>
            </div>

            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 block mb-1">
                Watch Window State
              </span>
              <p className="font-bold text-neutral-200 font-mono text-sm">{watchWindow.watchState}</p>
              <p className="text-neutral-400 text-[11px] font-mono mt-1">Window: {watchWindow.watchWindow}</p>
            </div>
          </div>

          {/* Evidence Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block mb-1.5 font-semibold">
                Supporting Evidence ({supportingEvidence.length})
              </span>
              <ul className="space-y-1 text-neutral-300 list-disc list-inside">
                {supportingEvidence.map((ev, idx) => (
                  <li key={idx} className="leading-snug">{ev}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 block mb-1.5 font-semibold">
                Counter-Evidence / Risks ({counterEvidence.length})
              </span>
              <ul className="space-y-1 text-neutral-300 list-disc list-inside">
                {counterEvidence.map((ev, idx) => (
                  <li key={idx} className="leading-snug">{ev}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Catalysts & Event Intelligence */}
          <div className="border-t border-neutral-800 pt-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-2 font-semibold">
              Relevant Macro Catalysts ({catalystIntelligence?.length ?? catalysts.length})
            </span>
            {(catalystIntelligence && catalystIntelligence.length > 0) ? (
              <div className="space-y-2 font-mono text-[11px]">
                {catalystIntelligence.map((cat) => (
                  <div key={cat.id} className="p-2.5 bg-neutral-900/60 border border-neutral-800 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-200 text-xs">{cat.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">({cat.currency})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            cat.lifecycle === 'IMMINENT'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                              : cat.lifecycle === 'REACTING'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {cat.lifecycle}
                        </span>
                        <span className={`text-[10px] font-bold ${cat.importance === 'HIGH' ? 'text-rose-400' : 'text-amber-400'}`}>
                          {cat.importance}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-neutral-400 my-1">
                      <div>Prev: <span className="text-neutral-300">{cat.previous !== null ? `${cat.previous}${cat.unit}` : 'N/A'}</span></div>
                      <div>Consensus: <span className="text-neutral-300">{cat.forecast !== null ? `${cat.forecast}${cat.unit}` : 'N/A'}</span></div>
                      <div>Actual: <span className="font-bold text-neutral-100">{cat.actual !== null ? `${cat.actual}${cat.unit}` : 'PENDING'}</span></div>
                    </div>
                    <div className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/50 flex justify-between items-center">
                      <span className="text-neutral-500 font-sans">{cat.timingRelevance.windowDescription}</span>
                      {cat.directionalEvidence.bias !== 'UNKNOWN' && (
                        <span className={`font-bold ${cat.directionalEvidence.bias === 'BULLISH' ? 'text-emerald-400' : cat.directionalEvidence.bias === 'BEARISH' ? 'text-rose-400' : 'text-neutral-400'}`}>
                          {cat.directionalEvidence.bias} BIAS
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : catalysts.length === 0 ? (
              <p className="text-neutral-500 italic font-mono text-[11px]">No upcoming events for {pair.symbol}.</p>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {catalysts.map((cat) => (
                  <div key={cat.id} className="p-2 bg-neutral-900/50 border border-neutral-800 rounded flex justify-between items-center">
                    <div>
                      <span className="font-bold text-neutral-200 block text-xs">{cat.name}</span>
                      <span className="text-neutral-500 text-[10px]">Date: {new Date(cat.scheduledTime).toUTCString()}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${cat.importance === 'HIGH' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {cat.importance}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
