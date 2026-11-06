import React from 'react';
import { Zap, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, X } from 'lucide-react';
import { QuickScanResult } from '../types';

interface QuickScanCardProps {
  result: QuickScanResult | null;
  onDismiss: () => void;
  lang: 'pl' | 'en';
}

export const QuickScanCard: React.FC<QuickScanCardProps> = ({
  result,
  onDismiss,
  lang,
}) => {
  if (!result) return null;

  const isBargain = result.dealScore >= 70;
  const isSuspicious = result.dealVerdict?.includes('PODEJRZANIE') || result.dealVerdict?.includes('RYZYKO');

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/40 p-4 sm:p-5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Błyskawiczny Flash-Scan
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-amber-500/30 text-amber-200">
                gemini-3.1-flash-lite (&lt; 1s)
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
              Wstępny Werdykt: <span className="text-amber-300">{result.dealVerdict}</span>
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800/80 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Szacowana wartość rynkowa:</span>
          <span className="text-white font-mono font-bold text-sm">{result.estimatedFairPrice}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Różnica / Oszczędność:</span>
          <span className={`font-mono font-bold text-sm ${isBargain ? 'text-emerald-400' : 'text-slate-200'}`}>
            {result.savingsPercentage}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Główna uwaga:</span>
          <span className="text-slate-200 font-medium truncate block" title={result.initialRisk}>
            {result.initialRisk}
          </span>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-300 leading-relaxed font-medium">
        &quot;{result.quickHeadline}&quot;
      </div>
    </div>
  );
};
