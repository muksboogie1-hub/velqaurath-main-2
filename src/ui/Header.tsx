import React from 'react';
import { Settings2 } from 'lucide-react';
import { FundamentalProviderStatus } from '../fundamentals/providers/IFundamentalDataProvider';
import { FundamentalDatasetMode } from '../types/fundamentals';
import { CurrencyFundamentalIntelligence, ProviderStatus } from '../types';
import { deriveFeedStatus } from './feedStatus';

interface HeaderProps {
  dataStatus: string;
  marketProviderStatus?: ProviderStatus;
  fundamentalProviderStatus?: FundamentalProviderStatus;
  fundamentalDatasetMode?: FundamentalDatasetMode;
  currencyIntelligence: CurrencyFundamentalIntelligence[];
  onOpenSources: () => void;
  onOpenThresholds: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataStatus,
  marketProviderStatus,
  fundamentalProviderStatus,
  fundamentalDatasetMode = 'LIVE',
  currencyIntelligence,
  onOpenSources,
  onOpenThresholds
}) => {
  const feedStatus = deriveFeedStatus(
    marketProviderStatus,
    fundamentalProviderStatus,
    fundamentalDatasetMode,
    currencyIntelligence
  );
  const badgeLabel = feedStatus.pipeline === 'LIVE'
    ? 'LIVE EVIDENCE'
    : feedStatus.pipeline === 'DEGRADED'
    ? 'DEGRADED'
    : 'UNAVAILABLE';
  const badgeColor = feedStatus.pipeline === 'LIVE'
    ? 'border-emerald-500/30 text-emerald-400'
    : feedStatus.pipeline === 'DEGRADED'
    ? 'border-amber-500/40 text-amber-400'
    : 'border-rose-500/40 text-rose-400';
  const dotColor = feedStatus.pipeline === 'LIVE'
    ? 'bg-emerald-400 animate-pulse'
    : feedStatus.pipeline === 'DEGRADED'
    ? 'bg-amber-400'
    : 'bg-rose-500';

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
            title={`Evidence status: ${feedStatus.pipeline}. Inspect data sources and freshness.`}
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
