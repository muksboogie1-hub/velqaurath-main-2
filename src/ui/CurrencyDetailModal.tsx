import React, { useState } from 'react';
import { X, ExternalLink, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { CurrencyState, EconomicEvent } from '../types';
import { FUNDAMENTAL_CATEGORIES, FundamentalCategory } from '../types/fundamentals';
import { ECONOMIC_INDICATORS } from '../data/indicators';
import { analyzeObservationExpectations } from '../engines/expectations/expectationsEngine';
import { evidenceLabel } from './feedStatus';

interface CurrencyDetailModalProps {
  currencyState: CurrencyState | null;
  events: EconomicEvent[];
  onClose: () => void;
  onSelectPair?: (symbol: string) => void;
}

export const CurrencyDetailModal: React.FC<CurrencyDetailModalProps> = ({
  currencyState,
  events,
  onClose,
  onSelectPair
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FundamentalCategory | 'ALL'>('ALL');

  if (!currencyState) return null;

  const {
    currency,
    marketStrength,
    marketState,
    relativeStrengthBreakdown,
    fundamentalState,
    centralBank,
    overallState,
    supportingEvidence,
    conflictingEvidence,
    confidenceMetadata
  } = currencyState;

  const upcomingEvents = events.filter((e) => e.currency === currency.code);

  // Analyze observations for this currency with strict Fact vs Interpretation
  const currencyObservations = (currencyState as any).observations || [];
  const analyzedExpectations = currencyObservations.map((obs: any) => {
    const meta = ECONOMIC_INDICATORS.find((i) => i.name === obs.indicatorName || i.id === obs.indicatorId);
    return analyzeObservationExpectations(obs, meta);
  });

  const beats = analyzedExpectations.filter((a: any) => a.expectationStatus === 'ABOVE_EXPECTATION').length;
  const misses = analyzedExpectations.filter((a: any) => a.expectationStatus === 'BELOW_EXPECTATION').length;
  const inLine = analyzedExpectations.filter((a: any) => a.expectationStatus === 'IN_LINE').length;
  const unknown = analyzedExpectations.filter((a: any) => a.expectationStatus === 'UNKNOWN').length;
  const evidenceCount = currencyObservations.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-velqo-ink/80 backdrop-blur-md">
      <div className="velqo-scroll h-full w-full max-w-2xl overflow-y-auto border-l border-white/[0.06] bg-velqo-ink/95 px-4 py-5 text-slate-200 sm:px-7 sm:py-7">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between border-b border-white/[0.06] pb-4">
          <div>
            <p className="velqo-eyebrow mb-1.5">Currency evidence</p>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="velqo-display text-2xl text-white sm:text-3xl">
                {currency.code}
              </span>
              <span className="text-[0.72rem] text-slate-500">
                {currency.name} · {currency.region}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>Market</span>
                <span
                  className={`font-semibold ${
                    marketState === 'STRONG'
                      ? 'text-teal-200'
                      : marketState === 'WEAK'
                      ? 'text-rose-200'
                      : 'text-slate-300'
                  }`}
                >
                  {marketStrength !== null ? `${marketStrength >= 0 ? '+' : ''}${marketStrength.toFixed(2)}% (${marketState})` : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Fundamentals</span>
                <span className="font-semibold text-sky-200">
                  {evidenceLabel(fundamentalState.overallCondition)}
                </span>
              </div>
            </div>

            {/*
             * Market strength and the fundamental score are independent
             * verdicts. A currency can carry a real market reading while its
             * fundamental layer has evidence but no scorable baseline, and the
             * user must be told which is which rather than shown a bare
             * DATA_UNAVAILABLE beside a percentage.
             */}
            {marketStrength !== null &&
              fundamentalState.overallCondition === 'DATA_UNAVAILABLE' && (
                <p className="mt-2 text-[0.7rem] leading-relaxed text-slate-500">
                  Market evidence is current and scored. The fundamental layer carries{' '}
                  {evidenceCount > 0
                    ? `${evidenceCount} live observation${evidenceCount === 1 ? '' : 's'} but no verified consensus baseline, so no fundamental score is calculated.`
                    : 'no source-identified live observations yet, so no fundamental score is calculated.'}
                  Neither reading contradicts the other.
                </p>
              )}
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
          {/* Market Strength Section */}
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
              <div>
                <h3 className="text-[0.82rem] font-semibold text-slate-100">
                  Market Strength Intelligence
                </h3>
                <span className="text-[0.68rem] text-slate-500">
                  Basket-Relative Movement · Strong ≥ +0.10% · Weak ≤ -0.10%
                </span>
              </div>
              <span
                className={`text-[0.82rem] font-semibold ${
                  marketState === 'STRONG'
                    ? 'text-teal-200'
                    : marketState === 'WEAK'
                    ? 'text-rose-200'
                    : 'text-slate-300'
                }`}
              >
                {marketStrength !== null ? `${marketStrength >= 0 ? '+' : ''}${marketStrength.toFixed(2)}%` : 'unavailable'} ({marketState})
              </span>
            </div>

            <div className="mb-2 grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[0.75rem]">
              <div>
                <span className="mb-0.5 block text-[0.6rem] uppercase tracking-wide text-slate-500">Basket-Relative Strength</span>
                <span className="font-semibold text-slate-100 tnum">
                  {marketStrength !== null ? `${marketStrength >= 0 ? '+' : ''}${marketStrength.toFixed(2)}%` : 'unavailable'}
                </span>
              </div>
              <div>
                <span className="mb-0.5 block text-[0.6rem] uppercase tracking-wide text-slate-500">Raw Basket Daily Avg</span>
                <span className="text-slate-300 tnum">
                  {relativeStrengthBreakdown.dailyMovementPercent !== undefined && relativeStrengthBreakdown.dailyMovementPercent !== null
                    ? `${relativeStrengthBreakdown.dailyMovementPercent >= 0 ? '+' : ''}${relativeStrengthBreakdown.dailyMovementPercent.toFixed(2)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>

            <p className="mb-2 leading-relaxed text-slate-300">
              {relativeStrengthBreakdown.explanation}
            </p>
            {relativeStrengthBreakdown.contributors && (
              <div className="mt-2 border-t border-white/[0.06] pt-2">
                <span className="velqo-eyebrow mb-2 block">
                  Pair Contributors ({relativeStrengthBreakdown.contributors.length})
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[0.72rem] sm:grid-cols-3">
                  {relativeStrengthBreakdown.contributors.map((c) => (
                    <div
                      key={c.pairSymbol}
                      onClick={() => onSelectPair?.(c.pairSymbol)}
                      className="flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 transition-colors hover:border-teal-400/25"
                    >
                      <span className="text-slate-300 tnum">{c.pairSymbol}</span>
                      <span
                        className={
                          c.signedContribution > 0
                            ? 'text-teal-200'
                            : c.signedContribution < 0
                            ? 'text-rose-200'
                            : 'text-slate-500'
                        }
                      >
                        {c.signedContribution >= 0 ? '+' : ''}
                        {c.signedContribution.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Central Bank Intelligence Profile */}
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
              <h3 className="text-[0.82rem] font-semibold text-slate-100">
                Central Bank Intelligence: {centralBank.institution}
              </h3>
              <span
                className={`text-[0.82rem] font-semibold ${
                  centralBank.stance === 'HAWKISH'
                    ? 'text-teal-200'
                    : centralBank.stance === 'DOVISH'
                    ? 'text-rose-200'
                    : 'text-slate-300'
                }`}
              >
                {centralBank.stance} ({centralBank.currentPolicyRate !== null ? `${centralBank.currentPolicyRate}%` : 'rate unavailable'})
              </span>
            </div>
            <div className="mb-2.5 grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[0.75rem]">
              <div>
                <span className="mb-0.5 block text-[0.6rem] uppercase tracking-wide text-slate-500">Current policy rate</span>
                <span className="font-semibold text-slate-100 tnum">{centralBank.currentPolicyRate !== null ? `${centralBank.currentPolicyRate}%` : 'unavailable'}</span>
              </div>
              <div>
                <span className="mb-0.5 block text-[0.6rem] uppercase tracking-wide text-slate-500">Previous policy rate</span>
                <span className="text-slate-300 tnum">{centralBank.previousPolicyRate !== null ? `${centralBank.previousPolicyRate}%` : 'unavailable'}</span>
              </div>
              <div>
                <span className="mb-0.5 block text-[0.6rem] uppercase tracking-wide text-slate-500">Latest decision</span>
                <span className="text-slate-300 tnum">{centralBank.latestDecisionDate ? new Date(centralBank.latestDecisionDate).toLocaleDateString() : 'unavailable'}</span>
              </div>
              <div>
                <span className="mb-0.5 block text-[0.6rem] uppercase tracking-wide text-slate-500">Next known decision</span>
                <span className="text-slate-300 tnum">{centralBank.nextKnownDecisionDate ? new Date(centralBank.nextKnownDecisionDate).toLocaleDateString() : 'Not announced'}</span>
              </div>
            </div>
            <p className="mb-2 leading-relaxed text-slate-300">
              {centralBank.guidanceSummary || 'Data dependent stance.'}
            </p>
            {centralBank.stanceEvidence.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2 text-[0.72rem] text-slate-400">
                <span className="velqo-eyebrow block">Policy evidence</span>
                {centralBank.stanceEvidence.map((ev, idx) => (
                  <p key={idx}>• {ev}</p>
                ))}
              </div>
            )}
          </section>

          {/* 10 Fundamental Categories Coverage */}
          {(() => {
            const observedCategoriesSet = new Set<string>();
            currencyObservations.forEach((obs: any) => {
              if (obs.category) observedCategoriesSet.add(obs.category);
            });
            if (centralBank.currentPolicyRate !== null || (centralBank.stance && centralBank.stance !== 'UNAVAILABLE')) {
              observedCategoriesSet.add('CENTRAL_BANK_MONETARY_POLICY');
            }
            const populatedCount = FUNDAMENTAL_CATEGORIES.filter((cat) => observedCategoriesSet.has(cat.id)).length;

            return (
              <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                  <h3 className="text-[0.82rem] font-semibold text-slate-100">
                    Fundamental category coverage
                  </h3>
                  <span className="text-[0.7rem] text-slate-400 tnum">
                    {populatedCount}/10 populated · {10 - populatedCount} awaiting live observations
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[0.7rem] sm:grid-cols-5">
                  {FUNDAMENTAL_CATEGORIES.map((cat) => {
                    const isObserved = observedCategoriesSet.has(cat.id);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`min-h-11 cursor-pointer rounded-xl border px-1.5 py-1.5 text-center transition-colors ${
                          selectedCategory === cat.id
                            ? 'border-teal-400/40 bg-teal-400/[0.08]'
                            : isObserved
                            ? 'border-white/[0.08] bg-white/[0.03] hover:border-teal-400/25'
                            : 'border-white/[0.04] bg-white/[0.01] opacity-60'
                        }`}
                      >
                        <span className="block truncate font-semibold text-slate-200">{cat.code}</span>
                        <span
                          className={`block text-[0.6rem] ${
                            isObserved ? 'font-semibold text-teal-200' : 'text-slate-500'
                          }`}
                        >
                          {isObserved ? 'Populated' : 'Awaiting data'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* Expectations Breakdown */}
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
              <span className="text-[0.82rem] font-semibold text-slate-100">
                Macroeconomic expectations
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[0.68rem]">
                <span className="font-semibold text-teal-200 tnum">{beats} beats</span>
                <span className="font-semibold text-rose-200 tnum">{misses} misses</span>
                <span className="text-slate-400 tnum">{inLine} in line</span>
                {unknown > 0 && <span className="text-slate-500 tnum">{unknown} unknown</span>}
              </div>
            </div>

            {analyzedExpectations.length === 0 ? (
              <p className="text-[0.75rem] italic text-slate-500">
                No recorded releases available for {currency.code}.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {analyzedExpectations.map((exp: any, i: number) => (
                  <div key={i} className="space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[0.78rem]">
                      <span className="font-semibold text-slate-200">{exp.indicatorName}</span>
                      <span
                        className={`velqo-chip !py-0.5 !text-[0.6rem] ${
                          exp.expectationStatus === 'ABOVE_EXPECTATION'
                            ? '!border-teal-400/30 !text-teal-200'
                            : exp.expectationStatus === 'BELOW_EXPECTATION'
                            ? '!border-rose-400/30 !text-rose-200'
                            : exp.expectationStatus === 'IN_LINE'
                            ? '!border-white/10 !text-slate-300'
                            : '!border-white/[0.07] !text-slate-500'
                        }`}
                      >
                        {exp.expectationStatus.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Fact vs Expectation vs Interpretation vs Engine Analysis */}
                    <div className="space-y-1 text-[0.72rem]">
                      <div className="rounded-lg bg-white/[0.02] px-2 py-1 text-slate-300">
                        <span className="mr-1 font-semibold text-sky-200">Fact</span>
                        {exp.statements?.fact?.replace('FACT: ', '') || `Actual: ${exp.actual}${exp.unit}`}
                      </div>
                      <div className="rounded-lg bg-white/[0.02] px-2 py-1 text-slate-400">
                        <span className="mr-1 font-semibold text-amber-200">Expectation</span>
                        {exp.statements?.expectation?.replace('EXPECTATION: ', '') || `Forecast: ${exp.forecast}${exp.unit}`}
                      </div>
                      <div className="rounded-lg bg-white/[0.02] px-2 py-1 text-slate-300">
                        <span className="mr-1 font-semibold text-teal-200">Interpretation</span>
                        {exp.statements?.interpretation?.replace('INTERPRETATION: ', '') || exp.directionSummary}
                      </div>
                      <div className="rounded-lg bg-white/[0.02] px-2 py-1 text-slate-400">
                        <span className="mr-1 font-semibold text-violet-200">Engine analysis</span>
                        {exp.statements?.engineAnalysis?.replace('ENGINE_ANALYSIS: ', '') || exp.monetaryPolicyImplication}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Evidence Breakdown */}
          <section className="grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <span className="mb-2 block text-[0.78rem] font-semibold text-teal-200">
                Supporting evidence ({supportingEvidence.length})
              </span>
              {supportingEvidence.length === 0 ? (
                <p className="text-[0.75rem] italic text-slate-500">No strong confirming evidence.</p>
              ) : (
                <ul className="list-inside list-disc space-y-1.5 text-[0.72rem] text-slate-300">
                  {supportingEvidence.map((ev, i) => (
                    <li key={i} className="leading-tight">{ev}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <span className="mb-2 block text-[0.78rem] font-semibold text-rose-200">
                Counter-evidence and headwinds ({conflictingEvidence.length})
              </span>
              {conflictingEvidence.length === 0 ? (
                <p className="text-[0.75rem] italic text-slate-500">No material conflicting evidence.</p>
              ) : (
                <ul className="list-inside list-disc space-y-1.5 text-[0.72rem] text-slate-300">
                  {conflictingEvidence.map((ev, i) => (
                    <li key={i} className="leading-tight">{ev}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Data Gaps & Transparency */}
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <span className="mb-1.5 flex items-center gap-1.5 text-[0.78rem] font-semibold text-amber-200">
              <AlertCircle className="h-3.5 w-3.5" /> Data gaps and transparency
            </span>
            <p className="mb-2 text-[0.72rem] text-slate-400">
              VELQAURATH never fabricates economic indicators. The following categories currently have
              no live authenticated feed configured, so they are reported as gaps rather than estimated:
            </p>
            <div className="grid grid-cols-1 gap-1 text-[0.68rem] text-slate-500 sm:grid-cols-2">
              <div>• Fiscal / Government: Debt-to-GDP & budget balance not configured</div>
              <div>• Interest Rates: Sovereign yield curve feed not configured</div>
              <div>• Major Shocks: Systemic financial stress indices not configured</div>
              <div>• Market Expectations: OIS terminal rate pricing not configured</div>
            </div>
          </section>

          {/* Upcoming Catalysts */}
          <section className="border-t border-white/[0.06] pt-4">
            <h3 className="mb-2 text-[0.82rem] font-semibold text-slate-100">
              Upcoming Scheduled Catalysts ({upcomingEvents.length})
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-[0.75rem] italic text-slate-500">No scheduled upcoming events in horizon.</p>
            ) : (
              <div className="space-y-1.5 text-[0.72rem]">
                {upcomingEvents.map((e, idx) => (
                  <div key={`${e.id || 'evt'}-${idx}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div>
                      <span className="block text-[0.78rem] font-semibold text-slate-200">{e.name}</span>
                      <span className="text-[0.68rem] text-slate-500">{new Date(e.scheduledTime).toUTCString()}</span>
                    </div>
                    <span className={`text-[0.68rem] font-semibold ${e.importance === 'HIGH' ? 'text-rose-200' : 'text-amber-200'}`}>
                      {e.importance}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Source Provenance */}
          <section className="flex flex-col justify-between gap-2 border-t border-white/[0.06] pt-4 text-[0.68rem] text-slate-500 sm:flex-row sm:items-center">
            <div>
              <span>Source: {centralBank.sourceMetadata.sourceName}</span>
              {centralBank.sourceMetadata.sourceUrl && (
                <a
                  href={centralBank.sourceMetadata.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 inline-flex items-center gap-0.5 text-teal-300 transition-colors hover:text-teal-200 hover:underline"
                >
                  Verify <ExternalLink className="inline h-3 w-3" />
                </a>
              )}
            </div>
            <div>
              Last verified:{' '}
              {confidenceMetadata.lastVerified ? new Date(confidenceMetadata.lastVerified).toUTCString() : 'never'}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
