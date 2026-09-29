import React from 'react';
import { Info, TrendingUp, TrendingDown, Minus, SlidersHorizontal } from 'lucide-react';
import { CurrencyState, ProviderStatus, StrengthThresholds } from '../types';

interface MarketContextProps {
  allCurrencies: CurrencyState[];
  strongCurrencies: CurrencyState[];
  neutralCurrencies: CurrencyState[];
  weakCurrencies: CurrencyState[];
  thresholds: StrengthThresholds;
  onSelectCurrency: (code: string) => void;
  onOpenThresholds?: () => void;
  marketProviderStatus?: ProviderStatus;
}

/**
 * MARKET CONTEXT — the spread of the universe and the framework behind it.
 *
 * The hero states the pulse; this view explains how the classification is
 * drawn and which quotes were excluded from it. Unavailable market evidence
 * suppresses the spread entirely rather than showing a misleading zero.
 */
export const MarketContext: React.FC<MarketContextProps> = ({
  allCurrencies,
  strongCurrencies,
  neutralCurrencies,
  weakCurrencies,
  thresholds,
  onSelectCurrency,
  onOpenThresholds,
  marketProviderStatus
}) => {
  const hasUsableMarketData = allCurrencies.some((c) => c.marketStrength !== null);

  const isNotConfigured = marketProviderStatus?.isConfigured === false;
  const isStale =
    marketProviderStatus?.runtimeFeedState === 'STALE' ||
    marketProviderStatus?.snapshotHealth === 'STALE';
  const isDegraded =
    marketProviderStatus?.runtimeFeedState === 'DEGRADED' ||
    marketProviderStatus?.snapshotHealth === 'AGING';
  const isUnavailable =
    !isNotConfigured &&
    !isStale &&
    !isDegraded &&
    (allCurrencies.length === 0 ||
      (!hasUsableMarketData && (marketProviderStatus?.quotesCount ?? 0) === 0));
  const isDataUnavailable = isNotConfigured || isStale || isDegraded || isUnavailable;

  const stalePairsList = Array.from(
    new Set(
      allCurrencies.flatMap((c) => c.relativeStrengthBreakdown?.coverage?.stalePairs ?? [])
    )
  );

  const group = (
    label: string,
    icon: React.ReactNode,
    items: CurrencyState[],
    tone: string,
    emptyLabel: string
  ) => (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2">
        <span className={tone}>{icon}</span>
        <span className="velqo-eyebrow">{label}</span>
        <span className="velqo-chip ml-auto !py-0.5 !text-[0.65rem] tnum">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-[0.7rem] leading-relaxed text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((c) => (
            <button
              key={c.currency.code}
              onClick={() => onSelectCurrency(c.currency.code)}
              className="group flex min-h-9 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 transition-all hover:border-teal-400/30 hover:bg-white/[0.06] active:scale-[0.97]"
            >
              <span className="text-[0.78rem] font-semibold text-slate-100">
                {c.currency.code}
              </span>
              <span
                className={`text-[0.68rem] tnum ${
                  c.marketStrength === null
                    ? 'text-slate-500'
                    : c.marketStrength > 0
                    ? 'text-teal-300'
                    : c.marketStrength < 0
                    ? 'text-rose-300'
                    : 'text-slate-400'
                }`}
              >
                {c.marketStrength === null
                  ? 'n/a'
                  : `${c.marketStrength >= 0 ? '+' : ''}${c.marketStrength.toFixed(2)}%`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section className="velqo-card px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="velqo-eyebrow mb-1.5">Market context</p>
          <h2 className="velqo-display text-lg text-white sm:text-xl">
            How the universe is classified
          </h2>
          <p className="mt-1.5 max-w-lg text-[0.72rem] leading-relaxed text-slate-500">
            Basket-relative movement. Strong at or above{' '}
            <span className="tnum text-slate-300">
              +{thresholds.strongThreshold.toFixed(2)}%
            </span>
            , weak at or below{' '}
            <span className="tnum text-slate-300">
              {thresholds.weakThreshold.toFixed(2)}%
            </span>
            . Stale contributing quotes are excluded rather than estimated.
          </p>
        </div>

        {onOpenThresholds && (
          <button
            onClick={onOpenThresholds}
            className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 text-[0.7rem] text-slate-400 transition-colors hover:border-teal-400/30 hover:text-teal-200"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Thresholds
          </button>
        )}
      </div>

      {stalePairsList.length > 0 && (
        <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-1.5 text-[0.68rem] text-amber-200/90">
          Excluded as stale: <span className="tnum">{stalePairsList.join(', ')}</span>
        </p>
      )}

      {isDataUnavailable ? (
        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center">
          <Info className="mx-auto h-5 w-5 text-amber-300/80" />
          <h3 className="mt-2.5 text-[0.85rem] font-semibold text-slate-200">
            {isNotConfigured
              ? 'Market evidence not configured'
              : isStale
              ? 'Market evidence is stale'
              : isDegraded
              ? 'Market coverage is partial'
              : 'Market evidence unavailable'}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-[0.75rem] leading-relaxed text-slate-500">
            {isNotConfigured
              ? 'No active FX market-data provider is configured, so no relative-strength read can be produced.'
              : isStale
              ? `The provider is connected, but the ${marketProviderStatus?.quotesCount ?? 0} available quotes are stale. Strength is withheld until current quotes return.`
              : isDegraded
              ? `${marketProviderStatus?.availablePairsCount ?? 0}/${marketProviderStatus?.requiredPairsCount ?? 0} required pairs carry usable quotes.`
              : 'No usable current FX quotes are available. Macroeconomic conditions and policy posture remain available below.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {group(
            'Strong',
            <TrendingUp className="h-3.5 w-3.5" />,
            strongCurrencies,
            'text-teal-300',
            `No currency is at or above +${thresholds.strongThreshold.toFixed(2)}%.`
          )}
          {group(
            'Balanced',
            <Minus className="h-3.5 w-3.5" />,
            neutralCurrencies,
            'text-slate-400',
            'No currency sits in the neutral band.'
          )}
          {group(
            'Weak',
            <TrendingDown className="h-3.5 w-3.5" />,
            weakCurrencies,
            'text-rose-300',
            `No currency is at or below ${thresholds.weakThreshold.toFixed(2)}%.`
          )}
        </div>
      )}
    </section>
  );
};
