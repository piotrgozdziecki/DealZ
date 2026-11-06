import React from 'react';
import { 
  Radar, 
  History, 
  User as UserIcon,
  LogOut,
  Database
} from 'lucide-react';
import { User } from 'firebase/auth';

export type ActiveWorkspaceTab = 'search' | 'compare' | 'forensics' | 'advisor' | 'alert';

interface NavbarProps {
  onOpenHistory: () => void;
  historyCount: number;
  lang: 'pl' | 'en';
  onToggleLang: () => void;
  activeTab: ActiveWorkspaceTab;
  onSelectTab: (tab: ActiveWorkspaceTab) => void;
  currentUser: User | null;
  onLoginWithGoogle: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHistory,
  historyCount,
  lang,
  onToggleLang,
  activeTab,
  onSelectTab,
  currentUser,
  onLoginWithGoogle,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6 sm:gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <a 
          href="/" 
          className="flex items-center space-x-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 group"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 shadow-md shadow-amber-500/20 text-slate-950 transition group-hover:scale-105">
            <Radar className="w-5 h-5 font-bold" />
          </div>
          <span>
            DealZ <span className="text-amber-400 font-black">AI</span>
          </span>
        </a>

        {/* Zone 2: Single-line Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => onSelectTab('search')}
            className={`transition whitespace-nowrap shrink-0 ${
              activeTab === 'search' ? 'text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5' : 'hover:text-slate-200'
            }`}
          >
            Wyszukiwarka Ofert
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('compare')}
            className={`transition whitespace-nowrap shrink-0 ${
              activeTab === 'compare' ? 'text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5' : 'hover:text-slate-200'
            }`}
          >
            Porównywarka Sklepów
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('forensics')}
            className={`transition whitespace-nowrap shrink-0 ${
              activeTab === 'forensics' ? 'text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5' : 'hover:text-slate-200'
            }`}
          >
            Analiza & Forensics
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('advisor')}
            className={`transition whitespace-nowrap shrink-0 ${
              activeTab === 'advisor' ? 'text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5' : 'hover:text-slate-200'
            }`}
          >
            Doradca AI
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('alert')}
            className={`transition whitespace-nowrap shrink-0 ${
              activeTab === 'alert' ? 'text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5' : 'hover:text-slate-200'
            }`}
          >
            Alert Cenowy
          </button>
        </nav>

        {/* Zone 3: User Auth & History Action */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {currentUser && !currentUser.isAnonymous ? (
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Avatar" 
                  className="w-5 h-5 rounded-full object-cover border border-amber-500/40" 
                />
              ) : (
                <UserIcon className="w-4 h-4 text-amber-400" />
              )}
              <span className="hidden sm:inline text-xs font-medium text-slate-200 max-w-[100px] truncate">
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
              <button
                onClick={onLogout}
                title="Wyloguj"
                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginWithGoogle}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition shadow-md shadow-amber-950/40"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Sign In</span>
              <span className="sm:hidden">Google</span>
            </button>
          )}

          <button
            onClick={onToggleLang}
            className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition"
          >
            {lang === 'pl' ? 'PL' : 'EN'}
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition active:scale-95 shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Historia</span>
            {historyCount > 0 && (
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

