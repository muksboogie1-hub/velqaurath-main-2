import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Target, Activity } from 'lucide-react';
import { CurrencyState, PairIntelligence, ProviderStatus } from '../types';
import { CurrencyFundamentalIntelligence } from '../types';
import { FundamentalProviderStatus } from '../fundamentals/providers/IFundamentalDataProvider';
import { FundamentalDatasetMode } from '../types/fundamentals';
import { deriveFeedStatus } from './feedStatus';

interface MarketPulseHeroProps {
  allCurrencies: CurrencyState[];
  strongCurrencies: CurrencyState[];
  neutralCurrencies: CurrencyState[];
  weakCurrencies: CurrencyState[];
  topPair: PairIntelligence | null;
  marketProviderStatus?: ProviderStatus;
  fundamentalProviderStatus?: FundamentalProviderStatus;
  fundamentalDatasetMode?: FundamentalDatasetMode;
  currencyIntelligence: CurrencyFundamentalIntelligence[];
  onSelectCurrency: (code: string) => void;
  onSelectPair: (symbol: string) => void;
}

function strengthTone(value: number | null): string {
  if (value === null) return 'text-slate-500';
  if (value > 0) return 'text-teal-300';
  if (value < 0) return 'text-rose-300';
  return 'text-slate-400';
}

