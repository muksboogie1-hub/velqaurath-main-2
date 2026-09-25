import React, { useState } from 'react';
import { X, ExternalLink, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { CurrencyState, EconomicEvent } from '../types';
import { FUNDAMENTAL_CATEGORIES, FundamentalCategory } from '../types/fundamentals';
import { ECONOMIC_INDICATORS } from '../data/indicators';
import { analyzeObservationExpectations } from '../engines/expectations/expectationsEngine';

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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-4 sm:p-6 text-neutral-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-neutral-100">
                {currency.code}
              </span>
              <span className="text-xs font-mono text-neutral-500">
                ({currency.name} · {currency.region})
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 font-mono text-xs text-neutral-400">
              <div className="flex items-center gap-1.5">
                <span>Market:</span>
                <span
                  className={`font-bold ${
                    marketState === 'STRONG'
                      ? 'text-emerald-400'
                      : marketState === 'WEAK'
                      ? 'text-rose-400'
                      : 'text-neutral-300'
                  }`}
                >
                  {marketStrength !== null ? `${marketStrength >= 0 ? '+' : ''}${marketStrength.toFixed(2)}% (${marketState})` : 'UNAVAILABLE'}
                </span>
              </div>
              <span className="text-neutral-600">·</span>
              <div className="flex items-center gap-1.5">
                <span>Fundamentals:</span>
                <span className="font-bold text-sky-400">
                  {fundamentalState.overallCondition}
                </span>
              </div>
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

        <div className="py-4 space-y-5 text-xs">
          {/* Market Strength Section */}
          <section className="p-3 bg-neutral-900/50 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <div>
                <h3 className="font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  Market Strength Intelligence
                </h3>
                <span className="text-[10px] font-mono text-neutral-500">
                  Basket-Relative Movement · Strong ≥ +0.10% · Weak ≤ -0.10%
                </span>
              </div>
              <span
                className={`font-mono text-xs font-bold ${
                  marketState === 'STRONG'
                    ? 'text-emerald-400'
                    : marketState === 'WEAK'
                    ? 'text-rose-400'
                    : 'text-neutral-300'
                }`}
              >
                {marketStrength !== null ? `${marketStrength >= 0 ? '+' : ''}${marketStrength.toFixed(2)}%` : 'UNAVAILABLE'} ({marketState})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2 font-mono text-[11px] bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Basket-Relative Strength</span>
                <span className="text-neutral-100 font-bold">
                  {marketStrength !== null ? `${marketStrength >= 0 ? '+' : ''}${marketStrength.toFixed(2)}%` : 'UNAVAILABLE'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Raw Basket Daily Avg</span>
                <span className="text-neutral-300">
                  {relativeStrengthBreakdown.dailyMovementPercent !== undefined && relativeStrengthBreakdown.dailyMovementPercent !== null
                    ? `${relativeStrengthBreakdown.dailyMovementPercent >= 0 ? '+' : ''}${relativeStrengthBreakdown.dailyMovementPercent.toFixed(2)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>

            <p className="text-neutral-300 leading-relaxed mb-2 font-sans">
              {relativeStrengthBreakdown.explanation}
            </p>
            {relativeStrengthBreakdown.contributors && (
              <div className="mt-2 pt-2 border-t border-neutral-800/80">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1.5">
                  Pair Contributors ({relativeStrengthBreakdown.contributors.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px]">
                  {relativeStrengthBreakdown.contributors.map((c) => (
                    <div
                      key={c.pairSymbol}
                      onClick={() => onSelectPair?.(c.pairSymbol)}
                      className="p-1.5 rounded bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 cursor-pointer flex justify-between"
                    >
                      <span className="text-neutral-300">{c.pairSymbol}</span>
                      <span
                        className={
                          c.signedContribution > 0
                            ? 'text-emerald-400'
                            : c.signedContribution < 0
                            ? 'text-rose-400'
                            : 'text-neutral-500'
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
          <section className="p-3 bg-neutral-900/50 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <h3 className="font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider">
                Central Bank Intelligence: {centralBank.institution}
              </h3>
              <span
                className={`font-mono text-xs font-bold ${
                  centralBank.stance === 'HAWKISH'
                    ? 'text-emerald-400'
                    : centralBank.stance === 'DOVISH'
                    ? 'text-rose-400'
                    : 'text-neutral-300'
                }`}
              >
                {centralBank.stance} ({centralBank.currentPolicyRate !== null ? `${centralBank.currentPolicyRate}%` : 'N/A'})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2.5 font-mono text-[11px] bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
              <div>
                <span className="text-neutral-500 block text-[10px]">CURRENT POLICY RATE</span>
                <span className="text-neutral-100 font-bold">{centralBank.currentPolicyRate !== null ? `${centralBank.currentPolicyRate}%` : 'UNAVAILABLE'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">PREVIOUS POLICY RATE</span>
                <span className="text-neutral-300">{centralBank.previousPolicyRate !== null ? `${centralBank.previousPolicyRate}%` : 'N/A'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">LATEST DECISION DATE</span>
                <span className="text-neutral-300">{centralBank.latestDecisionDate ? new Date(centralBank.latestDecisionDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">NEXT KNOWN DECISION</span>
                <span className="text-neutral-300">{centralBank.nextKnownDecisionDate ? new Date(centralBank.nextKnownDecisionDate).toLocaleDateString() : 'NOT ANNOUNCED'}</span>
              </div>
            </div>
            <p className="text-neutral-300 leading-relaxed font-sans mb-2">
              {centralBank.guidanceSummary || 'Data dependent stance.'}
            </p>
            {centralBank.stanceEvidence.length > 0 && (
              <div className="mt-2 pt-2 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-400 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                  Policy Evidence:
                </span>
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
              <section className="p-3 bg-neutral-900/50 border border-neutral-800 rounded">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
                  <h3 className="font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    10 Fundamental Categories (Phase B)
                  </h3>
                  <span className="font-mono text-[11px] text-neutral-400">
                    {populatedCount}/10 Populated ({10 - populatedCount} Awaiting Live Observations)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-[10px]">
                  {FUNDAMENTAL_CATEGORIES.map((cat) => {
                    const isObserved = observedCategoriesSet.has(cat.id);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-1.5 rounded border text-center cursor-pointer transition-colors ${
                          selectedCategory === cat.id
                            ? 'border-emerald-500 bg-emerald-950/30'
                            : isObserved
                            ? 'border-neutral-700 bg-neutral-900/80 hover:border-neutral-600'
                            : 'border-neutral-800/50 bg-neutral-950/60 opacity-60'
                        }`}
                      >
                        <span className="block font-semibold truncate text-neutral-200">{cat.code}</span>
                        <span
                          className={`text-[9px] block ${
                            isObserved ? 'text-emerald-400 font-bold' : 'text-neutral-500'
                          }`}
                        >
                          {isObserved ? 'POPULATED' : 'AWAITING DATA'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* Expectations Breakdown */}
          <section className="p-3 bg-neutral-900/50 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2 font-mono text-xs">
              <span className="font-bold text-neutral-200 uppercase tracking-wider">
                Macroeconomic Expectations Engine
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-emerald-400 font-bold">{beats} Beats</span>
                <span className="text-rose-400 font-bold">{misses} Misses</span>
                <span className="text-neutral-400">{inLine} In-line</span>
                {unknown > 0 && <span className="text-neutral-500">{unknown} Unknown</span>}
              </div>
            </div>

            {analyzedExpectations.length === 0 ? (
              <p className="text-neutral-500 italic font-mono text-[11px]">
                No recorded releases available for {currency.code}.
              </p>
            ) : (
              <div className="space-y-2 mt-2">
                {analyzedExpectations.map((exp: any, i: number) => (
                  <div key={i} className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-neutral-200">{exp.indicatorName}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          exp.expectationStatus === 'ABOVE_EXPECTATION'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : exp.expectationStatus === 'BELOW_EXPECTATION'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : exp.expectationStatus === 'IN_LINE'
                            ? 'bg-neutral-900 text-neutral-300 border border-neutral-700'
                            : 'bg-neutral-950 text-neutral-500 border border-neutral-800'
                        }`}
                      >
                        {exp.expectationStatus.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Fact vs Expectation vs Interpretation vs Engine Analysis */}
                    <div className="space-y-1 text-[11px] font-mono">
                      <div className="text-neutral-300 bg-neutral-900/40 p-1 rounded">
                        <span className="text-sky-400 font-bold mr-1">FACT:</span>
                        {exp.statements?.fact?.replace('FACT: ', '') || `Actual: ${exp.actual}${exp.unit}`}
                      </div>
                      <div className="text-neutral-400 bg-neutral-900/40 p-1 rounded">
                        <span className="text-amber-400 font-bold mr-1">EXPECTATION:</span>
                        {exp.statements?.expectation?.replace('EXPECTATION: ', '') || `Forecast: ${exp.forecast}${exp.unit}`}
                      </div>
                      <div className="text-neutral-300 bg-neutral-900/40 p-1 rounded">
                        <span className="text-emerald-400 font-bold mr-1">INTERPRETATION:</span>
                        {exp.statements?.interpretation?.replace('INTERPRETATION: ', '') || exp.directionSummary}
                      </div>
                      <div className="text-neutral-400 bg-neutral-900/40 p-1 rounded font-sans">
                        <span className="text-purple-400 font-bold mr-1 font-mono">ENGINE_ANALYSIS:</span>
                        {exp.statements?.engineAnalysis?.replace('ENGINE_ANALYSIS: ', '') || exp.monetaryPolicyImplication}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Evidence Breakdown */}
          <section className="border-t border-neutral-800/80 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
              <span className="font-mono text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
                Supporting Evidence ({supportingEvidence.length})
              </span>
              {supportingEvidence.length === 0 ? (
                <p className="text-neutral-500 italic">No strong confirming evidence.</p>
              ) : (
                <ul className="space-y-1.5 text-neutral-300 list-disc list-inside">
                  {supportingEvidence.map((ev, i) => (
                    <li key={i} className="leading-tight text-[11px] font-sans">{ev}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
              <span className="font-mono text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-2">
                Counter-Evidence / Headwinds ({conflictingEvidence.length})
              </span>
              {conflictingEvidence.length === 0 ? (
                <p className="text-neutral-500 italic">No material conflicting evidence.</p>
              ) : (
                <ul className="space-y-1.5 text-neutral-300 list-disc list-inside">
                  {conflictingEvidence.map((ev, i) => (
                    <li key={i} className="leading-tight text-[11px] font-sans">{ev}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Data Gaps & Transparency */}
          <section className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
            <span className="font-mono text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Data Gaps & Transparency Notice
            </span>
            <p className="text-neutral-400 text-[11px] font-sans mb-2">
              VELQOARATH strictly prohibits fabricating economic indicators. The following categories currently have no live authenticated data feed configured:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 font-mono text-[10px] text-neutral-500">
              <div>• Fiscal / Government: Debt-to-GDP & budget balance not configured</div>
              <div>• Interest Rates: Sovereign yield curve feed not configured</div>
              <div>• Major Shocks: Systemic financial stress indices not configured</div>
              <div>• Market Expectations: OIS terminal rate pricing not configured</div>
            </div>
          </section>

          {/* Upcoming Catalysts */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              Upcoming Scheduled Catalysts ({upcomingEvents.length})
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-neutral-500 italic font-mono text-[11px]">No scheduled upcoming events in horizon.</p>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {upcomingEvents.map((e, idx) => (
                  <div key={`${e.id || 'evt'}-${idx}`} className="p-2 bg-neutral-900/50 border border-neutral-800/80 rounded flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-neutral-200 font-sans block text-xs">{e.name}</span>
                      <span className="text-neutral-500 text-[10px]">Scheduled: {new Date(e.scheduledTime).toUTCString()}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${e.importance === 'HIGH' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {e.importance}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Source Provenance */}
          <section className="border-t border-neutral-800/80 pt-3 text-[11px] font-mono text-neutral-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span>Source: {centralBank.sourceMetadata.sourceName}</span>
              {centralBank.sourceMetadata.sourceUrl && (
                <a
                  href={centralBank.sourceMetadata.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Verify <ExternalLink className="w-3 h-3 inline" />
                </a>
              )}
            </div>
            <div>
              Last Verified: {confidenceMetadata.lastVerified ? new Date(confidenceMetadata.lastVerified).toUTCString() : 'N/A'}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
