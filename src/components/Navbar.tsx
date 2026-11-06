import React from 'react';
import { 
  Radar, 
  History, 
  User as UserIcon,
  LogOut,
  Database
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  onOpenHistory: () => void;
  historyCount: number;
  lang: 'pl' | 'en';
  onToggleLang: () => void;
  activeSegment: string;
  onSelectSegment: (segment: string) => void;
  currentUser: User | null;
  onLoginWithGoogle: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHistory,
  historyCount,
  lang,
  onToggleLang,
  activeSegment,
  onSelectSegment,
  currentUser,
  onLoginWithGoogle,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <a 
          href="/" 
          className="flex items-center space-x-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 group"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/25 text-white transition group-hover:scale-105">
            <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '9s' }} />
          </div>
          <span>
            DealRadar <span className="text-emerald-400 font-extrabold">AI</span>
          </span>
        </a>

        {/* Zone 2: Single-line Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => onSelectSegment('express')}
            className={`transition whitespace-nowrap shrink-0 ${
              activeSegment === 'express' ? 'text-emerald-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            Szybki Łowca (Express)
          </button>

          <button
            type="button"
            onClick={() => onSelectSegment('full')}
            className={`transition whitespace-nowrap shrink-0 ${
              activeSegment === 'full' ? 'text-emerald-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            Ekspertyza & Wycena
          </button>

          <button
            type="button"
            onClick={() => onSelectSegment('compare')}
            className={`transition whitespace-nowrap shrink-0 ${
              activeSegment === 'compare' ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            Porównywarka Sklepów
          </button>

          <button
            type="button"
            onClick={() => onSelectSegment('advisor')}
            className={`transition whitespace-nowrap shrink-0 ${
              activeSegment === 'advisor' ? 'text-purple-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            Doradca AI
          </button>
        </nav>

        {/* Zone 3: Single Primary Action & Firebase User Info */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Active Firestore Status Indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300 font-medium shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Firestore DB</span>
          </div>

          {/* User Auth Control */}
          {currentUser && !currentUser.isAnonymous ? (
            <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-800/80 backdrop-blur-md rounded-xl px-2.5 py-1.5">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Avatar" 
                  className="w-5 h-5 rounded-full object-cover border border-emerald-500/40" 
                />
              ) : (
                <UserIcon className="w-4 h-4 text-emerald-400" />
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
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zaloguj przez Google</span>
              <span className="sm:hidden">Google</span>
            </button>
          )}

          <button
            onClick={onToggleLang}
            className="px-2 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 text-xs font-semibold text-slate-300 transition"
          >
            {lang === 'pl' ? 'PL' : 'EN'}
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 text-xs font-bold text-white transition active:scale-95 shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Historia</span>
            {historyCount > 0 && (
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
