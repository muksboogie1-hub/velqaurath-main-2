import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Target, Activity } from 'lucide-react';
import { CurrencyState, ProviderStatus } from '../types';
import type { FocusBasketStanding, FocusPair } from '../types/focus';
import { CurrencyFundamentalIntelligence } from '../types';
import { FundamentalProviderStatus } from '../fundamentals/providers/IFundamentalDataProvider';
import { FundamentalDatasetMode } from '../types/fundamentals';
import { deriveFeedStatus, describeEvidenceCoverage } from './feedStatus';

function joinClauses(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function capitalise(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

interface MarketPulseHeroProps {
  allCurrencies: CurrencyState[];
  strongCurrencies: CurrencyState[];
  neutralCurrencies: CurrencyState[];
  weakCurrencies: CurrencyState[];
  /**
   * The pair the focus engine promoted. It is deliberately the same selection
   * the Pair in Focus card shows, so the opening statement and the headline
   * bias can never disagree.
   */
  topPair: FocusPair | null;
  /** The live basket standing, used for the "what changed" reading. */
  basket: FocusBasketStanding | null;
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
  basket,
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
  const coverage = describeEvidenceCoverage(feedStatus, allCurrencies.length);

  const withMarketEvidence = allCurrencies.filter((c) => c.marketStrength !== null).length;
  const universeSize = allCurrencies.length;

  /*
   * One coherent coverage statement, taken from the derived truth model. The
   * raw state stays available on the chips and in the inspector.
   */

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
              className="group flex min-h-10 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 transition-all hover:border-teal-400/30 hover:bg-white/[0.06] active:scale-[0.97] sm:min-h-9"
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

            {/*
             * Observed / Macro context / Reading are kept visually and
             * semantically apart. The measurement is never dressed up as the
             * interpretation, and the interpretation never claims causation the
             * evidence model does not establish.
             */}
            {basket?.observed ? (
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="velqo-eyebrow !text-teal-300/80">Observed</span>
                <h1 className="velqo-display max-w-md text-2xl text-white sm:text-[2.1rem]">
                  {basket.leader?.code}{' '}
                  <span className={strengthTone(basket.observed.strength)}>
                    {basket.observed.strength >= 0 ? '+' : ''}
                    {basket.observed.strength.toFixed(2)}%
                  </span>
                </h1>
              </div>
            ) : (
              <h1 className="velqo-display max-w-md text-2xl text-white sm:text-[2.1rem]">
                {basket?.statement ?? 'Reading the live currency basket'}
              </h1>
            )}

            <p className="mt-2 max-w-md text-[0.78rem] leading-relaxed text-slate-400">
              {basket?.statement ?? ''}
            </p>

            {basket && basket.macroContext.length > 0 && (
              <div className="mt-3 max-w-md">
                <p className="velqo-eyebrow mb-1.5">Macro context</p>
                <ul className="space-y-1">
                  {basket.macroContext.map((observation) => (
                    <li
                      key={`${observation.indicator}-${observation.releaseDate ?? ''}`}
                      className="text-[0.78rem] leading-relaxed text-slate-300"
                    >
                      <span className="text-slate-100">{observation.indicator}</span>
                      <span className="text-slate-500"> · {observation.category.toLowerCase()}</span>
                      <span className="tnum"> · {observation.actual}{observation.unit}</span>
                      {observation.previous !== null && (
                        <span className="text-slate-500 tnum">
                          {' '}vs previous {observation.previous}{observation.unit}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {basket?.reading && (
              <div className="mt-3 max-w-md">
                <p className="velqo-eyebrow mb-1.5">VELQAURATH read</p>
                <p className="text-[0.8rem] leading-relaxed text-slate-300">{basket.reading}</p>
              </div>
            )}

            {basket && basket.incomplete.length > 0 && (
              <p className="mt-2 max-w-md text-[0.75rem] leading-relaxed text-slate-500">
                {capitalise(joinClauses(basket.incomplete))}.
              </p>
            )}
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
              {coverage.sentence}
            </p>
            <p className="mt-1 text-[0.65rem] leading-relaxed text-slate-600">
              {withMarketEvidence}/{universeSize} currencies carry current market evidence
            </p>
          </div>        </div>

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
                      onClick={() => onSelectPair(attentionPair.symbol)}
                      className="velqo-display text-lg text-white transition-colors hover:text-teal-200"
                    >
                      {attentionPair.symbol}
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
                    No primary pair — the research lead is named below.
                  </p>
                )}
              </div>
            </div>

            <p className="max-w-sm text-[0.7rem] leading-relaxed text-slate-500 sm:text-right">
              {coverage.market}.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
