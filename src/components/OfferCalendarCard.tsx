import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  History, 
  CalendarCheck, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { DateFreshnessResult } from '../types';

interface OfferCalendarCardProps {
  currentListingDate: string;
  onDateChange: (newDate: string) => void;
  freshnessResult: DateFreshnessResult | null;
  onCheckFreshness: (dateStr: string) => void;
  isLoadingFreshness: boolean;
  productTitle: string;
}

export const OfferCalendarCard: React.FC<OfferCalendarCardProps> = ({
  currentListingDate,
  onDateChange,
  freshnessResult,
  onCheckFreshness,
  isLoadingFreshness,
  productTitle,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(currentListingDate || todayStr);

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    onDateChange(dateStr);
    onCheckFreshness(dateStr);
  };

  const handlePresetClick = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const str = d.toISOString().split('T')[0];
    handleDateSelect(str);
  };

  const getStatusDisplay = () => {
    if (!freshnessResult) {
      return {
        badge: 'Oczekiwanie na sprawdzenie',
        badgeBg: 'bg-slate-800 text-slate-300',
        icon: Info,
      };
    }

    switch (freshnessResult.status) {
      case 'fresh':
        return {
          badge: 'ŚWIEŻA OFERTA (0–48H)',
          badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
          icon: CheckCircle2,
        };
      case 'standard':
        return {
          badge: 'STANDARDOWY CZAS (3–6 DNI)',
          badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
          icon: Clock,
        };
      case 'aging':
        return {
          badge: 'PONAD TYDZIEŃ W SIECI',
          badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
          icon: AlertTriangle,
        };
      case 'stale':
        return {
          badge: 'STARSZE NIŻ 14 DNI – RYZYKO ARCHIWALNEJ',
          badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
          icon: ShieldAlert,
        };
      default:
        return {
          badge: 'W TRAKCIE ANALIZY',
          badgeBg: 'bg-slate-800 text-slate-300',
          icon: Info,
        };
    }
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Kalendarz Aktualności i Świeżości Oferty
            </h3>
            <p className="text-xs text-slate-400">
              Sprawdź czy ogłoszenie jest nadal aktualne, czy to oferta archiwalna.
            </p>
          </div>
        </div>

        {freshnessResult && (
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold self-start sm:self-auto ${status.badgeBg}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{status.badge}</span>
          </div>
        )}
      </div>

      {/* Date Picker and Quick Presets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-amber-400" />
            Data Wystawienia / Ostatniej Edycji:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={(e) => handleDateSelect(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer font-mono"
            />
            <button
              type="button"
              onClick={() => onCheckFreshness(selectedDate)}
              disabled={isLoadingFreshness}
              className="min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 transition"
            >
              {isLoadingFreshness ? 'Sprawdzam...' : 'Weryfikuj'}
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="md:col-span-7">
          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Szybki wybór osi czasu:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handlePresetClick(0)}
              className="min-h-[38px] px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition font-medium"
            >
              Dzisiaj (Świeża)
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick(1)}
              className="min-h-[38px] px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition font-medium"
            >
              Wczoraj
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick(4)}
              className="min-h-[38px] px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition font-medium"
            >
              4 dni temu
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick(10)}
              className="min-h-[38px] px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition font-medium"
            >
              10 dni temu
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick(21)}
              className="min-h-[38px] px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-rose-400 hover:text-rose-300 transition font-medium"
            >
              3 tygodnie temu (Archiwum)
            </button>
          </div>
        </div>
      </div>

      {/* Freshness Audit Card */}
      {freshnessResult && (
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Wiek oferty:</span>
            <span className="text-white font-mono font-bold text-base">
              {freshnessResult.diffDays === 0 ? 'Dziś' : `${freshnessResult.diffDays} dni temu`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Prawdopodobieństwo dostępności:</span>
            <span className={`font-mono font-bold text-base ${
              freshnessResult.status === 'fresh' ? 'text-emerald-400' :
              freshnessResult.status === 'stale' ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {freshnessResult.availabilityChance}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Weryfikacja zegarowa:</span>
            <span className="text-slate-300 font-mono text-xs">
              {new Date(freshnessResult.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {/* Freshness Advice Notice */}
      {freshnessResult && (
        <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
          freshnessResult.status === 'stale'
            ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
            : freshnessResult.status === 'fresh'
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
            : 'bg-slate-950 border-slate-800 text-slate-300'
        }`}>
          <StatusIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold mb-0.5">Analiza Ważności Ogłoszenia:</strong>
            {freshnessResult.riskNotice}
          </div>
        </div>
      )}
    </div>
  );
};
