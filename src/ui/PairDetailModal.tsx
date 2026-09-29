import React from 'react';
import { X, TrendingUp, TrendingDown, Clock, ShieldAlert, ArrowLeftRight, Scale, AlertTriangle } from 'lucide-react';
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

  const delta = relativeStrengthDelta;
  const deltaLabel =
    delta === null
      ? 'MARKET Δ UNAVAILABLE'
      : `Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`;
  const isBullish = orientationDirection === 'BULLISH_BASE';
  const isBearish = orientationDirection === 'BEARISH_BASE';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-velqo-ink/80 backdrop-blur-md">
      <div className="velqo-scroll h-full w-full max-w-2xl overflow-y-auto border-l border-white/[0.06] bg-velqo-ink/95 px-4 py-5 text-slate-200 sm:px-7 sm:py-7">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between border-b border-white/[0.06] pb-4">
          <div>
            <p className="velqo-eyebrow mb-1.5">Pair evidence</p>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="velqo-display text-2xl text-white sm:text-3xl">
                {pair.symbol}
              </span>
              <span className="text-[0.72rem] text-slate-500">
                {baseCurrency.code} base · {quoteCurrency.code} quote
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onSelectCurrency?.(baseCurrency.code)}
                className="text-[0.75rem] text-teal-300 transition-colors hover:text-teal-200 hover:underline"
              >
                Inspect {baseCurrency.code}
              </button>
              <button
                onClick={() => onSelectCurrency?.(quoteCurrency.code)}
                className="text-[0.75rem] text-teal-300 transition-colors hover:text-teal-200 hover:underline"
              >
                Inspect {quoteCurrency.code}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.07] text-slate-400 transition-colors hover:border-teal-400/30 hover:text-teal-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Macro Bias Banner */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
              <span className="velqo-eyebrow">Macro relative bias</span>
              <div className="flex flex-wrap items-center gap-2">
                {structuredOpportunity && (
                  <span
                    className={`velqo-chip !py-0.5 !text-[0.62rem] ${
                      structuredOpportunity.state === 'PRIMARY_WATCH'
                        ? '!border-teal-400/30 !text-teal-200'
                        : structuredOpportunity.state === 'SECONDARY_WATCH'
                        ? '!border-sky-400/30 !text-sky-200'
                        : structuredOpportunity.state === 'WAIT'
                        ? '!border-rose-400/30 !text-rose-200'
                        : '!border-white/10 !text-slate-400'
                    }`}
                  >
                    {structuredOpportunity.state}
                  </span>
                )}
                <span className="text-[0.75rem] font-semibold">
                  {delta === null ? (
                    <span className="flex items-center text-amber-200">
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                      Macro-derived bias · {deltaLabel}
                      {intelligence.marketEvidenceState === 'STALE' ? ' (stale)' : ''}
                    </span>
                  ) : isBullish ? (
                    <span className="flex items-center text-teal-200">
                      <TrendingUp className="mr-1 h-3.5 w-3.5" /> Bullish bias ({deltaLabel})
                    </span>
                  ) : isBearish ? (
                    <span className="flex items-center text-rose-200">
                      <TrendingDown className="mr-1 h-3.5 w-3.5" /> Bearish bias ({deltaLabel})
                    </span>
                  ) : (
                    <span className="text-slate-400">Balanced ({deltaLabel})</span>
                  )}
                </span>
              </div>
            </div>
            <p className="leading-relaxed text-slate-300">{orientationExplanation}</p>
            {structuredOpportunity && (
              <p className="mt-2 border-t border-white/[0.06] pt-2 text-[0.72rem] text-slate-400">
                <span className="velqo-eyebrow mb-1 block">Why this pair</span>
                {structuredOpportunity.whyThisPair}
              </p>
            )}
          </div>

          {/* Confluence & Directional Confidence Breakdown */}
          {intelligence.confluence && (
            <div className="rounded-2xl border border-teal-400/[0.14] bg-teal-400/[0.03] px-3.5 py-3">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
                <span className="text-[0.78rem] font-semibold text-teal-200">Multi-factor confluence</span>
                <div className="flex items-center gap-2">
                  <span className="tnum rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[0.7rem] font-semibold text-slate-200">
                    {intelligence.confluence.confluenceScore}/100
                  </span>
                  <span className="text-[0.65rem] text-sky-200">
                    {intelligence.confluence.directionalConfidence} confidence
                  </span>
                </div>
              </div>

              <p className="text-[0.72rem] leading-relaxed text-slate-400">
                {intelligence.confluence.explanation}
              </p>

              {/* Evidence Inventory Tags */}
              <div className="flex flex-wrap items-center gap-1.5 text-[0.65rem]">
                {intelligence.confluence.availableComponents && intelligence.confluence.availableComponents.length > 0 && (
                  <span className="rounded-full border border-teal-400/25 bg-teal-400/[0.07] px-2 py-0.5 text-teal-200">
                    Active: {intelligence.confluence.availableComponents.join(', ')}
                  </span>
                )}
                {intelligence.confluence.missingComponents && intelligence.confluence.missingComponents.length > 0 && (
                  <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.07] px-2 py-0.5 text-rose-200">
                    Missing: {intelligence.confluence.missingComponents.join(', ')}
                  </span>
                )}
                {intelligence.confluence.referenceOnlyComponents && intelligence.confluence.referenceOnlyComponents.length > 0 && (
                  <span className="rounded-full border border-violet-400/25 bg-violet-400/[0.07] px-2 py-0.5 text-violet-200">
                    Reference only: {intelligence.confluence.referenceOnlyComponents.join(', ')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[0.68rem] sm:grid-cols-3">
                {/* 1. Market Strength */}
                <div className="flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.62rem] font-medium uppercase tracking-wide text-slate-500">MARKET STRENGTH</span>
                    <span className={`velqo-chip !px-1.5 !py-0 !text-[0.58rem] ${
                      intelligence.confluence.components.marketStrength.availability === 'AVAILABLE'
                        ? '!border-teal-400/30 !text-teal-200'
                        : '!border-white/10 !text-slate-400'
                    }`}>
                      {intelligence.confluence.components.marketStrength.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className="text-[0.78rem] font-semibold text-teal-200">
                    +{intelligence.confluence.components.marketStrength.points}/25 pts
                  </span>
                  <span className="mt-1 truncate text-[0.6rem] text-slate-600">
                    {intelligence.confluence.components.marketStrength.source || 'Biquote'} · {intelligence.confluence.components.marketStrength.freshness || 'FRESH'}
                  </span>
                </div>

                {/* 2. Fundamentals */}
                <div className="flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.62rem] font-medium uppercase tracking-wide text-slate-500">FUNDAMENTALS</span>
                    <span className={`velqo-chip !px-1.5 !py-0 !text-[0.58rem] ${
                      intelligence.confluence.components.fundamentals.availability === 'AVAILABLE'
                        ? '!border-teal-400/30 !text-teal-200'
                        : intelligence.confluence.components.fundamentals.availability === 'UNAVAILABLE'
                        ? '!border-rose-400/30 !text-rose-200'
                        : '!border-amber-400/30 !text-amber-200'
                    }`}>
                      {intelligence.confluence.components.fundamentals.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className={`font-bold text-xs ${
                    intelligence.confluence.components.fundamentals.points > 0 ? 'text-teal-200' : 'text-slate-500'
                  }`}>
                    +{intelligence.confluence.components.fundamentals.points}/20 pts
                  </span>
                  <span className="mt-1 truncate text-[0.6rem] text-slate-600">
                    {intelligence.confluence.components.fundamentals.source || 'Finance Calendar'} · {intelligence.confluence.components.fundamentals.freshness || 'FRESH'}
                  </span>
                </div>

                {/* 3. Policy & Carry */}
                <div className="flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.62rem] font-medium uppercase tracking-wide text-slate-500">POLICY & CARRY</span>
                    <span className={`velqo-chip !px-1.5 !py-0 !text-[0.58rem] ${
                      intelligence.confluence.components.policy.availability === 'AVAILABLE'
                        ? '!border-teal-400/30 !text-teal-200'
                        : intelligence.confluence.components.policy.availability === 'REFERENCE_ONLY'
                        ? '!border-violet-400/30 !text-violet-200'
                        : '!border-white/10 !text-slate-400'
                    }`}>
                      {intelligence.confluence.components.policy.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className={`font-bold text-xs ${
                    intelligence.confluence.components.policy.points > 0 ? 'text-teal-200' : 'text-slate-500'
                  }`}>
                    +{intelligence.confluence.components.policy.points}/20 pts
                  </span>
                  <span className="mt-1 truncate text-[0.6rem] text-slate-600">
                    {intelligence.confluence.components.policy.source || 'Central Bank'} · {intelligence.confluence.components.policy.freshness || 'REFERENCE'}
                  </span>
                </div>

                {/* 4. Expectations */}
                <div className="flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.62rem] font-medium uppercase tracking-wide text-slate-500">EXPECTATIONS</span>
                    <span className={`velqo-chip !px-1.5 !py-0 !text-[0.58rem] ${
                      intelligence.confluence.components.expectations.availability === 'AVAILABLE'
                        ? '!border-teal-400/30 !text-teal-200'
                        : intelligence.confluence.components.expectations.availability === 'PARTIAL'
                        ? '!border-amber-400/30 !text-amber-200'
                        : '!border-rose-400/30 !text-rose-200'
                    }`}>
                      {intelligence.confluence.components.expectations.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className={`font-bold text-xs ${
                    intelligence.confluence.components.expectations.points > 0 ? 'text-teal-200' : 'text-slate-500'
                  }`}>
                    +{intelligence.confluence.components.expectations.points}/15 pts
                  </span>
                  <span className="mt-1 truncate text-[0.6rem] text-slate-600">
                    {intelligence.confluence.components.expectations.source || 'Finance Calendar'} · {intelligence.confluence.components.expectations.freshness || 'FRESH'}
                  </span>
                </div>

                {/* 5. Session */}
                <div className="flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.62rem] font-medium uppercase tracking-wide text-slate-500">SESSION CONTEXT</span>
                    <span className="velqo-chip !border-teal-400/30 !px-1.5 !py-0 !text-[0.58rem] !text-teal-200">
                      AVAILABLE
                    </span>
                  </div>
                  <span className="text-[0.78rem] font-semibold text-teal-200">
                    +{intelligence.confluence.components.session.points}/10 pts
                  </span>
                  <span className="mt-1 truncate text-[0.6rem] text-slate-600">
                    Session · DERIVED
                  </span>
                </div>

                {/* 6. Catalysts */}
                <div className="flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.62rem] font-medium uppercase tracking-wide text-slate-500">CATALYSTS & RISK</span>
                    <span className={`velqo-chip !px-1.5 !py-0 !text-[0.58rem] ${
                      intelligence.confluence.components.catalysts.availability === 'AVAILABLE'
                        ? '!border-teal-400/30 !text-teal-200'
                        : '!border-rose-400/30 !text-rose-200'
                    }`}>
                      {intelligence.confluence.components.catalysts.availability || 'AVAILABLE'}
                    </span>
                  </div>
                  <span className="text-[0.78rem] font-semibold text-teal-200">
                    +{intelligence.confluence.components.catalysts.points}/10 pts
                  </span>
                  <span className="mt-1 truncate text-[0.6rem] text-slate-600">
                    {intelligence.confluence.components.catalysts.source || 'Finance Calendar'} · {intelligence.confluence.components.catalysts.freshness || 'FRESH'}
                  </span>
                </div>
              </div>

              {intelligence.confluence.components.contradictionPenalty.penaltyPoints > 0 && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] px-3 py-2 text-[0.72rem] text-rose-200">
                  <span className="mb-1 block font-semibold">
                    Contradiction deduction · −{intelligence.confluence.components.contradictionPenalty.penaltyPoints} pts
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
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
                <span className="flex items-center gap-1.5 text-[0.78rem] font-semibold text-slate-200">
                  <Scale className="h-3.5 w-3.5 text-sky-300" /> Fundamental differential
                </span>
                <span className="text-[0.65rem] text-sky-200">
                  {fundamentalDifferential.dataQuality}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[0.75rem]">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <span className="mb-0.5 block text-[0.6rem] uppercase tracking-wide text-slate-500">Market Δ</span>
                  <span className="font-semibold text-slate-200 tnum">
                    {fundamentalDifferential.marketStrengthDifferential !== null
                      ? `${fundamentalDifferential.marketStrengthDifferential >= 0 ? '+' : ''}${fundamentalDifferential.marketStrengthDifferential.toFixed(2)}%`
                      : 'n/a'}
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <span className="mb-0.5 block text-[0.6rem] uppercase tracking-wide text-slate-500">Fundamental Δ</span>
                  <span className="font-semibold text-slate-200 tnum">
                    {fundamentalDifferential.fundamentalDifferential.delta !== null
                      ? `${fundamentalDifferential.fundamentalDifferential.delta >= 0 ? '+' : ''}${fundamentalDifferential.fundamentalDifferential.delta.toFixed(2)}`
                      : 'n/a'}
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                  <span className="mb-0.5 block text-[0.6rem] uppercase tracking-wide text-slate-500">Policy spread</span>
                  <span className="font-semibold text-slate-200 tnum">
                    {fundamentalDifferential.policyDifferential.rateSpread !== null
                      ? `${fundamentalDifferential.policyDifferential.rateSpread >= 0 ? '+' : ''}${fundamentalDifferential.policyDifferential.rateSpread.toFixed(2)}%`
                      : 'n/a'}
                  </span>
                </div>
              </div>

              {/* Policy Stance Comparison */}
              <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[0.75rem] text-slate-300">
                <span className="velqo-eyebrow mb-1 block">Policy divergence</span>
                {fundamentalDifferential.policyDifferential.stanceDelta}
              </div>

              {/* Expectations Comparison */}
              <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[0.75rem] text-slate-300">
                <span className="velqo-eyebrow mb-1 block">Expectations momentum</span>
                {fundamentalDifferential.expectationsDifferential.comparison}
              </div>
            </div>
          )}

          {/* Convergence / Divergence */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
              <span className="flex items-center gap-1.5 text-[0.78rem] font-semibold text-slate-200">
                <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" /> Market vs fundamental alignment
              </span>
              <span
                className={`text-[0.7rem] font-semibold ${
                  convergenceDivergence === 'CONVERGENCE'
                    ? 'text-teal-200'
                    : convergenceDivergence === 'DIVERGENCE'
                    ? 'text-rose-200'
                    : 'text-amber-200'
                }`}
              >
                {convergenceDivergence}
              </span>
            </div>
            <p className="leading-relaxed text-slate-300">{convergenceExplanation}</p>
          </div>

          {/* Structural Thesis */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
              <span className="text-[0.78rem] font-semibold text-slate-200">Structural macro thesis</span>
              {structuredThesis && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`velqo-chip !py-0.5 !text-[0.62rem] ${
                      structuredThesis.status === 'SUPPORTED'
                        ? '!border-teal-400/30 !text-teal-200'
                        : structuredThesis.status === 'MIXED'
                        ? '!border-amber-400/30 !text-amber-200'
                        : structuredThesis.status === 'WEAKENED'
                        ? '!border-orange-400/30 !text-orange-200'
                        : structuredThesis.status === 'INVALIDATED'
                        ? '!border-rose-400/30 !text-rose-200'
                        : '!border-white/10 !text-slate-400'
                    }`}
                  >
                    {structuredThesis.status}
                  </span>
                  <span className="text-[0.65rem] text-slate-500">
                    {structuredThesis.evidenceQuality}
                  </span>
                </div>
              )}
            </div>
            <p className="leading-relaxed text-slate-200">
              {structuredThesis?.summary || thesis}
            </p>
            {structuredThesis && structuredThesis.dataGaps.length > 0 && (
              <div className="mt-2 border-t border-white/[0.06] pt-2 text-[0.7rem] text-slate-500">
                <span className="text-amber-200">Known gaps: </span>
                {structuredThesis.dataGaps.join(' · ')}
              </div>
            )}
          </div>

          {/* Structured Contradictions */}
          {structuredContradictions && structuredContradictions.length > 0 && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] px-3.5 py-3">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-rose-400/15 pb-1.5">
                <span className="flex items-center gap-1.5 text-[0.78rem] font-semibold text-rose-200">
                  <ShieldAlert className="h-3.5 w-3.5" /> Detected contradictions ({structuredContradictions.length})
                </span>
                <span className="velqo-chip !py-0.5 !text-[0.6rem] !border-rose-400/30 !text-rose-200">
                  Unresolved conflicts
                </span>
              </div>
              <div className="space-y-2">
                {structuredContradictions.map((c) => (
                  <div key={c.id} className="rounded-xl border border-rose-400/15 bg-velqo-ink/60 px-3 py-2 text-[0.75rem]">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[0.65rem]">
                      <span className="font-semibold text-rose-200">{c.category.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500">Severity {c.severity}</span>
                    </div>
                    <p className="leading-snug text-slate-300">{c.conflictDescription}</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-1.5 text-[0.68rem] text-slate-400">
                      <div><span className="text-slate-500">A: </span>{c.statementA}</div>
                      <div><span className="text-slate-500">B: </span>{c.statementB}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invalidation Conditions */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <span className="mb-2 flex items-center gap-1.5 text-[0.78rem] font-semibold text-rose-200">
              <ShieldAlert className="h-3.5 w-3.5" /> Invalidation conditions and trigger status
            </span>
            {structuredInvalidation && structuredInvalidation.length > 0 ? (
              <div className="space-y-2 text-[0.75rem]">
                {structuredInvalidation.map((cond) => (
                  <div key={cond.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-300">{cond.description}</span>
                      <span
                        className={`velqo-chip !py-0.5 !text-[0.6rem] ${
                          cond.triggered
                            ? '!border-rose-400/30 !text-rose-200'
                            : '!border-teal-400/30 !text-teal-200'
                        }`}
                      >
                        {cond.evaluationStatus}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-[0.68rem] text-slate-500">
                      <span>Current <span className="text-slate-300 tnum">{cond.currentValue}</span></span>
                      <span>Trigger <span className="text-slate-400">{cond.triggerCondition}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="list-inside list-disc space-y-1.5 text-slate-300">
                {invalidationConditions.map((cond, idx) => (
                  <li key={idx} className="leading-snug">{cond}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Session Relevance & Watch Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <span className="velqo-eyebrow mb-1.5 block !text-sky-200/80">
                Institutional session
              </span>
              <p className="text-[0.9rem] font-semibold text-slate-100">{sessionRelevance.primarySession}</p>
              <p className="mt-1 text-[0.72rem] text-slate-400">{sessionRelevance.structuralRationale}</p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <span className="velqo-eyebrow mb-1.5 block !text-amber-200/80">
                Watch window
              </span>
              <p className="text-[0.9rem] font-semibold text-slate-100">{watchWindow.watchState}</p>
              <p className="mt-1 text-[0.72rem] text-slate-400">{watchWindow.watchWindow}</p>
            </div>
          </div>

          {/* Evidence Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <span className="mb-2 block text-[0.78rem] font-semibold text-teal-200">
                Supporting evidence ({supportingEvidence.length})
              </span>
              <ul className="list-inside list-disc space-y-1 text-slate-300">
                {supportingEvidence.map((ev, idx) => (
                  <li key={idx} className="leading-snug">{ev}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <span className="mb-2 block text-[0.78rem] font-semibold text-rose-200">
                Counter-evidence and risks ({counterEvidence.length})
              </span>
              <ul className="list-inside list-disc space-y-1 text-slate-300">
                {counterEvidence.map((ev, idx) => (
                  <li key={idx} className="leading-snug">{ev}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Catalysts & Event Intelligence */}
          <div className="border-t border-white/[0.06] pt-3">
            <span className="mb-2 block text-[0.78rem] font-semibold text-slate-200">
              Relevant Macro Catalysts ({catalystIntelligence?.length ?? catalysts.length})
            </span>
            {(catalystIntelligence && catalystIntelligence.length > 0) ? (
              <div className="space-y-2 text-[0.75rem]">
                {catalystIntelligence.map((cat) => (
                  <div key={cat.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.78rem] font-semibold text-slate-200">{cat.name}</span>
                        <span className="text-[0.68rem] text-slate-500">({cat.currency})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`velqo-chip !py-0.5 !text-[0.6rem] ${
                            cat.lifecycle === 'IMMINENT'
                              ? 'animate-pulse !border-rose-400/30 !text-rose-200'
                              : cat.lifecycle === 'REACTING'
                              ? '!border-amber-400/30 !text-amber-200'
                              : '!border-white/10 !text-slate-400'
                          }`}
                        >
                          {cat.lifecycle}
                        </span>
                        <span className={`text-[0.68rem] font-semibold ${cat.importance === 'HIGH' ? 'text-rose-200' : 'text-amber-200'}`}>
                          {cat.importance}
                        </span>
                      </div>
                    </div>
                    <div className="my-1.5 grid grid-cols-3 gap-2 text-[0.68rem] text-slate-400">
                      <div>Prev <span className="text-slate-300 tnum">{cat.previous !== null ? `${cat.previous}${cat.unit}` : 'n/a'}</span></div>
                      <div>Consensus <span className="text-slate-300 tnum">{cat.forecast !== null ? `${cat.forecast}${cat.unit}` : 'n/a'}</span></div>
                      <div>Actual <span className="font-semibold text-slate-100 tnum">{cat.actual !== null ? `${cat.actual}${cat.unit}` : 'pending'}</span></div>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-1 text-[0.68rem] text-slate-400">
                      <span className="text-slate-500">{cat.timingRelevance.windowDescription}</span>
                      {cat.directionalEvidence.bias !== 'UNKNOWN' && (
                        <span className={`font-semibold ${cat.directionalEvidence.bias === 'BULLISH' ? 'text-teal-200' : cat.directionalEvidence.bias === 'BEARISH' ? 'text-rose-200' : 'text-slate-400'}`}>
                          {cat.directionalEvidence.bias} BIAS
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : catalysts.length === 0 ? (
              <p className="text-[0.75rem] italic text-slate-500">No upcoming events for {pair.symbol}.</p>
            ) : (
              <div className="space-y-1.5 text-[0.75rem]">
                {catalysts.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div>
                      <span className="block text-[0.78rem] font-semibold text-slate-200">{cat.name}</span>
                      <span className="text-[0.68rem] text-slate-500">{new Date(cat.scheduledTime).toUTCString()}</span>
                    </div>
                    <span className={`text-[0.68rem] font-semibold ${cat.importance === 'HIGH' ? 'text-rose-200' : 'text-amber-200'}`}>
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
