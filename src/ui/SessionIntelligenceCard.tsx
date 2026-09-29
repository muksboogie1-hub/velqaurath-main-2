import React from 'react';
import { Clock } from 'lucide-react';
import { MarketSession, EconomicEvent } from '../types';
import { calculateSessionStatus } from '../engines/session/sessionEngine';

interface SessionIntelligenceCardProps {
  sessions: MarketSession[];
  activeOverlaps: string[];
  calendarEvents: EconomicEvent[];
  onSelectPair?: (symbol: string) => void;
}

export const SessionIntelligenceCard: React.FC<SessionIntelligenceCardProps> = ({
  sessions,
  activeOverlaps,
  calendarEvents
}) => {
  const now = new Date();
  const sessionStatuses = sessions.map((s) => calculateSessionStatus(s, now));
  const activeFinancialCenters = sessionStatuses.filter((s) => s.isOpen);
  const nextCatalyst = calendarEvents.find((e) => new Date(e.scheduledTime).getTime() > now.getTime());
  const currentTimeUtc = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';

  return (
    <section className="velqo-card px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <p className="velqo-eyebrow mb-1.5">Liquidity</p>
          <h2 className="velqo-display flex items-center gap-2 text-lg text-white sm:text-xl">
            <Clock className="h-4 w-4 text-sky-300" /> Session status
          </h2>
          <p className="mt-1 text-[0.72rem] text-slate-500">
            Daylight-saving aware across London, New York, Tokyo and Sydney
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-slate-200 tnum">{currentTimeUtc}</span>
          <span className="mt-0.5 block text-[0.68rem] text-slate-500">UTC</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Active Centres */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
          <span className="velqo-eyebrow mb-2 block !text-teal-300/80">Open centres</span>
          {activeFinancialCenters.length === 0 ? (
            <p className="text-[0.75rem] text-slate-500">Weekend or inter-session transition.</p>
          ) : (
            <div className="space-y-2">
              {activeFinancialCenters.map((s) => (
                <div key={s.session.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="velqo-breathe h-1.5 w-1.5 rounded-full bg-teal-300" />
                    <span className="text-[0.75rem] font-medium text-slate-200">{s.session.name}</span>
                  </div>
                  <span className="text-[0.68rem] text-slate-500 tnum">
                    {s.localTimeFormatted} ({s.utcOffsetHours >= 0 ? `+${s.utcOffsetHours}` : s.utcOffsetHours}h)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session Overlaps */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
          <span className="velqo-eyebrow mb-2 block !text-sky-300/80">Overlaps</span>
          {activeOverlaps.length === 0 ? (
            <p className="text-[0.75rem] text-slate-500">No overlapping session windows active currently.</p>
          ) : (
            <div className="space-y-1.5">
              {activeOverlaps.map((overlap) => (
                <div
                  key={overlap}
                  className="rounded-xl border border-sky-400/20 bg-sky-400/[0.07] px-2.5 py-1.5 text-[0.72rem] font-medium text-sky-200"
                >
                  {overlap}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Catalyst */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
          <span className="velqo-eyebrow mb-2 block !text-amber-200/90">Next catalyst</span>
          {nextCatalyst ? (
            <div>
              <span className="text-[0.75rem] font-semibold text-slate-100">
                {nextCatalyst.currency} {nextCatalyst.name}
              </span>
              <span className="mt-1 block text-[0.7rem] text-amber-200/90 tnum">
                {new Date(nextCatalyst.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
              </span>
            </div>
          ) : (
            <p className="text-[0.75rem] text-slate-500">No immediate high-impact release scheduled.</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
        <span className="velqo-eyebrow">Structural focus</span>
        <div className="flex flex-wrap gap-1.5">
          <span className="velqo-chip">Tokyo · USD/JPY · AUD/JPY</span>
          <span className="velqo-chip">London · EUR/GBP · GBP/USD</span>
          <span className="velqo-chip">New York · USD/CAD · EUR/USD</span>
        </div>
      </div>
    </section>
  );
};
