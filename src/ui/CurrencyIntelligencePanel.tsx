import React from 'react';
import { ChevronDown, LineChart, Scale, Landmark, Sparkles, AlertTriangle, CircleSlash } from 'lucide-react';
import { CurrencyFundamentalIntelligence } from '../types';

interface CurrencyIntelligencePanelProps {
  intelligences: CurrencyFundamentalIntelligence[];
}

function statusTone(value: string): string {
  if (value === 'LIVE' || value === 'FRESH' || value === 'AVAILABLE') {
    return '!border-teal-400/25 !bg-teal-400/[0.08] !text-teal-200';
  }
  if (value === 'REFERENCE' || value === 'STATIC' || value === 'BENCHMARK') {
    return '!border-amber-400/25 !bg-amber-400/[0.07] !text-amber-200';
  }
  if (value === 'STALE' || value === 'AGING' || value === 'PARTIAL') {
    return '!border-orange-400/25 !bg-orange-400/[0.07] !text-orange-200';
  }
  return '!border-white/[0.08] !bg-white/[0.03] !text-slate-400';
}

function StatusTag({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[0.58rem] font-semibold tracking-wide uppercase ${statusTone(
        value
      )}`}
    >
      {value.replaceAll('_', ' ')}
    </span>
  );
}

function LayerHeader({
  icon,
  label,
  value,
  tone,
  note
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon}
        <span className="velqo-eyebrow">{label}</span>
      </div>
      <p className={`mt-1.5 text-[0.85rem] font-semibold ${tone}`}>{value}</p>
      {note && <p className="mt-1 text-[0.68rem] leading-relaxed text-slate-500">{note}</p>}
    </div>
  );
}

/**
 * CURRENCY INTELLIGENCE
 *
 * Three clearly separated layers — market, fundamentals, policy — with the
 * "why" presented before the diagnostics. Availability, provenance and
 * freshness remain explicit on every layer: reference, static, stale and
 * unavailable states are never visually flattened into a live read.
 */
export const CurrencyIntelligencePanel: React.FC<CurrencyIntelligencePanelProps> = ({
  intelligences
}) => {
  return (
    <section className="velqo-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-6">
        <div>
          <p className="velqo-eyebrow mb-1.5">Currency intelligence</p>
          <h2 className="velqo-display text-lg text-white sm:text-xl">
            The why behind each currency
          </h2>
          <p className="mt-1 text-[0.72rem] leading-relaxed text-slate-500">
            Evidence-led state per currency. Expand a currency for its full record.
          </p>
        </div>
        <span className="velqo-chip">{intelligences.length} supported</span>
      </div>

      {intelligences.length === 0 ? (
        <p className="px-4 py-8 text-center text-[0.8rem] text-slate-500 sm:px-6">
          Currency evidence is awaiting the dashboard feed.
        </p>
      ) : (
        <div className="grid gap-2.5 p-3 sm:p-4 xl:grid-cols-2">
          {intelligences.map((intelligence) => {
            const evidence = intelligence.evidenceAssessment;
            if (!evidence) return null;
            const marketValue = evidence.market.strength;
            const fundamentalValue = evidence.fundamentals.score;

            const conditionTone =
              evidence.condition.state === 'SUPPORTED'
                ? 'text-teal-200'
                : evidence.condition.state === 'PARTIAL'
                ? 'text-orange-200'
                : 'text-rose-200';

            return (
              <details
                key={intelligence.currency.code}
                className="group velqo-card velqo-card-interactive overflow-hidden"
              >
                <summary className="flex cursor-pointer flex-col gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="velqo-display text-lg text-white">
                        {intelligence.currency.code}
                      </span>
                      <span className="truncate text-[0.72rem] text-slate-500">
                        {intelligence.currency.name}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
                  </div>

                  {/* The why, first */}
                  <p className="line-clamp-2 text-[0.78rem] leading-relaxed text-slate-300">
                    {evidence.explanation.summary}
                  </p>

                  {/* Layer headline numbers */}
                  <div className="grid grid-cols-3 gap-2">
                    <LayerHeader
                      icon={<LineChart className="h-3 w-3" />}
                      label="Market"
                      value={
                        marketValue === null
                          ? 'Unavailable'
                          : `${marketValue >= 0 ? '+' : ''}${marketValue.toFixed(2)}%`
                      }
                      tone={marketValue === null ? 'text-slate-400' : marketValue >= 0 ? 'text-teal-300' : 'text-rose-300'}
                    />
                    <LayerHeader
                      icon={<Scale className="h-3 w-3" />}
                      label="Fundamentals"
                      value={
                        fundamentalValue === null
                          ? 'Insufficient'
                          : `${fundamentalValue >= 0 ? '+' : ''}${fundamentalValue.toFixed(2)}`
                      }
                      tone={
                        fundamentalValue === null
                          ? 'text-slate-400'
                          : fundamentalValue >= 0
                          ? 'text-teal-300'
                          : 'text-rose-300'
                      }
                    />
                    <LayerHeader
                      icon={<Landmark className="h-3 w-3" />}
                      label="Policy"
                      value={
                        evidence.policy.currentPolicyRate !== null
                          ? `${evidence.policy.currentStance} · ${evidence.policy.currentPolicyRate}%`
                          : evidence.policy.contextualPolicyRate !== null
                          ? `${evidence.policy.contextualStance} (reference)`
                          : 'Unavailable'
                      }
                      tone={
                        evidence.policy.currentPolicyRate !== null
                          ? 'text-teal-300'
                          : evidence.policy.contextualPolicyRate !== null
                          ? 'text-amber-200'
                          : 'text-slate-400'
                      }
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusTag value={evidence.condition.state} />
                    <StatusTag value={evidence.quality.availability} />
                    <StatusTag value={evidence.quality.freshness} />
                    <span className={`ml-auto text-[0.65rem] tnum ${conditionTone}`}>
                      {evidence.quality.liveEvidenceCount} live record
                      {evidence.quality.liveEvidenceCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </summary>

                <div className="space-y-3 border-t border-white/[0.06] px-4 py-4 text-[0.72rem] sm:px-5">
                  {/* Market detail */}
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="min-w-0">
                      <p className="velqo-eyebrow mb-1.5">Market evidence</p>
                      <p className="text-slate-300">
                        {evidence.market.strength !== null
                          ? `${evidence.market.strength >= 0 ? '+' : ''}${evidence.market.strength.toFixed(2)}% · ${evidence.market.classification}`
                          : 'Market strength unavailable'}
                      </p>
                      <p className="mt-1 text-slate-500">
                        Breadth {evidence.market.breadth.available}/{evidence.market.breadth.required} ·{' '}
                        {evidence.market.directionalConsistency.aligned} aligned,{' '}
                        {evidence.market.directionalConsistency.opposing} opposing
                      </p>
                      <p className="mt-0.5 text-slate-500">
                        {evidence.market.evidenceCount} pairs ·{' '}
                        {evidence.market.source || 'No verified source'}
                      </p>
                      {evidence.market.reason && (
                        <p className="mt-1 leading-relaxed text-slate-400">
                          {evidence.market.reason}
                        </p>
                      )}
                      {evidence.market.stalePairs.length > 0 && (
                        <p className="mt-1 text-orange-200/90">
                          Stale: {evidence.market.stalePairs.map((p) => p.pairSymbol).join(', ')}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <StatusTag value={evidence.market.provenance} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="velqo-eyebrow mb-1.5">Fundamentals</p>
                      <p className="text-slate-300">
                        {evidence.fundamentals.evidenceCount} valid observations ·{' '}
                        {evidence.expectations.completeCount} complete surprises
                      </p>
                      <p className="mt-1 text-slate-500">
                        {evidence.fundamentals.reason || 'Required scoring dimensions are available.'}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {evidence.fundamentals.categories.map((category) => (
                          <div
                            key={category.category}
                            className="border-t border-white/[0.06] pt-1.5"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-slate-200">
                                {category.category.replaceAll('_', ' ')}
                              </span>
                              <StatusTag value={category.status} />
                              <StatusTag value={category.freshness} />
                              <StatusTag value={category.provenance} />
                            </div>
                            {category.evidenceCount > 0 ? (
                              <p className="mt-0.5 text-slate-400">
                                Actual {category.latestActual ?? 'missing'} · Forecast{' '}
                                {category.latestForecast ?? 'missing'} · Previous{' '}
                                {category.latestPrevious ?? 'missing'} · Surprise{' '}
                                {category.latestSurprise ?? 'incomplete'}
                                {category.source ? ` · ${category.source}` : ''}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-slate-500">{category.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="velqo-eyebrow mb-1.5">Monetary policy</p>
                      <p className="text-slate-300">
                        {evidence.policy.currentPolicyRate !== null
                          ? `${evidence.policy.currentStance} · ${evidence.policy.currentPolicyRate}% current rate`
                          : evidence.policy.contextualPolicyRate !== null
                          ? `${evidence.policy.contextualStance} · ${evidence.policy.contextualPolicyRate}% reference rate`
                          : 'Current policy rate unavailable'}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {evidence.policy.reason || evidence.policy.source}
                      </p>
                      <p className="mt-1 text-slate-600">
                        {evidence.policy.availability} · {evidence.policy.freshness}
                        {evidence.policy.effectiveAt ? ` · decision ${evidence.policy.effectiveAt}` : ''}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <StatusTag value={evidence.policy.provenance} />
                        <StatusTag value={evidence.policy.availability} />
                      </div>
                    </div>
                  </div>

                  {evidence.explanation.contributingEvidence.length > 0 && (
                    <div>
                      <p className="velqo-eyebrow mb-1.5 flex items-center gap-1.5 text-teal-300/80">
                        <Sparkles className="h-3 w-3" />
                        Contributing
                      </p>
                      <ul className="space-y-1 text-slate-300">
                        {evidence.explanation.contributingEvidence.map((factor) => (
                          <li key={factor} className="flex gap-2 leading-relaxed">
                            <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-teal-300" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evidence.contradictions.length > 0 && (
                    <div>
                      <p className="velqo-eyebrow mb-1.5 flex items-center gap-1.5 text-orange-200/90">
                        <AlertTriangle className="h-3 w-3" />
                        Contradictions
                      </p>
                      <ul className="space-y-1 text-slate-300">
                        {evidence.contradictions.map((contradiction) => (
                          <li key={contradiction.id} className="leading-relaxed">
                            {contradiction.conflictDescription}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evidence.explanation.unavailableEvidence.length > 0 && (
                    <div>
                      <p className="velqo-eyebrow mb-1.5 flex items-center gap-1.5 text-slate-400">
                        <CircleSlash className="h-3 w-3" />
                        Unavailable evidence
                      </p>
                      <ul className="space-y-1 text-slate-400">
                        {evidence.explanation.unavailableEvidence.map((reason) => (
                          <li key={reason} className="leading-relaxed">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evidence.explanation.staleEvidence.length > 0 && (
                    <p className="leading-relaxed text-orange-200/90">
                      {evidence.explanation.staleEvidence.join(' ')}
                    </p>
                  )}

                  <details className="border-t border-white/[0.06] pt-2.5">
                    <summary className="cursor-pointer text-[0.68rem] font-medium text-slate-500 transition-colors hover:text-teal-200">
                      Full evidence record
                    </summary>
                    <div className="mt-2 space-y-1 text-slate-400">
                      <p>{evidence.condition.state}: {evidence.condition.reason}</p>
                      {evidence.explanation.agreements.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                      {evidence.explanation.conflicts.map((item, index) => (
                        <p key={`${index}-${item}`}>{item}</p>
                      ))}
                      {evidence.expectations.items.map((item) => (
                        <p key={item.observationId}>
                          {item.indicatorName}: {item.statements.fact}{' '}
                          {item.statements.expectation} {item.statements.interpretation}
                        </p>
                      ))}
                    </div>
                  </details>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
};
