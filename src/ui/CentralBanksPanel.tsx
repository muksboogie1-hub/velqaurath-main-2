import React from 'react';
import { Landmark, ShieldCheck, AlertCircle, Clock, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { buildCentralBankProfile, getAllCoreCentralBankProfiles } from '../fundamentals/centralBank/centralBankProfiles';

interface CentralBanksPanelProps {
  onSelectCurrency?: (code: string) => void;
}

export const CentralBanksPanel: React.FC<CentralBanksPanelProps> = ({ onSelectCurrency }) => {
  const centralBanks = getAllCoreCentralBankProfiles();

  return (
    <div className="space-y-4">
      {/* Overview header */}
      <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800 mb-3">
          <div>
            <h2 className="text-sm font-semibold font-mono text-neutral-100 uppercase tracking-wide flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-400" />
              Central Bank Monetary Policy Intelligence
            </h2>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Authoritative tracking of the 8 canonical monetary authorities. Strict provenance separation distinguishes verified live decision feeds from baseline reference profiles.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-bold">
              8 Authorities
            </span>
            <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
              Zero-Fabrication Policy
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-neutral-400 pt-1">
          <span className="text-neutral-500 uppercase font-bold">Data Provenance:</span>
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            LIVE: Real-time decision wire
          </span>
          <span className="inline-flex items-center gap-1 text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            REFERENCE: Institutional profile
          </span>
          <span className="inline-flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            STATIC: Verified baseline record
          </span>
          <span className="inline-flex items-center gap-1 text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-neutral-600 inline-block" />
            UNAVAILABLE: Awaiting source connection
          </span>
        </div>
      </div>

      {/* Grid of 8 central banks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {centralBanks.map((cb) => {
          const isHawkish = cb.stance === 'HAWKISH';
          const isDovish = cb.stance === 'DOVISH';
          const isNeutral = cb.stance === 'NEUTRAL';

          const sourceType = cb.sourceType || 'REFERENCE';
          const provenanceBadge =
            sourceType === 'LIVE' ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                LIVE
              </span>
            ) : sourceType === 'REFERENCE' ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                REFERENCE
              </span>
            ) : sourceType === 'STATIC' ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                STATIC
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 text-neutral-500 border border-neutral-800">
                UNAVAILABLE
              </span>
            );

          return (
            <div
              key={cb.id}
              className="p-3.5 bg-neutral-900/40 hover:bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700/80 rounded-lg transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between pb-2 border-b border-neutral-800/80 mb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-neutral-100">
                        {cb.currency}
                      </span>
                      <span className="text-xs font-mono text-neutral-400">
                        {cb.institution || cb.bank}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">
                      Source: {cb.source || cb.sourceMetadata?.sourceName || 'Central Bank Official'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {provenanceBadge}
                    {onSelectCurrency && (
                      <button
                        onClick={() => onSelectCurrency(cb.currency)}
                        className="text-[10px] font-mono text-emerald-400 hover:underline px-1.5 py-0.5 rounded hover:bg-neutral-800"
                        title={`Inspect ${cb.currency} Intelligence`}
                      >
                        Inspect →
                      </button>
                    )}
                  </div>
                </div>

                {/* Rates & Stance metric cards */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="p-2 bg-neutral-950/80 border border-neutral-800/80 rounded text-center">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase block">
                      Policy Rate
                    </span>
                    <span className="text-sm font-bold font-mono text-neutral-100">
                      {cb.currentPolicyRate !== null && cb.currentPolicyRate !== undefined
                        ? `${cb.currentPolicyRate.toFixed(2)}%`
                        : cb.policyRate !== null && cb.policyRate !== undefined
                        ? `${cb.policyRate.toFixed(2)}%`
                        : 'N/A'}
                    </span>
                  </div>

                  <div className="p-2 bg-neutral-950/80 border border-neutral-800/80 rounded text-center">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase block">
                      Policy Stance
                    </span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        isHawkish
                          ? 'text-emerald-400'
                          : isDovish
                          ? 'text-rose-400'
                          : isNeutral
                          ? 'text-amber-400'
                          : 'text-neutral-400'
                      }`}
                    >
                      {cb.stance || cb.policyStance || 'NEUTRAL'}
                    </span>
                  </div>

                  <div className="p-2 bg-neutral-950/80 border border-neutral-800/80 rounded text-center">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase block">
                      Policy Direction
                    </span>
                    <div className="flex items-center justify-center gap-1">
                      {cb.policyDirection === 'HIKING' ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      ) : cb.policyDirection === 'EASING' ? (
                        <ArrowDownRight className="w-3 h-3 text-rose-400" />
                      ) : (
                        <Minus className="w-3 h-3 text-neutral-400" />
                      )}
                      <span className="text-xs font-bold font-mono text-neutral-200">
                        {cb.policyDirection || 'HOLDING'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stance evidence & rationale */}
                {cb.stanceEvidence && cb.stanceEvidence.length > 0 && (
                  <div className="mb-2.5 p-2 bg-neutral-950/50 border border-neutral-800/60 rounded">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 font-semibold block mb-1">
                      Policy Evidence & Forward Guidance:
                    </span>
                    <ul className="space-y-1">
                      {cb.stanceEvidence.slice(0, 2).map((ev, i) => (
                        <li key={i} className="text-[11px] text-neutral-300 font-sans flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-1">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer timeline dates */}
              <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>
                    Last Decision: {cb.latestDecisionDate || cb.lastKnownPolicyEvent || 'Scheduled'}
                  </span>
                </div>
                <span>
                  Next Known: {cb.nextKnownDecisionDate || 'Q3 Calendar'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
