import React from 'react';
import { Radar, ShoppingBag, Calendar, MessageSquare, History } from 'lucide-react';

export type ActiveTab = 'radar' | 'compare' | 'calendar' | 'advisor';

interface MobileTabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenHistory: () => void;
  hasComparisonData: boolean;
  historyCount: number;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onTabChange,
  onOpenHistory,
  hasComparisonData,
  historyCount,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 shadow-2xl safe-area-bottom">
      <nav className="grid grid-cols-5 items-center justify-around h-14">
        {/* Tab 1: Radar & Audio */}
        <button
          type="button"
          onClick={() => onTabChange('radar')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl transition-all ${
            activeTab === 'radar'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radar className={`w-5 h-5 ${activeTab === 'radar' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Radar & Audio</span>
        </button>

        {/* Tab 2: Price Comparison */}
        <button
          type="button"
          onClick={() => onTabChange('compare')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl relative transition-all ${
            activeTab === 'compare'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 ${activeTab === 'compare' ? 'scale-110' : ''}`} />
            {hasComparisonData && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Porównywarka</span>
        </button>

        {/* Tab 3: Calendar & Freshness */}
        <button
          type="button"
          onClick={() => onTabChange('calendar')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl transition-all ${
            activeTab === 'calendar'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className={`w-5 h-5 ${activeTab === 'calendar' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Kalendarz</span>
        </button>

        {/* Tab 4: AI Shopping Advisor */}
        <button
          type="button"
          onClick={() => onTabChange('advisor')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl transition-all ${
            activeTab === 'advisor'
              ? 'text-purple-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${activeTab === 'advisor' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Doradca AI</span>
        </button>

        {/* Tab 5: History */}
        <button
          type="button"
          onClick={onOpenHistory}
          className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 transition-all relative"
        >
          <div className="relative">
            <History className="w-5 h-5" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-bold">
                {historyCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Historia</span>
        </button>
      </nav>
    </div>
  );
};
