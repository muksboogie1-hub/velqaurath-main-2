import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Clock,
  TriangleAlert,
  CalendarClock,
  CircleSlash
} from 'lucide-react';
import { PairIntelligence } from '../types';

interface PairInFocusCardProps {
  topPair: PairIntelligence | null;
  onSelectPair: (symbol: string) => void;
}

function SignalBlock({
  label,
  tone,
  dot,
  icon,
  items,
  emptyLabel
}: {
  label: string;
  tone: string;
  dot: string;
  icon: React.ReactNode;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={tone}>{icon}</span>
        <span className="velqo-eyebrow">{label}</span>
        {items.length > 0 && (
          <span className="velqo-chip ml-auto !py-0 !text-[0.6rem] tnum">{items.length}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-[0.7rem] leading-relaxed text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2 text-[0.72rem] leading-relaxed text-slate-300">
              <span className={`mt-[0.45rem] h-1 w-1 shrink-0 rounded-full ${dot}`} />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * PAIR IN FOCUS — the signature card of the product.
 *
 * Bias and confluence are shown transparently but do not lead the card; the
 * reasoning does. Every list is mapped from existing PairIntelligence fields.
 * Where evidence is absent the card says so instead of implying support.
 */
export const PairInFocusCard: React.FC<PairInFocusCardProps> = ({
  topPair,
  onSelectPair
}) => {
  if (!topPair) {
    return (
      <section className="velqo-card px-4 py-6 sm:px-6">
        <p className="velqo-eyebrow">Pair in focus</p>
        <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
          <CircleSlash className="h-6 w-6 text-slate-600" />
          <p className="max-w-sm text-[0.8rem] leading-relaxed text-slate-400">
            No pair intelligence can be derived from current evidence. Nothing is promoted
            to a watch state while the underlying layers are unavailable.
          </p>
        </div>
      </section>
    );
  }

  const delta = topPair.relativeStrengthDelta;
  const marketEvidenceStale = topPair.marketEvidenceState === 'STALE';
  const isBullish = topPair.orientationDirection === 'BULLISH_BASE';
  const isBearish = topPair.orientationDirection === 'BEARISH_BASE';
  const macroDerived = delta === null;

  const biasLabel = macroDerived
    ? 'Macro-derived bias'
    : isBullish
    ? 'Bullish'
    : isBearish
    ? 'Bearish'
    : 'Neutral';

  const biasTone = macroDerived
    ? 'text-amber-300'
    : isBullish
    ? 'text-teal-300'
    : isBearish
    ? 'text-rose-300'
    : 'text-slate-300';

  const BiasIcon = macroDerived
    ? TriangleAlert
    : isBullish
    ? TrendingUp
    : isBearish
    ? TrendingDown
    : ArrowLeftRight;

  const supporting = topPair.structuredThesis?.supportingEvidence?.length
    ? topPair.structuredThesis.supportingEvidence
    : topPair.supportingEvidence;

  const contradicting = topPair.structuredThesis?.counterEvidence?.length
    ? topPair.structuredThesis.counterEvidence
    : topPair.counterEvidence?.length
    ? topPair.counterEvidence
    : topPair.opposingEvidence;

  const contradictions = topPair.structuredContradictions ?? topPair.contradictions ?? [];
  const watchItems = [
    ...(topPair.structuredInvalidation ?? []).map(
      (condition) =>
        `${condition.description}${condition.triggered ? ' (triggered)' : ''}`
    ),
    ...(topPair.invalidationConditions ?? [])
  ];

  return (
    <section className="velqo-card velqo-rise-late overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
          <span className="velqo-eyebrow">Pair in focus</span>
        </div>
        <button
          onClick={() => onSelectPair(topPair.pair.symbol)}
          className="rounded-full px-2 py-1 text-[0.7rem] font-medium text-teal-300 transition-colors hover:bg-teal-400/10"
        >
          Full intelligence →
        </button>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        {/* Identity */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <button
              onClick={() => onSelectPair(topPair.pair.symbol)}
              className="velqo-display text-3xl text-white transition-colors hover:text-teal-200 sm:text-4xl"
            >
              {topPair.pair.symbol}
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[0.7rem] font-semibold ${biasTone}`}
              >
                <BiasIcon className="h-3.5 w-3.5" />
                {biasLabel}
              </span>

              <span className="velqo-chip tnum">
                {macroDerived
                  ? 'Market Δ unavailable'
                  : `Δ ${delta! >= 0 ? '+' : ''}${delta!.toFixed(2)}%`}
              </span>

              {macroDerived && (
                <span className="velqo-chip !border-amber-400/25 !text-amber-200">
                  {marketEvidenceStale ? 'Quotes stale' : 'Quotes unavailable'}
                </span>
              )}
            </div>
          </div>

          {/* Confluence stays transparent without dominating the card. */}
          {topPair.confluence && (
            <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5 sm:min-w-52">
              <div className="flex items-baseline justify-between gap-3">
                <span className="velqo-eyebrow">Confluence</span>
                <span className="text-[0.7rem] text-slate-500 tnum">
                  {topPair.confluence.dataQuality}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="velqo-display text-xl text-white tnum">
                  {topPair.confluence.confluenceScore}
                </span>
                <span className="text-[0.7rem] text-slate-500">/ 100</span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-[width] duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, topPair.confluence.confluenceScore))}%` }}
                />
              </div>
              <p className="mt-1.5 text-[0.65rem] text-slate-500">
                {String(topPair.confluence.directionalConfidence).replace(/_/g, ' ')} confidence
              </p>
            </div>
          )}
        </div>

        {/* Why it matters */}
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
          <p className="velqo-eyebrow mb-2">Why it matters</p>
          <p className="text-[0.82rem] leading-relaxed text-slate-200">
            {topPair.orientationExplanation}
          </p>
          {topPair.structuredThesis && (
            <p className="mt-2 text-[0.72rem] leading-relaxed text-slate-400">
              {topPair.structuredThesis.summary}
            </p>
          )}
        </div>

        {/* Evidence blocks */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <SignalBlock
            label="Supporting"
            tone="text-teal-300"
            dot="bg-teal-300"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            items={supporting}
            emptyLabel="No verified supporting evidence is recorded for this pair."
          />
          <SignalBlock
            label="Contradicting"
            tone="text-rose-300"
            dot="bg-rose-300"
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            items={contradicting}
            emptyLabel="No verified contradicting evidence is recorded for this pair."
          />

          <SignalBlock
            label="Watch"
            tone="text-amber-300"
            dot="bg-amber-300"
            icon={<TriangleAlert className="h-3.5 w-3.5" />}
            items={[
              ...contradictions.map((item) => item.conflictDescription),
              ...watchItems
            ]}
            emptyLabel="No watch condition is currently active."
          />

          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-sky-300">
                <Clock className="h-3.5 w-3.5" />
              </span>
              <span className="velqo-eyebrow">Session</span>
            </div>
            <dl className="space-y-1.5 text-[0.72rem]">
              <Row label="Primary centre" value={topPair.sessionRelevance.primarySession} />
              <Row label="Watch window" value={topPair.watchWindow.watchWindow} />
              <Row label="Watch state" value={topPair.watchWindow.watchState} />
              <Row
                label="Catalysts"
                value={`${topPair.catalysts.length} scheduled`}
              />
              <Row
                label="Convergence"
                value={topPair.convergenceDivergence}
                tone={
                  topPair.convergenceDivergence === 'CONVERGENCE'
                    ? 'text-teal-300'
                    : topPair.convergenceDivergence === 'DIVERGENCE'
                    ? 'text-rose-300'
                    : 'text-amber-300'
                }
              />
            </dl>
            {topPair.catalysts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topPair.catalysts.slice(0, 3).map((catalyst) => (
                  <span key={catalyst.id} className="velqo-chip">
                    <CalendarClock className="h-3 w-3" />
                    {catalyst.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

function Row({
  label,
  value,
  tone = 'text-slate-200'
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className={`min-w-0 truncate text-right font-medium ${tone}`}>{value}</dd>
    </div>
  );
}
