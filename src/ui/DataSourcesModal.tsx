import React from 'react';
import { Database, Power, Activity, Calendar, ExternalLink, X, RefreshCw } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col text-neutral-200">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-100">
              Primary Data Sources & Pipeline Architecture
            </h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Integrity Principle */}
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded font-sans leading-relaxed text-neutral-300">
            <span className="font-bold text-neutral-100 block mb-1">
              VELQOARATH Data Integrity Principle:
            </span>
            VELQOARATH never fabricates CPI, GDP, employment, central bank decisions, or FX market quotes. When real feeds are offline or unconfigured, the engine explicitly displays <span className="font-mono text-rose-400">DATA SOURCE NOT CONNECTED</span> or <span className="font-mono text-amber-400">DATA UNAVAILABLE</span> rather than generating placeholder numbers. Every observation retains verified provenance and fact vs expectation separation.
          </div>

          {/* Macro Connection Toggle */}
          <div className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded font-mono">
            <div>
              <span className="text-[11px] text-neutral-400 block uppercase">
                Macro Pipeline Connection State
              </span>
              <span className={`font-bold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isConnected ? 'LIVE PIPELINE CONNECTED (OFFICIAL DATA)' : 'DISCONNECTED (DATA UNAVAILABLE)'}
              </span>
            </div>
            <button
              onClick={onToggleConnection}
              className={`px-3 py-1.5 rounded font-bold border transition-colors flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isConnected ? 'Disconnect Macro Feeds' : 'Connect Verified Macro Feeds'}
            </button>
          </div>

          {/* Fundamental Data Provider: Finance Calendar */}
          <div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-200">
                  Fundamental Data Provider: Finance Calendar
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded border font-bold ${
                    isBenchmark
                      ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                      : fundHealth === 'CONNECTED' || fundHealth === 'AVAILABLE'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : fundHealth === 'DEGRADED'
                      ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {isBenchmark ? 'BENCHMARK (TEST)' : `LIVE (${fundHealth})`}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-500">Live Provider Base URL:</span>
                <span className="text-emerald-400 font-bold truncate max-w-xs">
                  https://www.financecalendar.com/wp-json/fc/v1
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">API Key Requirement:</span>
                <span className="text-neutral-300">None (Public REST API, edge-cached)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Dataset Mode:</span>
                <span className={isBenchmark ? 'text-purple-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {fundamentalDatasetMode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Freshness Status:</span>
                <span className={fundamentalProviderStatus?.freshness === 'FRESH' ? 'text-emerald-400' : 'text-amber-400'}>
                  {fundamentalProviderStatus?.freshness || 'UNAVAILABLE'}
                  {fundamentalProviderStatus?.isStale ? ' (Stale threshold exceeded)' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Currencies Supported:</span>
                <span className="text-neutral-200">8 (USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Last Successful Sync:</span>
                <span>
                  {fundamentalProviderStatus?.lastSuccessfulUpdate
                    ? new Date(fundamentalProviderStatus.lastSuccessfulUpdate).toUTCString()
                    : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Provider Message:</span>
                <span className="text-neutral-400 text-right max-w-xs line-clamp-1">
                  {fundamentalProviderStatus?.message || 'Awaiting initial connection.'}
                </span>
              </div>
            </div>

            {/* Benchmark / Live Mode Toggle */}
            <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[10px] text-neutral-400">
                Mode: {isBenchmark ? 'Baseline Benchmark (Isolated)' : 'Finance Calendar Live Pipeline'}
              </span>
              {onToggleBenchmarkMode && (
                <button
                  onClick={() => onToggleBenchmarkMode(!isBenchmark)}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-mono border border-neutral-700 transition-colors"
                >
                  {isBenchmark ? 'Switch to LIVE Pipeline' : 'Switch to Benchmark (Test)'}
                </button>
              )}
            </div>

            <div className="mt-2 text-[10px] text-neutral-500 flex items-center gap-1 font-sans">
              <span>Data provided by Finance Calendar.</span>
              <a
                href="https://www.financecalendar.com"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
              >
                financecalendar.com <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* FX Provider Status */}
          <div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-200">
                  Live FX Market Data Provider
                </span>
              </div>
              <span
                className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                  fxHealth === 'CONNECTED'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : fxHealth === 'DEGRADED'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                    : fxHealth === 'ERROR'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}
              >
                {fxHealth}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-500">Active Provider:</span>
                <span className="text-emerald-400 font-bold">
                  {marketProviderStatus?.activeProvider ?? marketProviderStatus?.providerName ?? 'Biquote'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Primary Feed:</span>
                <span className="text-neutral-200">Biquote (Public REST & SignalR Tick Hub)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Secondary Fallback:</span>
                <span className="text-neutral-400">
                  Twelve Data ({marketProviderStatus?.fallbackAvailable ? 'Available' : 'Not Configured'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Pairs Observed:</span>
                <span>
                  {marketProviderStatus?.availablePairsCount ?? 0} / {marketProviderStatus?.requiredPairsCount ?? 15} liquid pairs
                  {marketProviderStatus?.stalePairs && marketProviderStatus.stalePairs.length > 0 && (
                    <span className="text-amber-400 ml-1">
                      ({marketProviderStatus.stalePairs.length} stale)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Provider Message:</span>
                <span className="text-neutral-400 text-right max-w-xs line-clamp-1">
                  {marketProviderStatus?.message ?? 'Awaiting initialization.'}
                </span>
              </div>
            </div>
          </div>

          {/* Statistical Agencies */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider block">
              Configured Primary Statistical Agencies ({macroSources.length})
            </span>
            {macroSources.map((source) => (
              <div
                key={source.id}
                className="p-3 bg-neutral-900/40 border border-neutral-800 rounded hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-200">{source.name}</span>
                      <span className="text-[10px] font-mono text-neutral-500">({source.institution})</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {source.coverage.map((c, i) => (
                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[11px]">
                    <span className={`block font-semibold ${source.status === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {source.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                    <span className="text-[10px] text-neutral-500">Grade: {source.reliabilityGrade}</span>
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
