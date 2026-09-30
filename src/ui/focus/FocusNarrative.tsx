import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  HelpCircle,
  Layers,
  Radio,
  CalendarClock,
  Clock,
  ListOrdered,
  CircleSlash
} from 'lucide-react';
import type {
  FocusBias,
  FocusCatalyst,
  FocusChangeCondition,
  FocusDataQuality,
  FocusEvidenceItem,
  FocusPair,
  FocusResearchWindow,
  MarketFocus
} from '../../types/focus';
import {
  CountdownChip,
  DataRow,
  FocusSection,
  HonestEmpty,
  MetricValue,
  StateChip
} from './atoms';

const LAYER_LABEL: Record<FocusEvidenceItem['layer'], string> = {
  MARKET: 'Market',
  FUNDAMENTALS: 'Fundamentals',
  POLICY: 'Policy',
  EXPECTATIONS: 'Expectations',
  CATALYST: 'Catalyst',
  SESSION: 'Session',
  CONTRADICTION: 'Conflict',
  THESIS: 'Thesis',
  DATA_QUALITY: 'Data'
};

function EvidenceList({
  items,
  dot,
  emptyLabel
}: {
  items: FocusEvidenceItem[];
  dot: string;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <HonestEmpty>{emptyLabel}</HonestEmpty>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item.layer}-${index}`} className="flex gap-2">
          <span
            className={`mt-[0.5rem] h-1 w-1 shrink-0 rounded-full ${
              item.verified ? dot : 'bg-slate-600'
            }`}
          />
          <div className="min-w-0 flex-1">
            <span className="mb-0.5 inline-flex flex-wrap items-center gap-1">
              <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-1.5 py-px text-[0.55rem] font-medium uppercase tracking-wide text-slate-500">
                {LAYER_LABEL[item.layer]}
              </span>
              {!item.verified && (
                <span className="rounded-full border border-slate-500/25 px-1.5 py-px text-[0.55rem] font-medium uppercase tracking-wide text-slate-500">
                  layer not live
                </span>
              )}
            </span>
            <p
              className={`text-[0.73rem] leading-relaxed ${
                item.verified ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              {item.text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function WhyThisBias({ why }: { why: string | null }) {
  return (
    <FocusSection
      title="Why this bias"
      icon={<Scale className="h-3.5 w-3.5" />}
    >
      {why ? (
        <p className="text-[0.82rem] leading-relaxed text-slate-200">{why}</p>
      ) : (
        <HonestEmpty>
          No directional explanation can be derived until a pair holds a verified watch state.
        </HonestEmpty>
      )}
    </FocusSection>
  );
}

export function SupportingEvidence({
  supporting,
  contradicting
}: {
  supporting: FocusEvidenceItem[];
  contradicting: FocusEvidenceItem[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FocusSection
        title="Supporting evidence"
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        aside={
          supporting.length > 0 ? (
            <span className="velqo-chip !py-0 !text-[0.6rem] tnum">{supporting.length}</span>
          ) : null
        }
      >
        <EvidenceList
          items={supporting}
          dot="bg-teal-300"
          emptyLabel="No verified supporting evidence is recorded for this pair."
        />
      </FocusSection>

      <FocusSection
        title="What disagrees"
        icon={<TrendingDown className="h-3.5 w-3.5" />}
        aside={
          contradicting.length > 0 ? (
            <span className="velqo-chip !py-0 !text-[0.6rem] tnum">{contradicting.length}</span>
          ) : null
        }
      >
        <EvidenceList
          items={contradicting}
          dot="bg-rose-300"
          emptyLabel="No verified contradicting evidence is recorded for this pair."
        />
      </FocusSection>
    </div>
  );
}

export function ChangeConditions({
  conditions,
  hasVerified
}: {
  conditions: FocusChangeCondition[];
  hasVerified: boolean;
}) {
  return (
    <FocusSection
      title="What could change this bias"
      icon={<HelpCircle className="h-3.5 w-3.5" />}
    >
      {!hasVerified || conditions.length === 0 ? (
        <HonestEmpty>No verified bias-change condition available.</HonestEmpty>
      ) : (
        <ul className="space-y-2">
          {conditions.map((entry) => (
            <li
              key={entry.condition.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[0.75rem] font-medium leading-snug text-slate-200">
                  {entry.description}
                </p>
                <span
                  className={`velqo-chip shrink-0 !py-0.5 !text-[0.6rem] ${
                    entry.triggered
                      ? '!border-rose-400/30 !text-rose-200'
                      : entry.evaluationStatus === 'UNABLE_TO_EVALUATE'
                      ? '!border-slate-500/30 !text-slate-400'
                      : '!border-amber-400/25 !text-amber-200'
                  }`}
                >
                  {entry.triggered ? 'triggered' : entry.evaluationStatus.replace(/_/g, ' ').toLowerCase()}
                </span>
              </div>
              <dl className="mt-1.5 space-y-0.5 text-[0.68rem]">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-slate-500">Current</dt>
                  <dd className="min-w-0 text-slate-300">{entry.currentValue}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-slate-500">Triggers when</dt>
                  <dd className="min-w-0 text-slate-400">{entry.triggerCondition}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </FocusSection>
  );
}

export function DataTrust({ quality }: { quality: FocusDataQuality }) {
  const layerList: { label: string; values: string[]; tone: string }[] = [
    { label: 'Present', values: quality.availableComponents, tone: 'text-teal-200' },
    { label: 'Missing', values: quality.missingComponents, tone: 'text-slate-400' },
    { label: 'Stale', values: quality.staleComponents, tone: 'text-amber-200' },
    { label: 'Reference only', values: quality.referenceOnlyComponents, tone: 'text-violet-200' }
  ];

  return (
    <FocusSection title="Evidence quality" icon={<Radio className="h-3.5 w-3.5" />}>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        <span className="velqo-chip">{quality.dataQuality}</span>
        <span className="velqo-chip">{quality.evidenceQuality}</span>
        <span className="velqo-chip">{quality.thesisStatus.replace(/_/g, ' ').toLowerCase()}</span>
        <span
          className={`velqo-chip ${
            quality.marketEvidenceState === 'AVAILABLE'
              ? '!border-teal-400/25 !text-teal-200'
              : quality.marketEvidenceState === 'STALE'
              ? '!border-amber-400/25 !text-amber-200'
              : '!border-slate-500/30 !text-slate-400'
          }`}
        >
          market evidence: {String(quality.marketEvidenceState).toLowerCase()}
        </span>
      </div>

      <div className="space-y-1.5">
        {layerList.map((layer) => (
          <div key={layer.label} className="flex gap-2 text-[0.7rem]">
            <span className="w-24 shrink-0 text-slate-500">{layer.label}</span>
            <span className={`min-w-0 flex-1 ${layer.tone}`}>
              {layer.values.length > 0 ? layer.values.join(', ') : '—'}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 border-t border-white/[0.05] pt-2 text-[0.65rem] leading-relaxed text-slate-500">
        <Layers className="mt-[0.1rem] h-3 w-3 shrink-0 text-slate-600" />
        <span>
          Missing layers earn no support and are never treated as neutral. Full source and
          freshness records are available in the evidence inspector.
        </span>
      </p>

      {!quality.crossAssetAvailable && (
        <p className="mt-1.5 text-[0.65rem] leading-relaxed text-slate-600">
          {quality.crossAssetNote} An absent layer is not a bearish signal.
        </p>
      )}
    </FocusSection>
  );
}

/* ------------------------------------------------------------------ *
 * TODAY'S CATALYSTS
 * ------------------------------------------------------------------ */

const IMPORTANCE_TONE: Record<string, string> = {
  HIGH: '!border-teal-400/30 !text-teal-200',
  MEDIUM: '!border-slate-500/30 !text-slate-300',
  LOW: '!border-slate-500/20 !text-slate-500'
};

function CatalystCard({ catalyst }: { catalyst: FocusCatalyst }) {
  const event = catalyst.event;
  return (
    <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`velqo-chip !py-0 !text-[0.58rem] ${IMPORTANCE_TONE[event.importance] ?? ''}`}>
          {event.importance.toLowerCase()}
        </span>
        <span className="velqo-chip !py-0 !text-[0.58rem]">{event.currency}</span>
        <CountdownChip state={catalyst.countdownState} label={catalyst.countdownLabel} />
        {catalyst.challengeVerified && (
          <span className="velqo-chip !border-rose-400/30 !py-0 !text-[0.58rem] !text-rose-200">
            challenges bias
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[0.78rem] font-medium leading-snug text-slate-100">{event.name}</p>
      <p className="mt-1 text-[0.7rem] leading-relaxed text-slate-400">{catalyst.relationship}</p>

      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.05] pt-2 text-[0.68rem]">
        <div className="flex gap-1.5">
          <dt className="text-slate-500">Prev</dt>
          <dd className="text-slate-300">
            <MetricValue value={event.previous} />
            {event.previous !== null ? ` ${event.unit}` : ''}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-slate-500">Fcst</dt>
          <dd className="text-slate-300">
            <MetricValue value={event.forecast} />
            {event.forecast !== null ? ` ${event.unit}` : ''}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-slate-500">Act</dt>
          <dd className="text-slate-300">
            <MetricValue value={event.actual} />
            {event.actual !== null ? ` ${event.unit}` : ''}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-slate-500">Source</dt>
          <dd className="truncate text-slate-500">{event.source}</dd>
        </div>
      </dl>
    </li>
  );
}

export function TodaysCatalysts({ catalysts }: { catalysts: FocusCatalyst[] }) {
  if (catalysts.length === 0) {
    return (
      <FocusSection title="Catalysts" icon={<CalendarClock className="h-3.5 w-3.5" />}>
        <HonestEmpty>
          No verified catalyst record exists for either leg of this pair.
        </HonestEmpty>
      </FocusSection>
    );
  }

  return (
    <FocusSection
      title="Catalysts"
      icon={<CalendarClock className="h-3.5 w-3.5" />}
      aside={
        <span className="velqo-chip !py-0 !text-[0.6rem] tnum">{catalysts.length}</span>
      }
    >
      <ul className="space-y-2">
        {catalysts.map((catalyst) => (
          <CatalystCard key={catalyst.event.id} catalyst={catalyst} />
        ))}
      </ul>
    </FocusSection>
  );
}

/* ------------------------------------------------------------------ *
 * WHEN TO WATCH
 * ------------------------------------------------------------------ */

export function WhenToWatch({ window: researchWindow }: { window: FocusResearchWindow | null }) {
  if (!researchWindow) {
    return (
      <FocusSection title="When to analyse" icon={<Clock className="h-3.5 w-3.5" />}>
        <HonestEmpty>
          No research window can be derived while no pair holds a verified watch state.
        </HonestEmpty>
      </FocusSection>
    );
  }

  return (
    <FocusSection title="When to analyse" icon={<Clock className="h-3.5 w-3.5" />}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[0.82rem] font-medium text-slate-100">
          {researchWindow.headline}
        </span>
        <StateChip state={researchWindow.watchState} />
      </div>

      <dl className="mt-2.5 space-y-1">
        <DataRow label="Window" value={researchWindow.window} />
        <DataRow label="Primary centre" value={researchWindow.primarySession} />
        <DataRow
          label="Active overlaps"
          value={researchWindow.activeOverlaps.length > 0 ? researchWindow.activeOverlaps.join(' · ') : 'None active'}
        />
      </dl>

      <p className="mt-2.5 border-t border-white/[0.05] pt-2 text-[0.72rem] leading-relaxed text-slate-400">
        {researchWindow.detail}
      </p>

      {!researchWindow.dataAvailable && (
        <HonestEmpty>
          The session clock is running, but this pair carries no verified window state, so the
          timing above is context only.
        </HonestEmpty>
      )}
    </FocusSection>
  );
}

/* ------------------------------------------------------------------ *
 * NEXT PAIR / RESEARCH QUEUE
 * ------------------------------------------------------------------ */

const BIAS_TONE: Record<FocusBias, string> = {
  BULLISH: '!border-teal-400/30 !text-teal-200',
  BEARISH: '!border-rose-400/30 !text-rose-200',
  NEUTRAL: '!border-sky-400/25 !text-sky-200',
  UNCONFIRMED: '!border-slate-500/30 !text-slate-400'
};

const BIAS_SHORT: Record<FocusBias, string> = {
  BULLISH: 'bullish',
  BEARISH: 'bearish',
  NEUTRAL: 'neutral',
  UNCONFIRMED: 'unconfirmed'
};

function QueueRow({ pair, onSelectPair }: { pair: FocusPair; onSelectPair: (symbol: string) => void }) {
  return (
    <li>
      <button
        onClick={() => onSelectPair(pair.symbol)}
        className="group flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition-all hover:border-teal-400/25 hover:bg-white/[0.05] active:scale-[0.99]"
      >
        <span className="velqo-display text-[0.9rem] text-white transition-colors group-hover:text-teal-200">
          {pair.symbol}
        </span>
        <span className={`velqo-chip !py-0 !text-[0.58rem] ${BIAS_TONE[pair.bias]}`}>
          {BIAS_SHORT[pair.bias]}
        </span>
        <span className="ml-auto shrink-0 text-[0.68rem] text-slate-500 tnum">
          {pair.confluenceScore === null ? 'confluence —' : `confluence ${pair.confluenceScore}`}
        </span>
      </button>
    </li>
  );
}

function QueueGroup({
  title,
  pairs,
  onSelectPair,
  emptyLabel
}: {
  title: string;
  pairs: FocusPair[];
  onSelectPair: (symbol: string) => void;
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="velqo-eyebrow">{title}</span>
        <span className="velqo-chip ml-auto !py-0 !text-[0.6rem] tnum">{pairs.length}</span>
      </div>
      {pairs.length === 0 ? (
        <p className="text-[0.7rem] text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1.5">
          {pairs.map((pair) => (
            <QueueRow key={pair.symbol} pair={pair} onSelectPair={onSelectPair} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function ResearchQueue({
  focus,
  onSelectPair
}: {
  focus: MarketFocus;
  onSelectPair: (symbol: string) => void;
}) {
  const summary = focus.queueSummary;

  return (
    <FocusSection title="Research queue" icon={<ListOrdered className="h-3.5 w-3.5" />}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="velqo-chip !py-0 !text-[0.6rem] tnum">{summary.total} pairs</span>
        <span className="velqo-chip !py-0 !text-[0.6rem] tnum">{summary.primaryWatch} primary</span>
        <span className="velqo-chip !py-0 !text-[0.6rem] tnum">{summary.secondaryWatch} secondary</span>
        <span className="velqo-chip !py-0 !text-[0.6rem] tnum">{summary.monitor} monitor</span>
        <span className="velqo-chip !py-0 !text-[0.6rem] tnum">{summary.wait} wait</span>
        <span className="velqo-chip !py-0 !text-[0.6rem] tnum">
          {summary.insufficientData} insufficient
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <QueueGroup
          title="Next up"
          pairs={focus.nextToWatch}
          onSelectPair={onSelectPair}
          emptyLabel="No pair is held at secondary watch."
        />
        <QueueGroup
          title="On the radar"
          pairs={focus.onTheRadar}
          onSelectPair={onSelectPair}
          emptyLabel="No pair is currently being monitored."
        />
        <QueueGroup
          title="Waiting on evidence"
          pairs={focus.insufficientData}
          onSelectPair={onSelectPair}
          emptyLabel="Every pair in the universe holds enough evidence to be assessed."
        />
      </div>
    </FocusSection>
  );
}

/* ------------------------------------------------------------------ *
 * NO PRIMARY PAIR
 * ------------------------------------------------------------------ */

export function NoPrimaryFocus({ reason }: { reason: string | null }) {
  return (
    <FocusSection title="Pair in focus" icon={<CircleSlash className="h-3.5 w-3.5" />}>
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CircleSlash className="h-5 w-5 text-slate-600" />
        <p className="text-[0.8rem] font-medium text-slate-300">No primary pair</p>
        <p className="max-w-sm text-[0.72rem] leading-relaxed text-slate-500">
          {reason ??
            'No pair is held at a verified watch state on the current evidence, so none is promoted.'}
        </p>
      </div>
    </FocusSection>
  );
}
