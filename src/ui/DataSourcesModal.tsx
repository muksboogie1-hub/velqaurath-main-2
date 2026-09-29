import React from 'react';
import { Power, Activity, Calendar, ExternalLink, X, RefreshCw } from 'lucide-react';
import { DataSource, ProviderStatus } from '../types';
import { FundamentalProviderStatus } from '../fundamentals/providers/IFundamentalDataProvider';
import { FundamentalDatasetMode } from '../types/fundamentals';

interface DataSourcesModalProps {
  dataSources: DataSource[];
  dataStatus: string;
  marketProviderStatus?: ProviderStatus;
  fundamentalProviderStatus?: FundamentalProviderStatus;
  fundamentalDatasetMode?: FundamentalDatasetMode;
  isOpen: boolean;
  onClose: () => void;
  onToggleConnection: () => void;
  onToggleBenchmarkMode?: (enableBenchmark: boolean) => void;
}

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({
  dataSources,
  dataStatus,
  marketProviderStatus,
  fundamentalProviderStatus,
  fundamentalDatasetMode = 'LIVE',
  isOpen,
  onClose,
  onToggleConnection,
  onToggleBenchmarkMode
}) => {
  if (!isOpen) return null;

  const isConnected = dataStatus === 'CONNECTED';
  const macroSources = dataSources.filter((s) => s.id !== 'src-twelvedata');
  const fxHealth = marketProviderStatus?.health ?? 'NOT_CONFIGURED';

  const fundHealth = fundamentalProviderStatus?.health ?? 'DISCONNECTED';
  const isBenchmark = fundamentalDatasetMode === 'BENCHMARK';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-velqo-ink/80 p-4 backdrop-blur-md">
      <div className="velqo-card flex max-h-[85vh] w-full max-w-2xl flex-col">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="velqo-eyebrow mb-1.5">Provenance</p>
            <h2 className="velqo-display text-lg text-white">Evidence &amp; sources</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.07] text-slate-400 transition-colors hover:border-teal-400/30 hover:text-teal-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 text-xs">
          {/* Integrity Principle */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 leading-relaxed text-slate-300">
            <span className="mb-1 block font-semibold text-slate-100">
              VELQOARATH never fabricates evidence
            </span>
            CPI, GDP, employment, central bank decisions and FX quotes are only ever shown when a
            verified feed supplies them. When a feed is offline or unconfigured the product reports{' '}
            <span className="text-rose-300">source not connected</span> or{' '}
            <span className="text-amber-200">data unavailable</span> — never a placeholder number.
            Every observation keeps its provenance and its fact-versus-expectation separation.
          </div>

          {/* Macro Connection Toggle */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="velqo-eyebrow mb-1 block">Macro pipeline</span>
              <span className={`text-[0.8rem] font-semibold ${isConnected ? 'text-teal-200' : 'text-rose-200'}`}>
                {isConnected ? 'Live · official data connected' : 'Disconnected · data unavailable'}
              </span>
            </div>
            <button
              onClick={onToggleConnection}
              className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.75rem] font-semibold transition-colors ${
                isConnected
                  ? 'border-rose-400/25 bg-rose-400/[0.07] text-rose-200 hover:bg-rose-400/[0.12]'
                  : 'border-teal-400/25 bg-teal-400/[0.07] text-teal-200 hover:bg-teal-400/[0.12]'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {isConnected ? 'Disconnect macro feeds' : 'Connect verified macro feeds'}
            </button>
          </div>

          {/* Fundamental Data Provider: Finance Calendar */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-300" />
                <span className="text-[0.8rem] font-semibold text-slate-200">
                  Macro provider · Finance Calendar
                </span>
              </div>
              <span
                className={`velqo-chip !py-0.5 !text-[0.62rem] ${
                  isBenchmark
                    ? '!border-violet-400/30 !text-violet-200'
                    : fundHealth === 'CONNECTED' || fundHealth === 'AVAILABLE'
                    ? '!border-teal-400/30 !text-teal-200'
                    : fundHealth === 'DEGRADED'
                    ? '!border-amber-400/30 !text-amber-200'
                    : '!border-rose-400/30 !text-rose-200'
                }`}
              >
                {isBenchmark ? 'Benchmark (test)' : `Live · ${fundHealth}`}
              </span>
            </div>

            <div className="space-y-1.5 text-[0.72rem] text-slate-300">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Provider endpoint</span>
                <span className="truncate text-right text-slate-400">
                  https://www.financecalendar.com/wp-json/fc/v1
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">API key</span>
                <span className="text-slate-300">None (public REST, edge-cached)</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Dataset mode</span>
                <span className={isBenchmark ? 'text-violet-200' : 'text-teal-200'}>
                  {fundamentalDatasetMode}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Freshness</span>
                <span
                  className={
                    fundamentalProviderStatus?.freshness === 'FRESH' ? 'text-teal-200' : 'text-amber-200'
                  }
                >
                  {fundamentalProviderStatus?.freshness || 'UNAVAILABLE'}
                  {fundamentalProviderStatus?.isStale ? ' · stale threshold exceeded' : ''}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Currencies</span>
                <span className="text-slate-200">8 (USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD)</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Macro categories</span>
                <span className="text-slate-200 tnum">
                  {fundamentalProviderStatus?.categoriesPopulatedCount ?? 0} populated /{' '}
                  {fundamentalProviderStatus?.categoriesConfiguredCount ?? 10} configured
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Last successful sync</span>
                <span>
                  {fundamentalProviderStatus?.lastSuccessfulUpdate
                    ? new Date(fundamentalProviderStatus.lastSuccessfulUpdate).toUTCString()
                    : 'None'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Provider message</span>
                <span className="max-w-xs text-right text-slate-400">
                  {fundamentalProviderStatus?.message || 'Awaiting initial connection.'}
                </span>
              </div>
            </div>

            {/* Benchmark / Live Mode Toggle */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
              <span className="text-[0.68rem] text-slate-500">
                {isBenchmark ? 'Baseline benchmark (isolated)' : 'Finance Calendar live pipeline'}
              </span>
              {onToggleBenchmarkMode && (
                <button
                  onClick={() => onToggleBenchmarkMode(!isBenchmark)}
                  className="min-h-8 rounded-full border border-white/[0.07] px-3 text-[0.7rem] text-slate-300 transition-colors hover:border-teal-400/30 hover:text-teal-200"
                >
                  {isBenchmark ? 'Switch to live' : 'Switch to benchmark (test)'}
                </button>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1 text-[0.68rem] text-slate-500">
              <span>Macro data provided by Finance Calendar.</span>
              <a
                href="https://www.financecalendar.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-teal-300 transition-colors hover:text-teal-200 hover:underline"
              >
                financecalendar.com <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          {/* FX Provider Status */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-300" />
                <span className="text-[0.8rem] font-semibold text-slate-200">Live FX market provider</span>
              </div>
              <span
                className={`velqo-chip !py-0.5 !text-[0.62rem] ${
                  fxHealth === 'CONNECTED'
                    ? '!border-teal-400/30 !text-teal-200'
                    : fxHealth === 'DEGRADED'
                    ? '!border-amber-400/30 !text-amber-200'
                    : fxHealth === 'ERROR'
                    ? '!border-rose-400/30 !text-rose-200'
                    : '!border-white/10 !text-slate-400'
                }`}
              >
                {fxHealth}
              </span>
            </div>

            <div className="space-y-1.5 text-[0.72rem] text-slate-300">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Active provider</span>
                <span className="text-teal-200">
                  {marketProviderStatus?.activeProvider ?? marketProviderStatus?.providerName ?? 'Biquote'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Primary feed</span>
                <span className="text-slate-200">Biquote (public REST + SignalR tick hub)</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Secondary fallback</span>
                <span className="text-slate-400">
                  Twelve Data ({marketProviderStatus?.fallbackAvailable ? 'available' : 'not configured'})
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Pairs observed</span>
                <span>
                  <span className="tnum">
                    {marketProviderStatus?.availablePairsCount ?? 0} /{' '}
                    {marketProviderStatus?.requiredPairsCount ?? 15} liquid pairs
                  </span>
                  {marketProviderStatus?.stalePairs && marketProviderStatus.stalePairs.length > 0 && (
                    <span className="ml-1 text-amber-300">
                      ({marketProviderStatus.stalePairs.length} stale)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Provider message</span>
                <span className="max-w-xs text-right text-slate-400">
                  {marketProviderStatus?.message ?? 'Awaiting initialization.'}
                </span>
              </div>
            </div>
          </div>

          {/* Statistical Agencies */}
          <div className="space-y-2">
            <span className="velqo-eyebrow block">
              Configured statistical agencies ({macroSources.length})
            </span>
            {macroSources.map((source) => (
              <div
                key={source.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/[0.1]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-200">{source.name}</span>
                      <span className="text-[0.68rem] text-slate-500">{source.institution}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {source.coverage.map((c, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[0.65rem] text-slate-400"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[0.7rem]">
                    <span
                      className={`block font-semibold ${source.status === 'CONNECTED' ? 'text-teal-200' : 'text-rose-200'}`}
                    >
                      {source.status === 'CONNECTED' ? 'Connected' : 'Disconnected'}
                    </span>
                    <span className="text-[0.65rem] text-slate-500">Grade {source.reliabilityGrade}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
