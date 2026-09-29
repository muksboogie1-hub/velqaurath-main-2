import React from 'react';
import {
  Activity,
  Coins,
  ArrowLeftRight,
  Clock,
  Compass,
  ShieldCheck
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'currencies'
  | 'pairs'
  | 'opportunities'
  | 'contradictions'
  | 'central-banks'
  | 'sessions'
  | 'calendar'
  | 'sources';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

/**
 * Mobile-first navigation. Touch targets are sized for thumbs and the active
 * destination is indicated by an accent, not by an uppercase technical label.
 */
export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Pulse', icon: Activity },
    { id: 'currencies' as NavTab, label: 'Currencies', icon: Coins },
    { id: 'pairs' as NavTab, label: 'Pairs', icon: ArrowLeftRight },
    { id: 'opportunities' as NavTab, label: 'Watch', icon: Compass },
    { id: 'sessions' as NavTab, label: 'Sessions', icon: Clock },
    { id: 'sources' as NavTab, label: 'Evidence', icon: ShieldCheck }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-velqo-ink/92 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-xl transition-colors active:scale-95 ${
                isActive ? 'text-teal-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[0.6rem] font-medium tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-teal-300 to-cyan-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
