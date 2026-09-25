import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { VelqoarathApiService } from './src/api/service.js';
import { marketDataService } from './src/marketData/service/marketDataService.js';
import { refreshScheduler } from './src/services/refreshScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process-level safety: prevent external network drops or unhandled rejections from terminating the server
process.on('uncaughtException', (err) => {
  console.error('[VELQOARATH] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[VELQOARATH] Unhandled promise rejection:', reason);
});

function resolvePort(): number {
  // 1. Inspect CLI arguments for explicit --port <val> or --port=<val> (e.g., from AI Studio dev runner)
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--port' && process.argv[i + 1]) {
      const p = Number(process.argv[i + 1]);
      if (!isNaN(p) && p > 0) return p;
    }
    if (process.argv[i]?.startsWith('--port=')) {
      const p = Number(process.argv[i].split('=')[1]);
      if (!isNaN(p) && p > 0) return p;
    }
  }

  // 2. DEFAULT_APP_PORT set by AI Studio container control plane
  if (process.env.DEFAULT_APP_PORT) {
    const p = Number(process.env.DEFAULT_APP_PORT);
    if (!isNaN(p) && p > 0) return p;
  }

  // 3. Environment PORT (guard against Cloud Run PORT=8080 which is reserved by Nginx reverse proxy)
  if (process.env.PORT && process.env.PORT !== '8080') {
    const p = Number(process.env.PORT);
    if (!isNaN(p) && p > 0) return p;
  }

  // 4. Default AI Studio application dev port
  return 3000;
}

const app = express();
const PORT = resolvePort();

app.use(express.json());

// ----------------------------------------------------
// CURRENCIES & PAIRS
// ----------------------------------------------------
app.get('/api/currencies', (_req, res) => {
  res.json(VelqoarathApiService.getCurrencies());
});

app.get('/api/currencies/:code', (req, res) => {
  const item = VelqoarathApiService.getCurrencyByCode(req.params.code);
  if (!item) return res.status(404).json({ error: 'Currency not found' });
  res.json(item);
});

app.get('/api/currencies/:code/state', (req, res) => {
  const state = VelqoarathApiService.getCurrencyState(req.params.code);
  if (!state) return res.status(404).json({ error: 'Currency not found' });
  res.json(state);
});

app.get('/api/pairs', (_req, res) => {
  res.json(VelqoarathApiService.getPairs());
});

app.get('/api/pairs/intelligence', (_req, res) => {
  res.json(VelqoarathApiService.getAllPairIntelligences());
});

app.get('/api/pairs-intelligence', (_req, res) => {
  res.json(VelqoarathApiService.getAllPairIntelligences());
});

app.get('/api/pairs/:symbol', (req, res) => {
  const pair = VelqoarathApiService.getPairBySymbol(req.params.symbol);
  if (!pair) return res.status(404).json({ error: 'Pair not found' });
  res.json(pair);
});

app.get('/api/pairs/:symbol/intelligence', (req, res) => {
  const intelligence = VelqoarathApiService.getPairIntelligence(req.params.symbol);
  if (!intelligence) return res.status(404).json({ error: 'Pair intelligence not available' });
  res.json(intelligence);
});

// ----------------------------------------------------
// OPPORTUNITY & CONFLUENCE INTELLIGENCE
// ----------------------------------------------------
app.get('/api/opportunities', (_req, res) => {
  res.json(VelqoarathApiService.getOpportunities());
});

app.get('/api/opportunities/structured', (_req, res) => {
  res.json(VelqoarathApiService.getStructuredOpportunities());
});

app.get('/api/opportunities/:symbol', (req, res) => {
  const item = VelqoarathApiService.getOpportunityBySymbol(req.params.symbol);
  if (!item) return res.status(404).json({ error: 'Opportunity not found' });
  res.json(item);
});

app.get('/api/catalysts', (req, res) => {
  const currency = typeof req.query.currency === 'string' ? req.query.currency : undefined;
  res.json(VelqoarathApiService.getCatalystIntelligence(currency));
});

// ----------------------------------------------------
// PHASE B: FUNDAMENTALS API
// ----------------------------------------------------
app.get('/api/fundamentals/status', (_req, res) => {
  res.json(VelqoarathApiService.getFundamentalsStatus());
});

app.get('/api/fundamentals/currencies', (_req, res) => {
  res.json(VelqoarathApiService.getFundamentalCurrencies());
});

app.get('/api/fundamentals/currency/:currency', (req, res) => {
  const result = VelqoarathApiService.getFundamentalCurrency(req.params.currency);
  if (!result) return res.status(404).json({ error: `Fundamental data not found for ${req.params.currency}` });
  res.json(result);
});

