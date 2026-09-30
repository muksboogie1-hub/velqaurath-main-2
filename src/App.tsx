import React, { useState, useEffect } from 'react';
import {
  Activity,
  Coins,
  ArrowLeftRight,
  Clock,
  Calendar,
  Database,
  Compass,
  AlertTriangle,
  Landmark,
  ShieldCheck
} from 'lucide-react';
import { globalStore } from './data/store';
import { CurrencyFundamentalIntelligence, DashboardPayload, PairIntelligence, StrengthThresholds } from './types';
import type { MarketFocus } from './types/focus';
import { Header } from './ui/Header';
import { BottomNav, NavTab } from './ui/BottomNav';
import { MarketPulseHero } from './ui/MarketPulseHero';
import { MarketContext } from './ui/MarketContext';
import { CurrencyLandscape } from './ui/CurrencyLandscape';
import { PairInFocusCard } from './ui/PairInFocusCard';
import { MarketFocusView } from './ui/focus/MarketFocusView';
import { SessionIntelligenceCard } from './ui/SessionIntelligenceCard';
import { EconomicCalendarTable } from './ui/EconomicCalendarTable';
import { EvidenceStrip } from './ui/EvidenceStrip';
import { CurrencyDetailModal } from './ui/CurrencyDetailModal';
import { PairDetailModal } from './ui/PairDetailModal';
import { ThresholdsModal } from './ui/ThresholdsModal';
import { DataSourcesModal } from './ui/DataSourcesModal';
import { PairsList } from './ui/PairsList';
import { SessionsView } from './ui/SessionsView';
import { CentralBanksPanel } from './ui/CentralBanksPanel';
import { OpportunitiesView } from './ui/OpportunitiesView';
import { ContradictionsView } from './ui/ContradictionsView';
import { CurrencyIntelligencePanel } from './ui/CurrencyIntelligencePanel';

