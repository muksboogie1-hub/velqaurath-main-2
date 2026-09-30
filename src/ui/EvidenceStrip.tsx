import React, { useState } from 'react';
import {
  ShieldCheck,
  TriangleAlert,
  CircleOff,
  ChevronDown,
  Database,
  LineChart,
  Landmark
} from 'lucide-react';
import { DataSource, ProviderStatus } from '../types';
import { FundamentalProviderStatus } from '../fundamentals/providers/IFundamentalDataProvider';
import { FundamentalDatasetMode } from '../types/fundamentals';
import { CurrencyFundamentalIntelligence } from '../types';
import { deriveFeedStatus, describeEvidenceCoverage, EvidenceDisplayState } from './feedStatus';

interface EvidenceStripProps {
  dataStatus: string;
  statusMessage: string;
  dataSources: DataSource[];
  marketProviderStatus?: ProviderStatus;
  fundamentalProviderStatus?: FundamentalProviderStatus;
  fundamentalDatasetMode?: FundamentalDatasetMode;
  currencyIntelligence: CurrencyFundamentalIntelligence[];
  onOpenSources: () => void;
}

function evidenceTone(state: EvidenceDisplayState): {
  text: string;
  ring: string;
  dot: string;
} {
  if (state === 'FRESH') {
    return { text: 'text-teal-200', ring: 'border-teal-400/20', dot: 'bg-teal-300' };
  }
  if (state === 'REFERENCE') {
    return { text: 'text-amber-200', ring: 'border-amber-400/25', dot: 'bg-amber-300' };
  }
  if (state === 'STALE' || state === 'DEGRADED' || state === 'AGING') {
    return { text: 'text-orange-200', ring: 'border-orange-400/25', dot: 'bg-orange-300' };
  }
  return { text: 'text-rose-200', ring: 'border-rose-400/25', dot: 'bg-rose-300' };
}

/**
 * EVIDENCE — a compact status strip.
 *
 * The product answers three questions first: is the evidence live, is anything
 * degraded, and what needs attention. Provenance detail (coverage ratios,
 * stream state, provider identity) is never removed, it is simply demoted
 * behind an explicit disclosure so the intelligence stays the focus.
 */
