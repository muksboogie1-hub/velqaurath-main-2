import React from 'react';
import { ShieldCheck, TriangleAlert, Database, Calendar } from 'lucide-react';
import { DataSource, ProviderStatus } from '../types';
import { FundamentalProviderStatus } from '../fundamentals/providers/IFundamentalDataProvider';
import { FundamentalDatasetMode } from '../types/fundamentals';
import { CurrencyFundamentalIntelligence } from '../types';
import { deriveFeedStatus, EvidenceDisplayState } from './feedStatus';

interface DataStatusBannerProps {
  dataStatus: string;
  statusMessage: string;
  dataSources: DataSource[];
  marketProviderStatus?: ProviderStatus;
  fundamentalProviderStatus?: FundamentalProviderStatus;
  fundamentalDatasetMode?: FundamentalDatasetMode;
  currencyIntelligence: CurrencyFundamentalIntelligence[];
  onToggleConnection: () => void;
  onOpenSources: () => void;
}

export const DataStatusBanner: React.FC<DataStatusBannerProps> = ({
  dataStatus,
  statusMessage,
  dataSources,
  marketProviderStatus,
  fundamentalProviderStatus,
  fundamentalDatasetMode = 'LIVE',
  currencyIntelligence,
  onOpenSources
}) => {
  const feedStatus = deriveFeedStatus(
    marketProviderStatus,
    fundamentalProviderStatus,
    fundamentalDatasetMode,
    currencyIntelligence
  );
  const macroSources = dataSources.filter((s) => s.id !== 'src-twelvedata');
  const connectedMacroCount = macroSources.filter((s) => s.status === 'CONNECTED').length;
  const fxHealth = marketProviderStatus?.health ?? 'NOT_CONFIGURED';

  // Determine fundamental status badge
  const fundHealth = fundamentalProviderStatus?.health ?? 'DISCONNECTED';
  const isStale = fundamentalProviderStatus?.isStale ?? false;

  let fundBadgeText = 'UNAVAILABLE';
  let fundBadgeStyle = 'bg-rose-950/60 border-rose-500/40 text-rose-300';

  if (feedStatus.fundamentals === 'REFERENCE') {
    fundBadgeText = 'REFERENCE';
    fundBadgeStyle = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
  } else if (feedStatus.fundamentals === 'FRESH') {
    fundBadgeText = 'LIVE / FRESH';
    fundBadgeStyle = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
  } else if (feedStatus.fundamentals === 'STALE') {
    fundBadgeText = 'STALE';
    fundBadgeStyle = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
  } else if (feedStatus.fundamentals === 'DEGRADED') {
    fundBadgeText = 'LIVE / DEGRADED';
    fundBadgeStyle = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
  } else {
    fundBadgeText = 'UNAVAILABLE';
    fundBadgeStyle = 'bg-rose-950/60 border-rose-500/40 text-rose-300';
  }

  const stateStyle = (state: EvidenceDisplayState) =>
    state === 'FRESH'
      ? 'text-emerald-400'
      : state === 'REFERENCE'
      ? 'text-amber-300'
      : state === 'STALE' || state === 'DEGRADED' || state === 'AGING'
      ? 'text-orange-300'
      : 'text-rose-300';

  const lastUpdateFormatted = fundamentalProviderStatus?.lastSuccessfulUpdate
    ? new Date(fundamentalProviderStatus.lastSuccessfulUpdate).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC'
      }) + ' UTC'
    : 'None';

  return (
    <div
        className={`border rounded-lg p-3.5 text-xs transition-colors ${
          feedStatus.pipeline === 'LIVE'
            ? 'bg-neutral-900/60 border-emerald-500/30 text-neutral-300'
            : feedStatus.pipeline === 'DEGRADED'
            ? 'bg-neutral-900/80 border-amber-500/40 text-neutral-300'
            : 'bg-neutral-900/90 border-rose-500/50 text-neutral-300'
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {feedStatus.pipeline === 'LIVE' ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <TriangleAlert className={`w-5 h-5 shrink-0 mt-0.5 ${feedStatus.pipeline === 'DEGRADED' ? 'text-amber-400' : 'text-rose-400'}`} />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-mono font-bold tracking-wider uppercase text-xs ${
                  feedStatus.pipeline === 'LIVE' ? 'text-emerald-400' : feedStatus.pipeline === 'DEGRADED' ? 'text-amber-300' : 'text-rose-400'
                }`}
              >
                DATA PIPELINE — {feedStatus.pipeline}
              </span>

              {/* Fundamental Data Badge */}
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${fundBadgeStyle}`}>
                FUNDAMENTALS: {fundBadgeText}
              </span>

              {/* FX Market Data Badge */}
              {marketProviderStatus && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    feedStatus.fx === 'FRESH'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : feedStatus.fx === 'STALE' || feedStatus.fx === 'DEGRADED' || feedStatus.fx === 'AGING'
                      ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  FX QUOTES: {feedStatus.fx}
                </span>
              )}

            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-neutral-400 font-mono">
              <span>Source: <span className="text-neutral-200">{fundamentalProviderStatus?.providerName || 'Finance Calendar'}</span></span>
              <span>· Fundamentals: <span className={stateStyle(feedStatus.fundamentals)}>{fundBadgeText}</span></span>
              <span>· FX Quotes: <span className={stateStyle(feedStatus.fx)}>{feedStatus.fx} · {feedStatus.freshFxPairs}/{feedStatus.requiredFxPairs} fresh</span></span>
              <span>· Stream: <span className={feedStatus.stream === 'CONNECTED' ? 'text-emerald-400' : 'text-neutral-400'}>{feedStatus.stream}</span></span>
              <span>· Usable FX Pairs: <span className="text-neutral-200">{feedStatus.freshFxPairs}/{feedStatus.requiredFxPairs}</span></span>
              {(fundamentalProviderStatus?.livePopulatedDimensionsCount !== undefined || fundamentalProviderStatus?.categoriesPopulatedCount !== undefined) && (
                <span>· Macro Categories: <span className="text-neutral-200">
                  {fundamentalProviderStatus.livePopulatedDimensionsCount ?? fundamentalProviderStatus.categoriesPopulatedCount}/
                  {fundamentalProviderStatus.supportedDimensionsCount ?? fundamentalProviderStatus.categoriesConfiguredCount ?? 10}
                </span></span>
              )}
            </div>

            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                {feedStatus.pipeline === 'LIVE'
                  ? 'All tracked evidence dimensions satisfy current freshness requirements.'
                  : feedStatus.pipeline === 'DEGRADED'
                  ? statusMessage || 'Evidence is partially available, stale, or reference-only.'
                  : 'No usable current evidence is available.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSources}
            className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono border border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-neutral-400" />
            Inspect Sources
          </button>
        </div>
      </div>
    </div>
  );
};
