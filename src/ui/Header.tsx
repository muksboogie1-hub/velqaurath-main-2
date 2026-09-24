import React from 'react';
import { Settings2 } from 'lucide-react';
import { FundamentalProviderStatus } from '../fundamentals/providers/IFundamentalDataProvider';
import { FundamentalDatasetMode } from '../types/fundamentals';

interface HeaderProps {
  dataStatus: string;
  fundamentalProviderStatus?: FundamentalProviderStatus;
  fundamentalDatasetMode?: FundamentalDatasetMode;
  onOpenSources: () => void;
  onOpenThresholds: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataStatus,
  fundamentalProviderStatus,
  fundamentalDatasetMode = 'LIVE',
  onOpenSources,
  onOpenThresholds
}) => {
  const isConnected = dataStatus === 'CONNECTED';
  const fundHealth = fundamentalProviderStatus?.health ?? 'DISCONNECTED';
  const isStale = fundamentalProviderStatus?.isStale ?? false;

  let badgeLabel = 'LIVE FEED';
  let badgeColor = 'border-emerald-500/30 text-emerald-400';
  let dotColor = 'bg-emerald-400 animate-pulse';

  if (!isConnected) {
    badgeLabel = 'DISCONNECTED';
    badgeColor = 'border-rose-500/40 text-rose-400';
    dotColor = 'bg-rose-500';
  } else if (fundamentalDatasetMode === 'BENCHMARK') {
    badgeLabel = 'BENCHMARK';
    badgeColor = 'border-purple-500/40 text-purple-400';
    dotColor = 'bg-purple-400';
  } else if (fundHealth === 'DEGRADED') {
    badgeLabel = 'DEGRADED LIVE';
    badgeColor = 'border-amber-500/40 text-amber-400';
    dotColor = 'bg-amber-400';
  } else if (isStale) {
    badgeLabel = 'STALE LIVE';
    badgeColor = 'border-amber-500/40 text-amber-400';
    dotColor = 'bg-amber-400';
  } else {
    badgeLabel = 'LIVE FEED';
    badgeColor = 'border-emerald-500/30 text-emerald-400';
    dotColor = 'bg-emerald-400 animate-pulse';
  }

  return (
    <header className="sticky top-0 z-30 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-wider text-neutral-100 uppercase">
              VELQOARATH
            </span>
            <span className="text-[10px] tracking-wide text-neutral-500 hidden sm:inline">
              · Global Market Intelligence
            </span>
          </div>
          <span className="text-[10px] text-neutral-600 font-mono tracking-tight">
            Terminal v1.0 · Built by Boogie
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSources}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors border bg-neutral-900/90 ${badgeColor} hover:border-neutral-500`}
            title="Inspect Data Sources, Fundamental Feeds, and Pipeline Status"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            <span className="text-[11px] tracking-tight">{badgeLabel}</span>
          </button>

          <button
            onClick={onOpenThresholds}
            className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors"
            title="Configure Strength Thresholds"
            aria-label="Configure Thresholds"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
