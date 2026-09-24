import React from 'react';
import { ShieldCheck, TriangleAlert, Database, Calendar } from 'lucide-react';
import { DataSource, ProviderStatus } from '../types';
import { FundamentalProviderStatus } from '../fundamentals/providers/IFundamentalDataProvider';
import { FundamentalDatasetMode } from '../types/fundamentals';

interface DataStatusBannerProps {
  dataStatus: string;
  statusMessage: string;
  dataSources: DataSource[];
  marketProviderStatus?: ProviderStatus;
  fundamentalProviderStatus?: FundamentalProviderStatus;
  fundamentalDatasetMode?: FundamentalDatasetMode;
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
  onOpenSources
}) => {
  const isConnected = dataStatus === 'CONNECTED';
  const macroSources = dataSources.filter((s) => s.id !== 'src-twelvedata');
  const connectedMacroCount = macroSources.filter((s) => s.status === 'CONNECTED').length;
  const fxHealth = marketProviderStatus?.health ?? 'NOT_CONFIGURED';

  // Determine fundamental status badge
  const fundHealth = fundamentalProviderStatus?.health ?? 'DISCONNECTED';
  const isStale = fundamentalProviderStatus?.isStale ?? false;

  let fundBadgeText = 'UNAVAILABLE';
  let fundBadgeStyle = 'bg-rose-950/60 border-rose-500/40 text-rose-300';

  if (fundamentalDatasetMode === 'BENCHMARK') {
    fundBadgeText = 'BENCHMARK';
    fundBadgeStyle = 'bg-purple-950/60 border-purple-500/40 text-purple-300';
  } else if (fundHealth === 'DEGRADED') {
    fundBadgeText = 'DEGRADED LIVE';
    fundBadgeStyle = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
  } else if (isStale && (fundHealth === 'CONNECTED' || fundHealth === 'AVAILABLE')) {
    fundBadgeText = 'STALE LIVE';
    fundBadgeStyle = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
  } else if (fundHealth === 'CONNECTED' || fundHealth === 'AVAILABLE') {
    fundBadgeText = 'LIVE';
    fundBadgeStyle = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
  } else {
    fundBadgeText = 'UNAVAILABLE';
    fundBadgeStyle = 'bg-rose-950/60 border-rose-500/40 text-rose-300';
  }

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
        isConnected
          ? 'bg-neutral-900/60 border-emerald-500/30 text-neutral-300'
          : 'bg-neutral-900/90 border-rose-500/50 text-neutral-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {isConnected ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <TriangleAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-mono font-bold tracking-wider uppercase text-xs ${
                  isConnected ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isConnected
                  ? 'LIVE DATA PIPELINE CONNECTED'
                  : 'DATA SOURCE NOT CONNECTED · PIPELINE SUSPENDED'}
              </span>

              {/* Fundamental Data Badge */}
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${fundBadgeStyle}`}>
                FUNDAMENTALS: {fundBadgeText}
              </span>

              {/* FX Market Data Badge */}
              {marketProviderStatus && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    fxHealth === 'CONNECTED'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : fxHealth === 'DEGRADED'
                      ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  FX: {marketProviderStatus.activeProvider || marketProviderStatus.providerName} ({fxHealth})
                </span>
              )}

              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {connectedMacroCount}/{macroSources.length} Macro Feeds
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-neutral-400 font-mono">
              <span>Source: <span className="text-neutral-200">{fundamentalProviderStatus?.providerName || 'Finance Calendar'}</span></span>
              <span>· Mode: <span className={fundamentalDatasetMode === 'LIVE' ? 'text-emerald-400 font-bold' : 'text-purple-400 font-bold'}>{fundamentalDatasetMode}</span></span>
              <span>· Last Update: <span className="text-neutral-200">{lastUpdateFormatted}</span></span>
              <span>· Freshness: <span className={fundamentalProviderStatus?.freshness === 'FRESH' ? 'text-emerald-400' : 'text-amber-400'}>{fundamentalProviderStatus?.freshness || 'UNAVAILABLE'}</span></span>
            </div>

            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              {statusMessage}
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
