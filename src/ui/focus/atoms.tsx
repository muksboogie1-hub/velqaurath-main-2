import React from 'react';
import { TriangleAlert } from 'lucide-react';
import type { CatalystCountdownState, FocusBias, FocusBiasBasis } from '../../types/focus';

/* ------------------------------------------------------------------ *
 * Bias presentation
 *
 * The bias is the single most important element in the product, so it is
 * rendered as a large, unmistakable block rather than a chip.
 * ------------------------------------------------------------------ */

const BIAS_STYLE: Record<
  FocusBias,
  { label: string; ring: string; text: string; glow: string; gradient: string }
> = {
  BULLISH: {
    label: 'Bullish bias',
    ring: 'border-teal-400/35',
    text: 'text-teal-200',
    glow: 'from-teal-400/22',
    gradient: 'to-cyan-400/5'
  },
  BEARISH: {
    label: 'Bearish bias',
    ring: 'border-rose-400/35',
    text: 'text-rose-200',
    glow: 'from-rose-400/22',
    gradient: 'to-orange-400/5'
  },
  NEUTRAL: {
    label: 'Neutral',
    ring: 'border-sky-400/30',
    text: 'text-sky-200',
    glow: 'from-sky-400/18',
    gradient: 'to-slate-400/5'
  },
  UNCONFIRMED: {
    label: 'Unconfirmed',
    ring: 'border-amber-400/30',
    text: 'text-amber-200',
    glow: 'from-amber-400/18',
    gradient: 'to-slate-400/5'
  }
};

const ALIGNMENT_LABEL: Record<string, string> = {
  ALIGNED: 'Evidence aligned',
  PARTIALLY_ALIGNED: 'Partially aligned',
  CONFLICTED: 'Conflicted',
  UNVERIFIED: 'Unverified'
};

/**
 * How the bias was reached. The basis is always shown next to the bias so a
 * macro-derived read is never mistaken for a market-confirmed one.
 */
const BIAS_BASIS_NOTE: Record<FocusBiasBasis, string> = {
  MARKET_CONFIRMED: 'confirmed by current market evidence',
  MACRO_DERIVED: 'derived from macro evidence — market confirmation unavailable',
  BALANCED: 'evidence currently balanced',
  NO_DIRECTIONAL_EVIDENCE: 'no verified directional evidence'
};

export function biasBasisNote(basis: FocusBiasBasis): string {
  return BIAS_BASIS_NOTE[basis];
}

/**
 * Countdown state is rendered from the engine's own verdict. A record with no
 * trusted time, a past record, or a record whose source disagrees with its own
 * timestamp never receives a countdown.
 */
const COUNTDOWN_LABEL: Record<CatalystCountdownState, { label: string; tone: string }> = {
  COUNTDOWN: { label: 'in', tone: '!border-teal-400/30 !text-teal-200' },
  RELEASED: { label: 'released', tone: '!border-slate-500/30 !text-slate-300' },
  REASSESSMENT_PENDING: { label: 'reacting', tone: '!border-amber-400/25 !text-amber-200' },
  NO_TRUSTED_TIME: { label: 'time unverified', tone: '!border-slate-500/30 !text-slate-400' },
  PAST: { label: 'past', tone: '!border-slate-500/30 !text-slate-400' },
  INCONSISTENT: { label: 'status conflict', tone: '!border-amber-400/30 !text-amber-200' }
};

export function CountdownChip({
  state,
  label
}: {
  state: CatalystCountdownState;
  label: string | null;
}) {
  const meta = COUNTDOWN_LABEL[state];
  return (
    <span className={`velqo-chip !py-0 !text-[0.6rem] ${meta.tone}`}>
      {label ? `${meta.label} ${label}` : meta.label}
    </span>
  );
}

/** An absent number is shown as an explicit dash, never as 0. */
export function MetricValue({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-600">—</span>;
  }
  return <span className="tnum">{value}</span>;
}

export function BiasBadge({
  bias,
  basisNote,
  size = 'md'
}: {
  bias: FocusBias;
  basisNote?: string | null;
  size?: 'lg' | 'md';
}) {
  const style = BIAS_STYLE[bias];
  return (
    <div
      className={`inline-flex flex-col gap-0.5 rounded-2xl border ${style.ring} bg-gradient-to-br ${style.glow} ${style.gradient} ${
        size === 'lg' ? 'px-4 py-3 sm:px-5 sm:py-3.5' : 'px-3 py-2'
      }`}
    >
      <span
        className={`velqo-eyebrow !text-[0.58rem] !tracking-[0.18em] ${
          bias === 'UNCONFIRMED' ? '!text-amber-200/70' : '!text-slate-300/70'
        }`}
      >
        Pair bias
      </span>
      <span
        className={`velqo-display leading-none ${style.text} ${
          size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-lg'
        }`}
      >
        {style.label}
      </span>
      {basisNote && (
        <span className="mt-0.5 text-[0.62rem] leading-tight text-slate-400">{basisNote}</span>
      )}
    </div>
  );
}

export function AlignmentChip({ alignment }: { alignment: string }) {
  const tone =
    alignment === 'ALIGNED'
      ? '!border-teal-400/30 !text-teal-200'
      : alignment === 'CONFLICTED'
      ? '!border-rose-400/30 !text-rose-200'
      : alignment === 'UNVERIFIED'
      ? '!border-slate-500/30 !text-slate-300'
      : '!border-amber-400/30 !text-amber-200';
  return <span className={`velqo-chip ${tone}`}>{ALIGNMENT_LABEL[alignment] ?? alignment}</span>;
}

export function ConfidenceChip({ confidence }: { confidence: string }) {
  const label = String(confidence).replace(/_/g, ' ').toLowerCase();
  return <span className="velqo-chip">{label} confidence</span>;
}

export function StateChip({ state }: { state: string }) {
  const tone =
    state === 'PRIMARY_WATCH'
      ? '!border-teal-400/30 !text-teal-200'
      : state === 'SECONDARY_WATCH'
      ? '!border-sky-400/30 !text-sky-200'
      : state === 'INSUFFICIENT_DATA'
      ? '!border-slate-500/30 !text-slate-400'
      : '!border-amber-400/25 !text-amber-200';
  return <span className={`velqo-chip ${tone}`}>{state.replace(/_/g, ' ').toLowerCase()}</span>;
}

/* ------------------------------------------------------------------ *
 * Shared layout atoms
 * ------------------------------------------------------------------ */

export function FocusSection({
  title,
  icon,
  aside,
  children
}: {
  title: string;
  icon?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3.5 sm:px-4">
      <header className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="text-teal-300">{icon}</span>
        <h3 className="velqo-eyebrow">{title}</h3>
        {aside ? <div className="ml-auto flex flex-wrap items-center gap-1.5">{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function HonestEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[0.72rem] leading-relaxed text-slate-500">
      <TriangleAlert className="mt-[0.15rem] h-3 w-3 shrink-0 text-slate-600" />
      <span>{children}</span>
    </p>
  );
}

export function DataRow({
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
      <dt className="shrink-0 text-[0.7rem] text-slate-500">{label}</dt>
      <dd className={`min-w-0 text-right text-[0.72rem] font-medium tnum ${tone}`}>{value}</dd>
    </div>
  );
}
