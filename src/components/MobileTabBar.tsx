import React from 'react';
import { Search, ShoppingBag, ShieldCheck, MessageSquare, Bell } from 'lucide-react';
import { ActiveWorkspaceTab } from './Navbar';

interface MobileTabBarProps {
  activeTab: ActiveWorkspaceTab;
  onTabChange: (tab: ActiveWorkspaceTab) => void;
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1 shadow-2xl safe-area-bottom">
      <nav className="grid grid-cols-5 items-center justify-around h-14">
        {/* Tab 1: Wyszukiwarka */}
        <button
          type="button"
          onClick={() => onTabChange('search')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl transition-all ${
            activeTab === 'search'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className={`w-5 h-5 ${activeTab === 'search' ? 'scale-110 text-amber-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Szukaj</span>
        </button>

        {/* Tab 2: Porównywarka */}
        <button
          type="button"
          onClick={() => onTabChange('compare')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl relative transition-all ${
            activeTab === 'compare'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 ${activeTab === 'compare' ? 'scale-110 text-amber-400' : ''}`} />
            {hasComparisonData && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Porównaj</span>
        </button>

        {/* Tab 3: Forensics & Analiza */}
        <button
          type="button"
          onClick={() => onTabChange('forensics')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl transition-all ${
            activeTab === 'forensics'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className={`w-5 h-5 ${activeTab === 'forensics' ? 'scale-110 text-amber-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Analiza</span>
        </button>

        {/* Tab 4: AI Shopping Advisor */}
        <button
          type="button"
          onClick={() => onTabChange('advisor')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl transition-all ${
            activeTab === 'advisor'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${activeTab === 'advisor' ? 'scale-110 text-amber-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Doradca</span>
        </button>

        {/* Tab 5: Alert Cenowy */}
        <button
          type="button"
          onClick={() => onTabChange('alert')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl transition-all ${
            activeTab === 'alert'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className={`w-5 h-5 ${activeTab === 'alert' ? 'scale-110 text-amber-400' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">Alert</span>
        </button>
      </nav>
    </div>
  );
};

