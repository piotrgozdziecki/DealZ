import React, { useState } from 'react';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  TrendingDown, 
  BadgePercent, 
  Lightbulb, 
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { DeepAnalysisResult } from '../types';

interface NegotiationCardProps {
  data: DeepAnalysisResult;
  lang: 'pl' | 'en';
}

export const NegotiationCard: React.FC<NegotiationCardProps> = ({ data, lang }) => {
  const [copied, setCopied] = useState(false);
  const { negotiationStrategy, depreciationForecast, pricing } = data;

  const handleCopy = () => {
    if (!negotiationStrategy.readyMessageToSeller) return;
    navigator.clipboard.writeText(negotiationStrategy.readyMessageToSeller);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <BadgePercent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Strategia Negocjacji & Gotowa Wiadomość
            </h3>
            <p className="text-xs text-slate-400">
              Sugerowana kontroferta i gotowy tekst do wysłania na czacie OLX / Allegro.
            </p>
          </div>
        </div>

        {/* Counter-offer pill */}
        <div className="flex items-center space-x-3 p-2 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">
              Sugerowana oferta:
            </div>
            <div className="text-base font-extrabold font-mono text-emerald-400">
              {negotiationStrategy.suggestedOffer?.toLocaleString()} {pricing.currency}
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">
              Limit (walk-away):
            </div>
            <div className="text-base font-extrabold font-mono text-slate-300">
              {negotiationStrategy.maxWalkingPrice?.toLocaleString()} {pricing.currency}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 space-y-4">
        {/* Leverage points */}
        {negotiationStrategy.leveragePoints && negotiationStrategy.leveragePoints.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Twoje argumenty negocjacyjne (punkty nacisku):
            </span>
            <div className="flex flex-wrap gap-2">
              {negotiationStrategy.leveragePoints.map((point, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {point}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ready Message Box */}
        {negotiationStrategy.readyMessageToSeller && (
          <div className="relative">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                Gotowa wiadomość do skopiowania:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Skopiowano!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiuj treść</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-200 font-mono leading-relaxed relative group">
              <p>{negotiationStrategy.readyMessageToSeller}</p>
            </div>
          </div>
        )}

        {/* Depreciation and Price Trends */}
        {depreciationForecast && (
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 text-xs text-slate-300">
            <TrendingDown className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-100">Prognoza Utraty Wartości (3-6 miesięcy): </span>
              {depreciationForecast}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
