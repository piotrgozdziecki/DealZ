import React from 'react';
import { 
  X, 
  Trash2, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  Volume2, 
  ArrowRight,
  ExternalLink,
  Tag
} from 'lucide-react';
import { HistoryItem } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteSingleItem: (id: string) => void;
  lang: 'pl' | 'en';
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onClearHistory,
  onDeleteSingleItem,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-5 sm:p-6 shadow-2xl z-10 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Historia Wycen</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {items.length}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="mt-4 space-y-3">
            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Brak zapisanych wycen. Przeanalizuj ofertę, a pojawi się tutaj wraz z podsumowaniem i audio.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectItem(item);
                        onClose();
                      }}
                      className="text-left font-bold text-xs text-white group-hover:text-emerald-300 transition truncate max-w-[240px]"
                    >
                      {item.title}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSingleItem(item.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 transition p-1"
                      title="Usuń z historii"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-slate-200 font-bold">
                      {item.price} {item.currency}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/50 text-emerald-300 font-bold">
                      {item.verdict} ({item.score}/100)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-400">
                    <span>{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {item.audioBase64 && (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <Volume2 className="w-3 h-3" /> Audio gotowe
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {items.length > 0 && (
          <div className="pt-4 border-t border-slate-800 mt-4">
            <button
              type="button"
              onClick={onClearHistory}
              className="w-full py-2 px-4 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-900/50 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wyczyść całą historię
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
