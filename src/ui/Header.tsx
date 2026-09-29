import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
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

/**
 * A compact monogram built from the product's own initial. It gives the brand
 * a recognisable mark without borrowing the visual language of any existing
 * financial terminal.
 */
function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`relative flex items-center justify-center rounded-[0.7rem] bg-gradient-to-br from-teal-300 via-teal-400 to-cyan-500 text-velqo-ink font-bold ${className}`}
      style={{ boxShadow: '0 8px 22px -10px rgba(45, 212, 191, 0.85)' }}
      aria-hidden="true"
    >
      <span className="absolute inset-[1.5px] rounded-[0.6rem] border border-black/15" />
      <svg viewBox="0 0 24 24" className="relative h-[52%] w-[52%]" fill="none">
        <path
          d="M3 6.5 9 15l3-4.2L15 16l6-9.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export const Header: React.FC<HeaderProps> = ({
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

  const evidenceLabel = feedStatus.pipeline === 'LIVE'
    ? 'Evidence live'
    : feedStatus.pipeline === 'DEGRADED'
    ? 'Evidence degraded'
    : 'Evidence unavailable';

  const dotColor = feedStatus.pipeline === 'LIVE'
    ? 'bg-teal-300'
    : feedStatus.pipeline === 'DEGRADED'
    ? 'bg-amber-400'
    : 'bg-rose-400';

  const textColor = feedStatus.pipeline === 'LIVE'
    ? 'text-teal-200'
    : feedStatus.pipeline === 'DEGRADED'
    ? 'text-amber-200'
    : 'text-rose-200';

  const borderColor = feedStatus.pipeline === 'LIVE'
    ? 'border-teal-400/20 hover:border-teal-400/40'
    : feedStatus.pipeline === 'DEGRADED'
    ? 'border-amber-400/25 hover:border-amber-400/45'
    : 'border-rose-400/25 hover:border-rose-400/45';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.06] bg-velqo-ink/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="h-9 w-9 shrink-0 text-[0.9rem] sm:h-10 sm:w-10" />

          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="velqo-display text-[1.05rem] text-white sm:text-xl">
                VELQOARATH
              </span>
              <span className="hidden truncate text-[0.7rem] text-slate-400 sm:inline">
                · Global Market Intelligence
              </span>
            </div>
            <p className="mt-0.5 truncate text-[0.65rem] text-slate-500 sm:text-[0.7rem]">
              Built by Boogie · Read the market, understand the why.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/*
           * Evidence stays reachable from the header, but it is a quiet status
           * affordance rather than the centrepiece of the product.
           */}
          <button
            onClick={onOpenSources}
            className={`flex min-h-9 items-center gap-2 rounded-full border bg-white/[0.03] px-3 py-1.5 text-[0.7rem] font-medium transition-colors ${borderColor} ${textColor}`}
            title={`${evidenceLabel}. Open evidence and data sources.`}
            aria-label={`${evidenceLabel}. Open evidence and data sources.`}
          >
            <span
              className={`velqo-pulse-ring h-1.5 w-1.5 rounded-full ${dotColor} ${
                feedStatus.pipeline === 'LIVE' ? 'velqo-breathe' : ''
              }`}
            />
            <span className="hidden sm:inline">Evidence</span>
            <span className="hidden md:inline opacity-70">· {feedStatus.pipeline}</span>
          </button>

          <button
            onClick={onOpenThresholds}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03] text-slate-400 transition-colors hover:border-teal-400/30 hover:text-teal-200"
            title="Configure strength thresholds"
            aria-label="Configure strength thresholds"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Creator identity as a first-class part of the product frame. */}
      <div className="mx-auto hidden max-w-6xl items-center gap-2 pb-2 md:flex">
        <span className="h-px flex-1 velqo-accent-rule opacity-40" />
        <span className="velqo-eyebrow text-[0.6rem] text-slate-600">
          Intelligence, not execution
        </span>
        <span className="h-px flex-1 velqo-accent-rule opacity-40" />
      </div>
    </header>
  );
};
