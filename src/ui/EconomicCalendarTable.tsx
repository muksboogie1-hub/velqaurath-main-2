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
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
            Economic Calendar
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Scheduled releases · Primary central bank decisions
          </p>
        </div>
        <span className="text-[11px] font-mono text-neutral-500">
          {events.length} Events Tracked
        </span>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="border-b border-neutral-800 text-[11px] text-neutral-500 uppercase">
              <th className="py-2 px-2 font-medium">Time (UTC)</th>
              <th className="py-2 px-2 font-medium">Curr</th>
              <th className="py-2 px-2 font-medium font-sans">Event</th>
              <th className="py-2 px-2 font-medium">Imp</th>
              <th className="py-2 px-2 font-medium text-right">Prev</th>
              <th className="py-2 px-2 font-medium text-right">Forecast</th>
              <th className="py-2 px-2 font-medium text-right">Actual</th>
              <th className="py-2 px-2 font-medium text-right">Surprise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
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
                <tr key={`${e.id || 'evt'}-${idx}`} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-2.5 px-2 text-neutral-400 whitespace-nowrap">
                    {dateStr} {timeStr}
                  </td>
                  <td className="py-2.5 px-2">
                    <button
                      onClick={() => onSelectCurrency?.(e.currency)}
                      className="font-bold text-neutral-200 hover:text-emerald-400 transition-colors"
                    >
                      {e.currency}
                    </button>
                  </td>
                  <td className="py-2.5 px-2 font-sans font-medium text-neutral-200 min-w-[200px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{e.name}</span>
                      {e.category && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/60">
                          {e.category}
                        </span>
                      )}
                    </div>
                    {e.source && (
                      <span className="block text-[10px] text-neutral-500 font-mono mt-0.5">
                        Source: {e.source}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`text-[10px] font-bold ${
                        e.importance === 'HIGH'
                          ? 'text-rose-400'
                          : e.importance === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-neutral-500'
                      }`}
                    >
                      {e.importance}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right text-neutral-400 tabular-nums">
                    {e.previous === null ? '—' : `${e.previous}${e.unit}`}
                  </td>
                  <td className="py-2.5 px-2 text-right text-neutral-300 tabular-nums">
                    {e.forecast === null ? '—' : `${e.forecast}${e.unit}`}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {e.actual === null ? (
                      <span className="text-neutral-500 italic text-[10px]">Pending</span>
                    ) : (
                      <span className="font-bold text-emerald-400">
                        {e.actual}{e.unit}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {hasSurprise && surpriseVal !== null ? (
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          surpriseVal > 0
                            ? 'text-emerald-400'
                            : surpriseVal < 0
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {surpriseVal > 0 ? '+' : ''}{surpriseVal}{e.unit}
                      </span>
                    ) : e.actual !== null ? (
                      <span className="text-neutral-500 text-[10px] italic">No forecast</span>
                    ) : (
                      <span className="text-neutral-600 text-[10px]">Awaiting</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
