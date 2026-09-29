import React from 'react';
import { EconomicEvent } from '../types';

interface EconomicCalendarTableProps {
  events: EconomicEvent[];
  onSelectCurrency?: (currency: string) => void;
}

export const EconomicCalendarTable: React.FC<EconomicCalendarTableProps> = ({
  events,
  onSelectCurrency
}) => {
  return (
    <section className="velqo-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-6">
        <div>
          <p className="velqo-eyebrow mb-1.5">Catalyst runway</p>
          <h2 className="velqo-display text-lg text-white sm:text-xl">Economic calendar</h2>
          <p className="mt-1 text-[0.72rem] text-slate-500">
            Scheduled macro releases and central bank decisions
          </p>
        </div>
        <span className="velqo-chip tnum">{events.length} tracked</span>
      </div>

      <div className="px-2 pb-2 pt-1 sm:px-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="velqo-eyebrow px-2 py-2.5 font-medium">Time (UTC)</th>
                <th className="velqo-eyebrow px-2 py-2.5 font-medium">Cur</th>
                <th className="velqo-eyebrow px-2 py-2.5 font-medium">Event</th>
                <th className="velqo-eyebrow px-2 py-2.5 font-medium">Imp</th>
                <th className="velqo-eyebrow px-2 py-2.5 text-right font-medium">Prev</th>
                <th className="velqo-eyebrow px-2 py-2.5 text-right font-medium">Forecast</th>
                <th className="velqo-eyebrow px-2 py-2.5 text-right font-medium">Actual</th>
                <th className="velqo-eyebrow px-2 py-2.5 text-right font-medium">Surprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {events.map((e, idx) => {
              const timeStr = new Date(e.scheduledTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC'
              });
              const dateStr = new Date(e.scheduledTime).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
              });

              const hasSurprise = e.actual !== null && e.forecast !== null;
              const surpriseVal = hasSurprise ? Math.round((e.actual! - e.forecast!) * 100) / 100 : null;

              return (
                <tr
                  key={`${e.id || 'evt'}-${idx}`}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="whitespace-nowrap px-2 py-2.5 text-[0.72rem] text-slate-500 tnum">
                    {dateStr} {timeStr}
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => onSelectCurrency?.(e.currency)}
                      className="text-[0.78rem] font-semibold text-slate-100 transition-colors hover:text-teal-200"
                    >
                      {e.currency}
                    </button>
                  </td>
                  <td className="min-w-[200px] px-2 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[0.78rem] font-medium text-slate-200">{e.name}</span>
                      {e.category && (
                        <span className="velqo-chip !px-1.5 !py-0 !text-[0.58rem]">
                          {e.category.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {e.source && (
                      <span className="mt-0.5 block text-[0.65rem] text-slate-600">{e.source}</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`text-[0.68rem] font-semibold ${
                        e.importance === 'HIGH'
                          ? 'text-rose-300'
                          : e.importance === 'MEDIUM'
                          ? 'text-amber-200'
                          : 'text-slate-500'
                      }`}
                    >
                      {e.importance}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right text-[0.72rem] text-slate-500 tnum">
                    {e.previous === null ? '—' : `${e.previous}${e.unit}`}
                  </td>
                  <td className="px-2 py-2.5 text-right text-[0.72rem] text-slate-300 tnum">
                    {e.forecast === null ? '—' : `${e.forecast}${e.unit}`}
                  </td>
                  <td className="px-2 py-2.5 text-right tnum">
                    {e.actual === null ? (
                      <span className="text-[0.65rem] text-slate-500">Pending</span>
                    ) : (
                      <span className="text-[0.75rem] font-semibold text-teal-300">
                        {e.actual}{e.unit}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {hasSurprise && surpriseVal !== null ? (
                      <span
                        className={`text-[0.72rem] font-semibold tnum ${
                          surpriseVal > 0
                            ? 'text-teal-300'
                            : surpriseVal < 0
                            ? 'text-rose-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {surpriseVal > 0 ? '+' : ''}{surpriseVal}{e.unit}
                      </span>
                    ) : e.actual !== null ? (
                      <span className="text-[0.65rem] text-slate-500">No forecast</span>
                    ) : (
                      <span className="text-[0.65rem] text-slate-600">Awaiting</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  );
};