function formatStrength(currency: CurrencyState): string {
  const value = currency.marketStrength;
  if (value === null) return 'n/a';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * MARKET PULSE — the opening statement of the product.
 *
 * Every value shown here is read from the live dashboard payload. Nothing is
 * inferred, averaged or substituted: a currency without market evidence is
 * shown as unavailable, and a pair without market confirmation is labelled as
 * macro-derived rather than dressed up as a market signal.
 */
export const MarketPulseHero: React.FC<MarketPulseHeroProps> = ({
  allCurrencies,
  strongCurrencies,
  neutralCurrencies,
  weakCurrencies,
  topPair,
  marketProviderStatus,
  fundamentalProviderStatus,
  fundamentalDatasetMode = 'LIVE',
  currencyIntelligence,
  onSelectCurrency,
  onSelectPair
}) => {
  const feedStatus = deriveFeedStatus(
    marketProviderStatus,
    fundamentalProviderStatus,
    fundamentalDatasetMode,
    currencyIntelligence
  );

  const withMarketEvidence = allCurrencies.filter((c) => c.marketStrength !== null).length;
  const universeSize = allCurrencies.length;

  const evidenceSentence = feedStatus.pipeline === 'LIVE'
    ? 'Market and macro evidence are both live and current.'
    : feedStatus.pipeline === 'DEGRADED'
    ? 'Some evidence is stale, partial or reference-only. The view below reflects only what is verified.'
    : 'Current evidence is unavailable. Nothing below is claimed as live.';

  const renderGroup = (
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
        <span className="velqo-chip ml-auto !py-0.5 !text-[0.65rem] tnum">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-[0.7rem] text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((currency) => (
            <button
              key={currency.currency.code}
              onClick={() => onSelectCurrency(currency.currency.code)}
              className="group flex min-h-9 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 transition-all hover:border-teal-400/30 hover:bg-white/[0.06] active:scale-[0.97]"
            >
              <span className="text-[0.8rem] font-semibold text-slate-100">
                {currency.currency.code}
              </span>
              <span className={`text-[0.7rem] tnum ${strengthTone(currency.marketStrength)}`}>
                {formatStrength(currency)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const attentionPair = topPair;
  const attentionDelta = attentionPair?.relativeStrengthDelta ?? null;
  const attentionMacroDerived = attentionDelta === null;

  return (
    <section className="velqo-card velqo-rise overflow-hidden">
      {/* Signature accent rule anchoring the product's opening statement. */}
      <div className="h-px w-full velqo-accent-rule opacity-70" />

      <div className="px-4 py-6 sm:px-7 sm:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="velqo-eyebrow mb-3 text-teal-300/80">Market Pulse</p>
            <h1 className="velqo-display max-w-md text-2xl text-white sm:text-[2.1rem]">
              What is changing across the currency universe?
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
              Relative strength across the core majors, the pair currently demanding
              attention, and the state of the evidence underneath both.
            </p>
          </div>

          {/* Live evidence indicator — secondary, honest, always present. */}
          <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 lg:min-w-56">
            <div className="flex items-center gap-2">
              <Activity
                className={`h-3.5 w-3.5 ${
                  feedStatus.pipeline === 'LIVE'
                    ? 'text-teal-300'
                    : feedStatus.pipeline === 'DEGRADED'
                    ? 'text-amber-300'
                    : 'text-rose-300'
                }`}
              />
              <span className="velqo-eyebrow">Evidence</span>
              <span
                className={`velqo-chip ml-auto !border-transparent !bg-transparent !px-0 !text-[0.65rem] ${
                  feedStatus.pipeline === 'LIVE'
                    ? '!text-teal-300'
                    : feedStatus.pipeline === 'DEGRADED'
                    ? '!text-amber-300'
                    : '!text-rose-300'
                }`}
              >
                {feedStatus.pipeline}
              </span>
            </div>
            <p className="mt-2 text-[0.7rem] leading-relaxed text-slate-500">
              {withMarketEvidence}/{universeSize} currencies carry current market
              evidence · macro {feedStatus.fundamentals}
            </p>
          </div>
        </div>

        {/* Landscape read */}
        <div className="mt-7 grid gap-5 sm:grid-cols-3">
          {renderGroup(
            'Strong',
            <ArrowUpRight className="h-3.5 w-3.5" />,
            strongCurrencies,
            'text-teal-300',
            'No currency is above the strong threshold.'
          )}

          {renderGroup(
            'Balanced',
            <Minus className="h-3.5 w-3.5" />,
            neutralCurrencies,
            'text-slate-400',
            'No currency is in the neutral band.'
          )}

          {renderGroup(
            'Weak',
            <ArrowDownRight className="h-3.5 w-3.5" />,
            weakCurrencies,
            'text-rose-300',
            'No currency is below the weak threshold.'
          )}
        </div>

        {/* Primary attention */}
        <div className="mt-7 border-t border-white/[0.06] pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                <Target className="h-4 w-4 text-teal-300" />
              </span>
              <div className="min-w-0">
                <p className="velqo-eyebrow">Primary attention</p>
                {attentionPair ? (
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <button
                      onClick={() => onSelectPair(attentionPair.pair.symbol)}
                      className="velqo-display text-lg text-white transition-colors hover:text-teal-200"
                    >
                      {attentionPair.pair.symbol}
                    </button>
                    <span
                      className={`text-[0.7rem] font-semibold ${
                        attentionMacroDerived
                          ? 'text-amber-300'
                          : attentionDelta! > 0
                          ? 'text-teal-300'
                          : attentionDelta! < 0
                          ? 'text-rose-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {attentionMacroDerived
                        ? 'MACRO-DERIVED BIAS'
                        : attentionDelta! > 0
                        ? 'BULLISH BIAS'
                        : attentionDelta! < 0
                        ? 'BEARISH BIAS'
                        : 'NEUTRAL'}
                    </span>
                    <span className="text-[0.7rem] tnum text-slate-500">
                      {attentionMacroDerived
                        ? '· market Δ unavailable'
                        : `· Δ ${attentionDelta! >= 0 ? '+' : ''}${attentionDelta!.toFixed(2)}%`}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-[0.8rem] text-slate-400">
                    No pair intelligence is available from current evidence.
                  </p>
                )}
              </div>
            </div>

            <p className="max-w-sm text-[0.7rem] leading-relaxed text-slate-500 sm:text-right">
              {evidenceSentence}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