export function App() {
  const [dashboard, setDashboard] = useState<DashboardPayload>(() => globalStore.getDashboard());
  const [pairIntelligences, setPairIntelligences] = useState<PairIntelligence[]>(() =>
    globalStore.getAllPairIntelligences()
  );
  const [currencyIntelligences, setCurrencyIntelligences] = useState<CurrencyFundamentalIntelligence[]>([]);
  const [marketFocus, setMarketFocus] = useState<MarketFocus | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isThresholdsOpen, setIsThresholdsOpen] = useState(false);

  useEffect(() => {
    /*
     * Lifecycle guard. Every async path checks this before touching state so
     * that an unmount cannot receive a late update, and both timers are cleared
     * on teardown so no interval survives the component.
     */
    let cancelled = false;
    let lightPollInFlight = false;
    let pairPollInFlight = false;

    const updateLocalState = () => {
      if (cancelled) return;
      setDashboard(globalStore.getDashboard());
      setPairIntelligences(globalStore.getAllPairIntelligences());
    };

    /*
     * MARKET FOCUS is fetched and applied on its own.
     *
     * It is a small, self-sufficient payload that already carries the research
     * lead and its full explanation, so it must never sit behind another
     * response. It is resolved and committed independently of the dashboard and
     * of pair intelligence, and a failed refresh keeps the last known valid
     * value rather than clearing it.
     */
    const applyMarketFocus = async () => {
      if (cancelled) return;
      try {
        const res = await fetch('/api/market-focus');
        if (!res.ok) return;
        const data: MarketFocus = await res.json();
        if (cancelled || !data) return;
        setMarketFocus(data);
      } catch {
        // Transient network or parse failure: the previously rendered
        // market focus stays exactly as it is.
      }
    };

    const applyDashboard = async () => {
      if (cancelled) return;
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) return;
        const dashData: DashboardPayload = await res.json();
        if (cancelled) return;

        if (dashData.marketProviderStatus && dashData.allCurrencies) {
            const strengthsMap = new Map();
            dashData.allCurrencies.forEach((c) => {
              const breakdown = c.relativeStrengthBreakdown;
              strengthsMap.set(c.currency.code, {
                currency: c.currency.code,
                marketStrength: c.marketStrength,
                classification: c.marketState,
                dailyMovementPercent: breakdown?.dailyMovementPercent ?? null,
                basketRelativeMovementPercent: breakdown?.basketRelativeMovementPercent ?? null,
                rawRelativeReturn: breakdown?.basketRelativeMovementPercent ?? null,
                avgReturn: breakdown?.dailyMovementPercent ?? null,
                momentum: breakdown?.momentum ?? null,
                coverage: breakdown?.coverage ?? {
                  available: 0,
                  required: 0,
                  percent: 0
                },
                contributors: (breakdown?.contributors || []).map((contrib) => ({
                  pairSymbol: contrib.pairSymbol,
                  pairReturnPercent: contrib.pairReturnPercent,
                  role: contrib.role as any,
                  signedContribution: contrib.signedContribution,
                  timestamp: Date.now()
                })),
                explanation: breakdown?.explanation ?? '',
                calculatedAt: dashData.lastUpdated,
                providerStatus: dashData.marketProviderStatus?.health || 'CONNECTED',
                source: breakdown?.source || dashData.marketProviderStatus?.activeProvider || 'Biquote'
              });
            });
            globalStore.setMarketData(
              dashData.marketQuotes || [],
              strengthsMap,
              dashData.marketProviderStatus
            );
          }

          if (dashData.fundamentalProviderStatus) {
            if (
              dashData.economicCalendar &&
              (dashData.fundamentalProviderStatus.health === 'CONNECTED' ||
                dashData.fundamentalProviderStatus.health === 'AVAILABLE')
            ) {
              globalStore.setFundamentalData(
                [],
                dashData.economicCalendar,
                dashData.fundamentalProviderStatus,
                dashData.fundamentalDatasetMode || 'LIVE'
              );
            } else {
              globalStore.setFundamentalStatus(dashData.fundamentalProviderStatus);
            }
          }

          // Authoritative state update from server payload
          setDashboard(dashData);
          setCurrencyIntelligences(dashData.currencyIntelligence || []);
      } catch {
        // Fallback to the local store only on network failure
        updateLocalState();
      }
    };

    /*
     * Pair intelligence is a large payload (megabytes) and is not required to
     * render the Market Focus experience. It is fetched on its own schedule so
     * that it can never gate the narrative, and a slow or failing transfer
     * never blocks anything else.
     */
    const applyPairIntelligences = async () => {
      if (cancelled) return;
      try {
        const res = await fetch('/api/pairs/intelligence');
        if (!res.ok) return;
        const pairsData: PairIntelligence[] = await res.json();
        if (cancelled) return;
        setPairIntelligences(pairsData);
      } catch {
        // Keep the previously loaded pair intelligence.
      }
    };

    /*
     * The fast poll carries only the small, narrative-bearing payloads. Each
     * cycle is guarded so a slow response cannot stack with the next tick.
     */
    const pollLight = async () => {
      if (lightPollInFlight || cancelled) return;
      lightPollInFlight = true;
      try {
        await Promise.all([applyDashboard(), applyMarketFocus()]);
      } finally {
        lightPollInFlight = false;
      }
    };

    const pollPairIntelligences = async () => {
      if (pairPollInFlight || cancelled) return;
      pairPollInFlight = true;
      try {
        await applyPairIntelligences();
      } finally {
        pairPollInFlight = false;
      }
    };

    const unsubscribe = globalStore.subscribe(updateLocalState);

    // Immediate first load, then each stream settles on its own cadence.
    void pollPairIntelligences();
    void pollLight();

    const lightInterval = setInterval(pollLight, 3000);
    const pairInterval = setInterval(pollPairIntelligences, 60000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(lightInterval);
      clearInterval(pairInterval);
    };
  }, []);

  const handleToggleFeed = () => {
    const nextState = globalStore.toggleDataFeed();
    fetch('/api/data-feed/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connected: nextState })
    }).catch(() => {});
  };

  const handleSaveThresholds = (strong: number, weak: number) => {
    globalStore.updateThresholds(strong, weak);
    fetch('/api/thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strongThreshold: strong, weakThreshold: weak })
    }).catch(() => {});
  };

  const currencyDetail = selectedCurrency
    ? globalStore.getCurrencyState(selectedCurrency)
    : null;

  const pairDetail = selectedPair
    ? globalStore.getPairIntelligence(selectedPair)
    : null;

  const currentThresholds: StrengthThresholds = globalStore.getState().thresholds;

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Pulse', icon: Activity },
    { id: 'opportunities' as NavTab, label: 'Watch', icon: Compass },
    { id: 'currencies' as NavTab, label: 'Currencies', icon: Coins },
    { id: 'central-banks' as NavTab, label: 'Central banks', icon: Landmark },
    { id: 'contradictions' as NavTab, label: 'Contradictions', icon: AlertTriangle },
    { id: 'pairs' as NavTab, label: 'Pairs', icon: ArrowLeftRight },
    { id: 'sessions' as NavTab, label: 'Sessions', icon: Clock },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: Calendar },
    { id: 'sources' as NavTab, label: 'Evidence', icon: ShieldCheck }
  ];

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <Header
        dataStatus={dashboard.dataStatus}
        marketProviderStatus={dashboard.marketProviderStatus}
        fundamentalProviderStatus={dashboard.fundamentalProviderStatus}
        fundamentalDatasetMode={dashboard.fundamentalDatasetMode}
        currencyIntelligence={currencyIntelligences}
        onOpenSources={() => setIsSourcesOpen(true)}
        onOpenThresholds={() => setIsThresholdsOpen(true)}
      />

      {/* Desktop navigation */}
      <div className="sticky top-[3.9rem] z-20 hidden border-b border-white/[0.05] bg-velqo-ink/80 backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 sm:px-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`relative flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[0.78rem] font-medium transition-colors ${
                  isActive
                    ? 'text-teal-200'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-teal-300 to-cyan-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 pb-28 pt-4 sm:space-y-5 sm:px-6 sm:pb-16 md:pt-6">
        {/* Evidence stays available on every view, quietly. */}
        <EvidenceStrip
          dataStatus={dashboard.dataStatus}
          statusMessage={dashboard.dataStatusMessage}
          dataSources={dashboard.dataSources}
          marketProviderStatus={dashboard.marketProviderStatus}
          fundamentalProviderStatus={dashboard.fundamentalProviderStatus}
          fundamentalDatasetMode={dashboard.fundamentalDatasetMode}
          currencyIntelligence={currencyIntelligences}
          onOpenSources={() => setIsSourcesOpen(true)}
        />

        {currentTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-5">
            <MarketPulseHero
              allCurrencies={dashboard.allCurrencies}
              strongCurrencies={dashboard.strongCurrencies}
              neutralCurrencies={dashboard.neutralCurrencies}
              weakCurrencies={dashboard.weakCurrencies}
              topPair={marketFocus?.selected ?? null}
              basket={marketFocus?.basket ?? null}
              marketProviderStatus={dashboard.marketProviderStatus}
              fundamentalProviderStatus={dashboard.fundamentalProviderStatus}
              fundamentalDatasetMode={dashboard.fundamentalDatasetMode}
              currencyIntelligence={currencyIntelligences}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
              onSelectPair={(symbol) => setSelectedPair(symbol)}
            />

            <PairInFocusCard
              focus={marketFocus}
              onSelectPair={(symbol) => setSelectedPair(symbol)}
            />

            <MarketFocusView
              focus={marketFocus}
              onSelectPair={(symbol) => setSelectedPair(symbol)}
            />

            <CurrencyLandscape
              currencies={dashboard.allCurrencies}
              intelligences={currencyIntelligences}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
            />

            <CurrencyIntelligencePanel intelligences={currencyIntelligences} />

            <SessionIntelligenceCard
              sessions={dashboard.sessions.activeSessions.concat(dashboard.sessions.upcomingSessions)}
              activeOverlaps={dashboard.sessions.activeOverlaps}
              calendarEvents={dashboard.economicCalendar}
              onSelectPair={(symbol) => setSelectedPair(symbol)}
            />

            <EconomicCalendarTable
              events={dashboard.economicCalendar}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
            />
          </div>
        )}

        {currentTab === 'currencies' && (
          <div className="space-y-4 sm:space-y-5">
            <MarketContext
              allCurrencies={dashboard.allCurrencies}
              strongCurrencies={dashboard.strongCurrencies}
              neutralCurrencies={dashboard.neutralCurrencies}
              weakCurrencies={dashboard.weakCurrencies}
              thresholds={currentThresholds}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
              onOpenThresholds={() => setIsThresholdsOpen(true)}
              marketProviderStatus={dashboard.marketProviderStatus}
            />

            <CurrencyLandscape
              currencies={dashboard.allCurrencies}
              intelligences={currencyIntelligences}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
            />

            <CurrencyIntelligencePanel intelligences={currencyIntelligences} />
          </div>
        )}

        {currentTab === 'opportunities' && (
          <OpportunitiesView
            pairIntelligences={pairIntelligences}
            onSelectPair={(symbol) => setSelectedPair(symbol)}
            onSelectCurrency={(code) => setSelectedCurrency(code)}
          />
        )}

        {currentTab === 'central-banks' && (
          <CentralBanksPanel
            onSelectCurrency={(code) => setSelectedCurrency(code)}
          />
        )}

        {currentTab === 'contradictions' && (
          <ContradictionsView
            pairIntelligences={pairIntelligences}
            onSelectPair={(symbol) => setSelectedPair(symbol)}
            onSelectCurrency={(code) => setSelectedCurrency(code)}
          />
        )}

        {currentTab === 'pairs' && (
          <PairsList
            pairIntelligences={pairIntelligences}
            onSelectPair={(symbol) => setSelectedPair(symbol)}
          />
        )}

        {currentTab === 'sessions' && (
          <SessionsView
            sessions={dashboard.sessions.activeSessions.concat(dashboard.sessions.upcomingSessions)}
            calendarEvents={dashboard.economicCalendar}
            onSelectPair={(symbol) => setSelectedPair(symbol)}
          />
        )}

        {currentTab === 'calendar' && (
          <EconomicCalendarTable
            events={dashboard.economicCalendar}
            onSelectCurrency={(code) => setSelectedCurrency(code)}
          />
        )}

        {currentTab === 'sources' && (
          <div className="velqo-card px-5 py-6 sm:px-6">
            <p className="velqo-eyebrow mb-1.5">Evidence</p>
            <h2 className="velqo-display text-lg text-white">Provenance & source directory</h2>
            <p className="mt-2 max-w-xl text-[0.78rem] leading-relaxed text-slate-400">
              VELQAURATH does not fabricate evidence. Every macro observation, policy record and
              market quote below is traceable to a primary agency or market-data provider, and a
              layer without a verified live record is reported as unavailable rather than inferred.
            </p>
            <button
              onClick={() => setIsSourcesOpen(true)}
              className="mt-4 flex min-h-10 items-center gap-2 rounded-full border border-teal-400/25 bg-teal-400/[0.07] px-4 text-[0.78rem] font-medium text-teal-200 transition-colors hover:border-teal-400/45 hover:bg-teal-400/[0.12]"
            >
              <Database className="h-4 w-4" />
              Open the full provenance inspector
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-white/[0.05] px-4 py-6 text-center">
        <p className="text-[0.72rem] font-medium text-slate-500">VELQAURATH · Global Market Intelligence</p>
        <p className="mt-1 text-[0.7rem] text-slate-600">
          Built by Boogie · Read the market. Understand the why. Not an execution venue.
        </p>
      </footer>

      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'sources') {
            setIsSourcesOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
      />

      <CurrencyDetailModal
        currencyState={currencyDetail}
        events={dashboard.economicCalendar}
        onClose={() => setSelectedCurrency(null)}
        onSelectPair={(pair) => {
          setSelectedCurrency(null);
          setSelectedPair(pair);
        }}
      />

      <PairDetailModal
        intelligence={pairDetail}
        onClose={() => setSelectedPair(null)}
        onSelectCurrency={(curr) => {
          setSelectedPair(null);
          setSelectedCurrency(curr);
        }}
      />

      <ThresholdsModal
        currentThresholds={currentThresholds}
        isOpen={isThresholdsOpen}
        onClose={() => setIsThresholdsOpen(false)}
        onSave={handleSaveThresholds}
      />

      <DataSourcesModal
        dataSources={dashboard.dataSources}
        dataStatus={dashboard.dataStatus}
        marketProviderStatus={dashboard.marketProviderStatus}
        fundamentalProviderStatus={dashboard.fundamentalProviderStatus}
        fundamentalDatasetMode={dashboard.fundamentalDatasetMode}
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
        onToggleConnection={handleToggleFeed}
        onToggleBenchmarkMode={async (enable) => {
          try {
            await fetch('/api/fundamentals/mode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: enable ? 'BENCHMARK' : 'LIVE' })
            });
            const res = await fetch('/api/dashboard');
            if (res.ok) setDashboard(await res.json());
          } catch {
            globalStore.setBenchmarkMode(enable);
          }
        }}
      />
    </div>
  );
}

export default App;