export const EvidenceStrip: React.FC<EvidenceStripProps> = ({
  statusMessage,
  dataSources,
  marketProviderStatus,
  fundamentalProviderStatus,
  fundamentalDatasetMode = 'LIVE',
  currencyIntelligence,
  onOpenSources
}) => {
  const [expanded, setExpanded] = useState(false);

  const feedStatus = deriveFeedStatus(
    marketProviderStatus,
    fundamentalProviderStatus,
    fundamentalDatasetMode,
    currencyIntelligence
  );

  const macroSources = dataSources.filter((s) => s.id !== 'src-twelvedata');
  const connectedMacroCount = macroSources.filter((s) => s.status === 'CONNECTED').length;

  const coverage = describeEvidenceCoverage(feedStatus, currencyIntelligence.length);

  const headline =
    feedStatus.pipeline === 'LIVE'
      ? 'Evidence is live'
      : feedStatus.pipeline === 'DEGRADED'
      ? 'Some evidence needs attention'
      : 'Evidence is unavailable';

  /*
   * The attention clause states what is actually incomplete, in plain words,
   * and keeps the counts so the engineering state stays auditable. The raw
   * DEGRADED state is never hidden — it is demoted to the chips beside it.
   */
  const attention = feedStatus.pipeline === 'LIVE' ? null : coverage.macro;

  const StatusIcon =
    feedStatus.pipeline === 'LIVE'
      ? ShieldCheck
      : feedStatus.pipeline === 'DEGRADED'
      ? TriangleAlert
      : CircleOff;

  const pipelineTone =
    feedStatus.pipeline === 'LIVE'
      ? { text: 'text-teal-200', ring: 'border-teal-400/20', dot: 'bg-teal-300' }
      : feedStatus.pipeline === 'DEGRADED'
      ? { text: 'text-amber-200', ring: 'border-amber-400/25', dot: 'bg-amber-300' }
      : { text: 'text-rose-200', ring: 'border-rose-400/25', dot: 'bg-rose-300' };

  const fxTone = evidenceTone(feedStatus.fx);
  const fundamentalTone = evidenceTone(feedStatus.fundamentals);

  const lastUpdateFormatted = fundamentalProviderStatus?.lastSuccessfulUpdate
    ? new Date(fundamentalProviderStatus.lastSuccessfulUpdate).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC'
      }) + ' UTC'
    : 'None';

  return (
    <section className="velqo-card overflow-hidden" aria-label="Evidence status">
      <div className="px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Question one and two: live? anything degraded? */}
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${pipelineTone.ring} bg-white/[0.03]`}
            >
              <StatusIcon className={`h-4 w-4 ${pipelineTone.text}`} />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[0.8rem] font-semibold text-slate-100">
                  {headline}
                </span>
                {attention && (
                  <span className="velqo-chip !border-transparent !bg-white/[0.04] !text-amber-200/90">
                    {attention}
                  </span>
                )}
              </div>
              <p className="mt-0.5 line-clamp-1 text-[0.7rem] text-slate-500">
                {feedStatus.pipeline === 'LIVE'
                  ? 'Market and macro evidence are both current.'
                  : coverage.sentence}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <span className={`velqo-chip ${fxTone.ring} ${fxTone.text}`}>
                <LineChart className="h-3 w-3" />
                Market {feedStatus.fx}
              </span>
              <span className={`velqo-chip ${fundamentalTone.ring} ${fundamentalTone.text}`}>
                <Landmark className="h-3 w-3" />
                Macro {feedStatus.fundamentals}
              </span>
            </div>

            <button
              onClick={() => setExpanded((value) => !value)}
              className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 text-[0.7rem] font-medium text-slate-400 transition-colors hover:border-teal-400/30 hover:text-teal-200"
              aria-expanded={expanded}
            >
              Details
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>

            <button
              onClick={onOpenSources}
              className="flex min-h-9 items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-400/[0.07] px-3 text-[0.7rem] font-medium text-teal-200 transition-colors hover:border-teal-400/45 hover:bg-teal-400/[0.12]"
            >
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Inspect sources</span>
            </button>
          </div>
        </div>

        {/* Question three and the full provenance layer, demoted but never removed. */}
        {expanded && (
          <div className="velqo-rise mt-4 space-y-3 border-t border-white/[0.06] pt-4">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <DetailTile
                label="Market quotes"
                value={`${feedStatus.freshFxPairs}/${feedStatus.requiredFxPairs} current`}
                note={
                  feedStatus.staleFxPairs > 0
                    ? `${feedStatus.staleFxPairs} stale and excluded`
                    : 'No stale quotes'
                }
                tone={fxTone.text}
              />
              <DetailTile
                label="Macro categories"
                value={`${
                  fundamentalProviderStatus?.livePopulatedDimensionsCount ??
                  fundamentalProviderStatus?.categoriesPopulatedCount ??
                  0
                }/${
                  fundamentalProviderStatus?.supportedDimensionsCount ??
                  fundamentalProviderStatus?.categoriesConfiguredCount ??
                  0
                } populated`}
                note={
                  fundamentalProviderStatus?.datasetMode === 'BENCHMARK'
                    ? 'Benchmark mode — reference only'
                    : 'Live dataset mode'
                }
                tone={fundamentalTone.text}
              />
              <DetailTile
                label="Macro freshness"
                value={feedStatus.fundamentals}
                note={`Updated ${lastUpdateFormatted}`}
                tone={fundamentalTone.text}
              />
              <DetailTile
                label="Provenance"
                value={`${connectedMacroCount}/${macroSources.length} sources connected`}
                note={`Stream ${feedStatus.stream} · FX health ${marketProviderStatus?.health ?? 'NOT_CONFIGURED'}`}
                tone="text-slate-300"
              />
            </div>

            <p className="text-[0.65rem] leading-relaxed text-slate-500">
              Reference, static and unavailable evidence never earns live scoring, and missing
              evidence is never presented as neutral. Coverage ratios describe what is verified;
              they are never renormalized into a higher score elsewhere.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

function DetailTile({
  label,
  value,
  note,
  tone
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="velqo-eyebrow">{label}</p>
      <p className={`mt-1.5 text-[0.8rem] font-semibold tnum ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[0.65rem] leading-relaxed text-slate-500">{note}</p>
    </div>
  );
}
