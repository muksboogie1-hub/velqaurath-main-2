import React from 'react';
import { ChevronDown } from 'lucide-react';
import { CurrencyFundamentalIntelligence } from '../types';

interface CurrencyIntelligencePanelProps {
  intelligences: CurrencyFundamentalIntelligence[];
}

function statusClass(value: string): string {
  if (value === 'LIVE' || value === 'FRESH' || value === 'AVAILABLE') {
    return 'text-emerald-300 border-emerald-900/70 bg-emerald-950/40';
  }
  if (value === 'REFERENCE' || value === 'STATIC' || value === 'BENCHMARK') {
    return 'text-amber-300 border-amber-900/70 bg-amber-950/30';
  }
  if (value === 'STALE' || value === 'AGING' || value === 'PARTIAL') {
    return 'text-orange-300 border-orange-900/70 bg-orange-950/30';
  }
  return 'text-neutral-400 border-neutral-700 bg-neutral-900';
}

function StatusTag({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-sm border px-1.5 py-0.5 text-[9px] font-mono uppercase ${statusClass(value)}`}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}

export const CurrencyIntelligencePanel: React.FC<CurrencyIntelligencePanelProps> = ({
  intelligences
}) => {
  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-800/80 pb-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 tracking-wide uppercase">
            Currency Intelligence
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Evidence-led state · source quality · unresolved gaps
          </p>
        </div>
        <span className="text-[10px] text-neutral-500 font-mono">
          {intelligences.length} supported currencies
        </span>
      </div>

      {intelligences.length === 0 ? (
        <p className="py-4 text-xs text-neutral-500">Currency evidence is awaiting the dashboard feed.</p>
      ) : (
        <div className="grid gap-2 xl:grid-cols-2">
          {intelligences.map((intelligence) => {
            const evidence = intelligence.evidenceAssessment;
            if (!evidence) return null;
            const marketValue = evidence.market.strength;
            const fundamentalValue = evidence.fundamentals.score;

            return (
              <details key={intelligence.currency.code} className="group border border-neutral-800 rounded-md bg-neutral-950/50">
                <summary className="list-none cursor-pointer px-3 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2.5 min-w-32">
                    <span className="font-mono font-bold text-sm text-neutral-100">
                      {intelligence.currency.code}
                    </span>
                    <span className="hidden sm:inline text-[11px] text-neutral-500">
                      {intelligence.currency.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-neutral-400">MKT</span>
                    <span className={marketValue === null ? 'text-neutral-600' : marketValue >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {marketValue === null ? 'UNAVAILABLE' : `${marketValue >= 0 ? '+' : ''}${marketValue.toFixed(2)}%`}
                    </span>
                    <span className="text-neutral-700">/</span>
                    <span className="text-neutral-400">FUND</span>
                    <span className={fundamentalValue === null ? 'text-neutral-600' : fundamentalValue >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {fundamentalValue === null ? 'INSUFFICIENT' : `${fundamentalValue >= 0 ? '+' : ''}${fundamentalValue.toFixed(2)}`}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-500 transition-transform group-open:rotate-180" />
                  </div>
                  <div className="w-full flex flex-wrap gap-1.5">
                    <StatusTag value={evidence.condition.state} />
                    <StatusTag value={evidence.quality.availability} />
                    <StatusTag value={evidence.quality.freshness} />
                    <StatusTag value={evidence.market.provenance} />
                    <StatusTag value={evidence.fundamentals.provenance} />
                    <StatusTag value={evidence.policy.provenance} />
                    <span className="ml-auto text-[10px] font-mono text-neutral-500">
                      {evidence.quality.liveEvidenceCount} live records · {evidence.quality.completeness.available}/{evidence.quality.completeness.required} dimensions
                    </span>
                  </div>
                </summary>

                <div className="border-t border-neutral-800 px-3 py-3 space-y-3 text-[11px]">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <h3 className="text-[10px] font-mono uppercase text-neutral-500 mb-1">Market Evidence</h3>
                      <p className="text-neutral-300">
                        {evidence.market.strength !== null
                          ? `${evidence.market.strength >= 0 ? '+' : ''}${evidence.market.strength.toFixed(2)}% · ${evidence.market.classification}`
                          : 'Market strength unavailable'}
                      </p>
                      <p className="text-neutral-400 mt-1">
                        Breadth {evidence.market.breadth.available}/{evidence.market.breadth.required} · Directional consistency {evidence.market.directionalConsistency.aligned} aligned, {evidence.market.directionalConsistency.opposing} opposing
                      </p>
                      <p className="text-neutral-500">{evidence.market.evidenceCount} pairs · {evidence.market.source || 'No verified source'}</p>
                      <p className="text-neutral-500 mt-1">
                        {evidence.market.reason || evidence.market.contributingPairs.map((pair) => pair.pairSymbol).join(', ')}
                      </p>
                      {evidence.market.stalePairs.length > 0 && (
                        <p className="text-orange-300/80 mt-1">
                          Stale: {evidence.market.stalePairs.map((pair) => pair.pairSymbol).join(', ')}
                        </p>
                      )}
                      {evidence.market.fetchedAt && (
                        <p className="text-neutral-600 font-mono mt-1">Fetched {evidence.market.fetchedAt}</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-[10px] font-mono uppercase text-neutral-500 mb-1">Fundamentals</h3>
                      <p className="text-neutral-300">
                        {evidence.fundamentals.evidenceCount} valid observations · {evidence.expectations.completeCount} complete surprises
                      </p>
                      <p className="text-neutral-500 mt-1">
                        {evidence.fundamentals.reason || 'Required scoring dimensions are available.'}
                      </p>
                      {evidence.fundamentals.fetchedAt && (
                        <p className="text-neutral-600 font-mono mt-1">Fetched {evidence.fundamentals.fetchedAt}</p>
                      )}
                      <div className="mt-2 space-y-1.5">
                        {evidence.fundamentals.categories.map((category) => (
                          <div key={category.category} className="border-t border-neutral-800/70 pt-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-neutral-200">{category.category.replaceAll('_', ' ')}</span>
                              <StatusTag value={category.status} />
                              <StatusTag value={category.freshness} />
                              <StatusTag value={category.provenance} />
                            </div>
                            {category.evidenceCount > 0 ? (
                              <p className="text-neutral-400 mt-0.5">
                                Actual {category.latestActual ?? 'MISSING'} · Forecast {category.latestForecast ?? 'MISSING'} · Previous {category.latestPrevious ?? 'MISSING'} · Surprise {category.latestSurprise ?? 'INCOMPLETE'}
                                {category.source ? ` · ${category.source}` : ''}
                              </p>
                            ) : (
                              <p className="text-neutral-500 mt-0.5">{category.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-mono uppercase text-neutral-500 mb-1">Monetary Policy</h3>
                      <p className="text-neutral-300">
                        {evidence.policy.currentPolicyRate !== null
                          ? `${evidence.policy.currentStance} · ${evidence.policy.currentPolicyRate}% current rate`
                          : evidence.policy.contextualPolicyRate !== null
                          ? `${evidence.policy.contextualStance} · ${evidence.policy.contextualPolicyRate}% contextual rate`
                          : 'Current policy rate unavailable'}
                      </p>
                      <p className="text-neutral-500 mt-1">{evidence.policy.reason || evidence.policy.source}</p>
                      <p className="text-neutral-600 font-mono mt-1">
                        Availability {evidence.policy.availability} · Freshness {evidence.policy.freshness}
                        {evidence.policy.effectiveAt ? ` · Decision ${evidence.policy.effectiveAt}` : ''}
                        {evidence.policy.contextualFetchedAt ? ` · Context fetched ${evidence.policy.contextualFetchedAt}` : ''}
                      </p>
                    </div>
                  </div>

                  {evidence.explanation.contributingEvidence.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-mono uppercase text-emerald-400/80 mb-1">Contributing Factors</h3>
                      <ul className="space-y-1 text-neutral-300">
                        {evidence.explanation.contributingEvidence.map((factor) => <li key={factor}>{factor}</li>)}
                      </ul>
                    </div>
                  )}

                  {evidence.contradictions.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-mono uppercase text-orange-300 mb-1">Contradictions</h3>
                      <ul className="space-y-1 text-neutral-300">
                        {evidence.contradictions.map((contradiction) => (
                          <li key={contradiction.id}>{contradiction.conflictDescription}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evidence.explanation.unavailableEvidence.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-mono uppercase text-neutral-500 mb-1">Unavailable Evidence</h3>
                      <ul className="space-y-1 text-neutral-400">
                        {evidence.explanation.unavailableEvidence.map((reason) => <li key={reason}>{reason}</li>)}
                      </ul>
                    </div>
                  )}

                  {evidence.explanation.staleEvidence.length > 0 && (
                    <div className="text-orange-300/90">
                      {evidence.explanation.staleEvidence.join(' ')}
                    </div>
                  )}

                  <details className="border-t border-neutral-800 pt-2">
                    <summary className="cursor-pointer text-[10px] font-mono uppercase text-neutral-400">
                      Full explanation
                    </summary>
                    <div className="mt-2 space-y-1 text-neutral-400">
                      <p>{evidence.explanation.summary}</p>
                      <p>{evidence.condition.state}: {evidence.condition.reason}</p>
                      {evidence.explanation.agreements.map((item) => <p key={item}>{item}</p>)}
                      {evidence.explanation.conflicts.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}
                      {evidence.expectations.items.map((item) => (
                        <p key={item.observationId}>
                          {item.indicatorName}: {item.statements.fact} {item.statements.expectation} {item.statements.interpretation}
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