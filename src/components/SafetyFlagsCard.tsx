import React from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Shield, 
  Lock 
} from 'lucide-react';
import { RedFlag } from '../types';

interface SafetyFlagsCardProps {
  flags: RedFlag[];
  recommendation: 'KUPUJ' | 'NEGOCJUJ' | 'CZEKAJ' | 'ODRADZAM';
  lang: 'pl' | 'en';
}

export const SafetyFlagsCard: React.FC<SafetyFlagsCardProps> = ({
  flags,
  recommendation,
  lang,
}) => {
  if (!flags || flags.length === 0) return null;

  const getSeverityBadge = (sev: RedFlag['severity']) => {
    switch (sev) {
      case 'high':
        return {
          icon: ShieldAlert,
          bg: 'bg-rose-950/60 border-rose-800/80 text-rose-300',
          badgeText: 'Krytyczne Ryzyko ⚠️',
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-950/60 border-amber-800/80 text-amber-300',
          badgeText: 'Zachowaj Ostrożność',
        };
      case 'positive':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300',
          badgeText: 'Atut Bezpieczeństwa ✓',
        };
      default:
        return {
          icon: Info,
          bg: 'bg-blue-950/60 border-blue-800/80 text-blue-300',
          badgeText: 'Wskazówka',
        };
    }
  };

  const getRecommendationStyle = () => {
    switch (recommendation) {
      case 'KUPUJ':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'NEGOCJUJ':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'CZEKAJ':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ODRADZAM':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Audyt Bezpieczeństwa i Ryzyka (Anty-Scam)
            </h3>
            <p className="text-xs text-slate-400">
              Analiza pod kątem typowych oszustw na OLX/Allegro, blokad operatora i ukrytych wad.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <span className="text-xs text-slate-400 font-medium">Werdykt:</span>
          <span className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wide border ${getRecommendationStyle()}`}>
            {recommendation}
          </span>
        </div>
      </div>

      <div className="pt-4 grid grid-cols-1 gap-3">
        {flags.map((flag, idx) => {
          const badge = getSeverityBadge(flag.severity);
          const Icon = badge.icon;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border ${badge.bg} flex items-start gap-3 transition`}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    {flag.flag}
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950/70">
                    {badge.badgeText}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {flag.explanation}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
