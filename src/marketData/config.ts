export const SUPPORTED_MAJOR_CURRENCIES: string[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'NZD'
];

export const DEFAULT_LIQUID_PAIRS: string[] = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'USD/CHF',
  'AUD/USD',
  'NZD/USD',
  'USD/CAD',
  'EUR/GBP',
  'EUR/JPY',
  'GBP/JPY',
  'EUR/CHF',
  'GBP/CHF',
  'AUD/JPY',
  'NZD/JPY',
  'CAD/JPY'
];

export const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
export const HEALTH_CACHE_TTL_MS = 60 * 1000;
export const DEFAULT_FRESHNESS_THRESHOLD_SECONDS = 30;

export const BIQUOTE_API_BASE_URL = 'https://biquote.io';
export const BIQUOTE_WS_HUB_URL = 'wss://biquote.io/hubs/tick';

/**
 * Scale factor for market strength calculation.
 *
 * CRITICAL ARCHITECTURAL CORRECTION:
 * Previously set to 0.25, which compressed real percentage movements by 4x.
 * The system requirement specifies that +0.10 means +0.10% (0.10 percentage points of daily movement).
 * Keeping this at 1.0 preserves true daily percentage points without distortion.
 */
export const MARKET_STRENGTH_SCALE_FACTOR = 1.0;

/**
 * Server-side automatic market refresh interval.
 * Daily snapshot data refreshes every 5 minutes in background.
 */
export const MARKET_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Server-side automatic fundamental refresh interval.
 * Macroeconomic releases refresh every 15 minutes in background.
 */
export const FUNDAMENTAL_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
