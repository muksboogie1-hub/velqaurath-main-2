import { Pair } from '../types';
import { CANONICAL_15_PAIRS } from '../marketData/config';

export interface CurrencyPairItem extends Pair {
  standardPipDigits: number;
}

/**
 * EXACT 15 LIVE MARKET PAIR UNIVERSE
 *
 * Configured to match the Biquote live market-data stream and CANONICAL_15_PAIRS exactly (15 pairs).
 * Unsupported pairs (EUR/AUD, GBP/AUD, AUD/NZD) are excluded from the live universe
 * to avoid substituting synthetic/benchmark prices for live market pairs.
 */
export const INITIAL_PAIRS: CurrencyPairItem[] = [
  {
    id: 'pair-eurusd',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    symbol: 'EUR/USD',
    active: true,
    standardPipDigits: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-gbpusd',
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
    symbol: 'GBP/USD',
    active: true,
    standardPipDigits: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-usdjpy',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    symbol: 'USD/JPY',
    active: true,
    standardPipDigits: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-usdchf',
    baseCurrency: 'USD',
    quoteCurrency: 'CHF',
    symbol: 'USD/CHF',
    active: true,
    standardPipDigits: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-audusd',
    baseCurrency: 'AUD',
    quoteCurrency: 'USD',
    symbol: 'AUD/USD',
    active: true,
    standardPipDigits: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-nzdusd',
    baseCurrency: 'NZD',
    quoteCurrency: 'USD',
    symbol: 'NZD/USD',
    active: true,
    standardPipDigits: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-usdcad',
    baseCurrency: 'USD',
    quoteCurrency: 'CAD',
    symbol: 'USD/CAD',
    active: true,
    standardPipDigits: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-eurgbp',
    baseCurrency: 'EUR',
    quoteCurrency: 'GBP',
    symbol: 'EUR/GBP',
    active: true,
    standardPipDigits: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-eurjpy',
    baseCurrency: 'EUR',
    quoteCurrency: 'JPY',
    symbol: 'EUR/JPY',
    active: true,
    standardPipDigits: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-gbpjpy',
    baseCurrency: 'GBP',
    quoteCurrency: 'JPY',
    symbol: 'GBP/JPY',
    active: true,
    standardPipDigits: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-eurchf',
    baseCurrency: 'EUR',
    quoteCurrency: 'CHF',
    symbol: 'EUR/CHF',
    active: true,
    standardPipDigits: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-gbpchf',
    baseCurrency: 'GBP',
    quoteCurrency: 'CHF',
    symbol: 'GBP/CHF',
    active: true,
    standardPipDigits: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-audjpy',
    baseCurrency: 'AUD',
    quoteCurrency: 'JPY',
    symbol: 'AUD/JPY',
    active: true,
    standardPipDigits: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-nzdjpy',
    baseCurrency: 'NZD',
    quoteCurrency: 'JPY',
    symbol: 'NZD/JPY',
    active: true,
    standardPipDigits: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'pair-cadjpy',
    baseCurrency: 'CAD',
    quoteCurrency: 'JPY',
    symbol: 'CAD/JPY',
    active: true,
    standardPipDigits: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  }
];

export function getPairBySymbol(symbol: string): CurrencyPairItem | undefined {
  const clean = symbol.replace(/[-_]/g, '/').toUpperCase();
  return INITIAL_PAIRS.find((p) => p.symbol === clean);
}