app.get('/api/fundamentals/central-banks', (_req, res) => {
  res.json(VelqoarathApiService.getCentralBanks());
});

app.get('/api/fundamentals/expectations', (_req, res) => {
  res.json(VelqoarathApiService.getExpectations());
});

// ----------------------------------------------------
// MACRO DATA & CENTRAL BANKS
// ----------------------------------------------------
app.get('/api/economic-indicators', (_req, res) => {
  res.json(VelqoarathApiService.getEconomicIndicators());
});

app.get('/api/economic-observations', (_req, res) => {
  res.json(VelqoarathApiService.getEconomicObservations());
});

app.get('/api/central-banks', (_req, res) => {
  res.json(VelqoarathApiService.getCentralBanks());
});

app.get('/api/economic-events', (_req, res) => {
  res.json(VelqoarathApiService.getEconomicEvents());
});

// ----------------------------------------------------
// SESSIONS
// ----------------------------------------------------
app.get('/api/sessions', (_req, res) => {
  res.json(VelqoarathApiService.getSessions());
});

app.get('/api/sessions/current', (_req, res) => {
  res.json(VelqoarathApiService.getCurrentSessions());
});

app.get('/api/sessions/upcoming', (_req, res) => {
  res.json(VelqoarathApiService.getUpcomingSessions());
});

app.get('/api/session-intelligence/:symbol', (req, res) => {
  const result = VelqoarathApiService.getSessionIntelligence(req.params.symbol);
  if (!result) return res.status(404).json({ error: 'Session intelligence not found' });
  res.json(result);
});

// ----------------------------------------------------
// DASHBOARD
// ----------------------------------------------------
app.get('/api/dashboard', (_req, res) => {
  res.json(VelqoarathApiService.getDashboard());
});

// ----------------------------------------------------
// MARKET DATA & PROVIDERS (BIQUOTE / TWELVE DATA)
// ----------------------------------------------------
app.get('/api/market-data/status', (_req, res) => {
  res.json(VelqoarathApiService.getMarketDataStatus());
});

app.get('/api/market-data/quotes', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const quotes = await VelqoarathApiService.getMarketQuotes(force);
    res.json(quotes);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve market quotes', details: err?.message });
  }
});

app.get('/api/market-data/strength', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const strengths = await VelqoarathApiService.getMarketStrengths(force);
    res.json(strengths);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute market strengths', details: err?.message });
  }
});

app.get('/api/market-data/coverage', (_req, res) => {
  res.json(VelqoarathApiService.getMarketCoverage());
});

app.post('/api/market-data/sync', async (req, res) => {
  try {
    const force = req.body?.force === true;
    const result = await VelqoarathApiService.syncMarketData(force);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to sync market data', details: err?.message });
  }
});

app.post('/api/fundamentals/sync', async (req, res) => {
  try {
    const force = req.body?.force === true;
    const result = await VelqoarathApiService.syncFundamentals(force);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to sync fundamentals', details: err?.message });
  }
});

app.post('/api/fundamentals/mode', async (req, res) => {
  try {
    const mode = req.body?.mode === 'BENCHMARK' ? 'BENCHMARK' : 'LIVE';
    const result = await VelqoarathApiService.setFundamentalMode(mode);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to set fundamental mode', details: err?.message });
  }
});

app.get('/api/scheduler/status', (_req, res) => {
  res.json(VelqoarathApiService.getSchedulerStatus());
});

// ----------------------------------------------------
// CONTROLS & THRESHOLDS
// ----------------------------------------------------
app.post('/api/data-feed/toggle', (req, res) => {
  const connected = req.body?.connected;
  res.json(VelqoarathApiService.toggleDataFeed(connected));
});

app.post('/api/thresholds', (req, res) => {
  const { strongThreshold, weakThreshold } = req.body;
  if (typeof strongThreshold !== 'number' || typeof weakThreshold !== 'number') {
    return res.status(400).json({ error: 'Invalid threshold values' });
  }
  res.json(VelqoarathApiService.updateThresholds(strongThreshold, weakThreshold));
});

// ----------------------------------------------------
// SERVER BOOTSTRAP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VELQOARATH] Market Intelligence Server listening on port ${PORT}`);
    // Start unified automatic background refresh scheduler
    refreshScheduler.start().catch((err) => {
      console.warn('[VELQOARATH] RefreshScheduler startup warning:', err?.message || err);
    });
  });

  server.on('error', (err) => {
    console.error('[VELQOARATH] Server listen error:', err);
  });
}

startServer();
