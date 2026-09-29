import React from 'react';
import { Clock } from 'lucide-react';
import { MarketSession, EconomicEvent } from '../types';
import { calculateSessionStatus, PAIR_SESSION_RELEVANCE } from '../engines/session/sessionEngine';

interface SessionsViewProps {
  sessions: MarketSession[];
  calendarEvents: EconomicEvent[];
  onSelectPair?: (symbol: string) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  sessions,
  onSelectPair
}) => {
  const now = new Date();
  const sessionStatuses = sessions.map((s) => calculateSessionStatus(s, now));
  const relevanceList = Object.values(PAIR_SESSION_RELEVANCE);

  return (
    <section className="space-y-4 text-neutral-200">
      {/* Session Centers */}
      <div className="velqo-card px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="velqo-eyebrow mb-1.5">Sessions</p>
            <h2 className="velqo-display flex items-center gap-2 text-lg text-white">
              <Clock className="h-4 w-4 text-sky-300" /> Global financial centers
            </h2>
            <p className="mt-1 text-[0.72rem] text-slate-500">
              Live local time with daylight-saving detection
            </p>
          </div>
          <div className="text-[0.75rem] text-slate-500">
            UTC <span className="ml-1 font-semibold text-slate-200 tnum">{now.toISOString().slice(11, 19)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {sessionStatuses.map((st) => {
            const sess = st.session;
            return (
              <div
                key={sess.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3.5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">{sess.name}</span>
                  {st.isOpen ? (
                    <span className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-teal-300">
                      <span className="velqo-breathe h-1.5 w-1.5 rounded-full bg-teal-300" /> Open
                    </span>
                  ) : (
                    <span className="text-[0.65rem] font-medium text-slate-500">Closed</span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Local time:</span>
                    <span className="font-semibold text-slate-200 tnum">{st.localTimeFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">UTC offset:</span>
                    <span className="text-slate-300 tnum">
                      {st.utcOffsetHours >= 0 ? `+${st.utcOffsetHours}` : st.utcOffsetHours}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">DST Status:</span>
                    <span className={st.isDstActive ? 'text-amber-400' : 'text-neutral-500'}>
                      {st.isDstActive ? 'DST Active' : 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-neutral-800 text-[11px]">
                    <span className="text-neutral-500">Hours:</span>
                    <span className="text-neutral-400">
                      {String(sess.openHourLocal).padStart(2, '0')}:{String(sess.openMinuteLocal).padStart(2, '0')} - {String(sess.closeHourLocal).padStart(2, '0')}:{String(sess.closeMinuteLocal).padStart(2, '0')} Local
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Relevance Architecture */}
      <div className="velqo-card px-4 py-4 sm:px-6 sm:py-5">
        <div className="border-b border-white/[0.06] pb-3">
          <p className="velqo-eyebrow mb-1.5">Liquidity map</p>
          <h3 className="velqo-display text-lg text-white">Pair &amp; session relevance</h3>
          <p className="mt-1 text-[0.72rem] text-slate-500">
            Institutional liquidity windows and macro release alignment
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {relevanceList.map((rel) => (
            <div
              key={rel.pairSymbol}
              onClick={() => onSelectPair?.(rel.pairSymbol)}
              className="velqo-card velqo-card-interactive cursor-pointer px-3.5 py-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="velqo-display text-base text-white">{rel.pairSymbol}</span>
                <span className="text-[0.75rem] font-semibold text-sky-300">{rel.primarySession}</span>
              </div>
              <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-2">
                {rel.structuralRationale}
              </p>
              <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>Peak Liquidity:</span>
                <span className="text-neutral-300">{rel.peakLiquidityWindowUtc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
