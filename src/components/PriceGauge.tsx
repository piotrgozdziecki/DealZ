import React from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Percent, 
  Sparkles,
  ArrowRight,
  Database,
  BarChart3
} from 'lucide-react';
import { DeepAnalysisResult } from '../types';

interface PriceGaugeProps {
  data: DeepAnalysisResult;
  lang: 'pl' | 'en';
}

export const PriceGauge: React.FC<PriceGaugeProps> = ({ data, lang }) => {
  const { pricing, dealScore, product } = data;

  const min = pricing.marketMinPrice || pricing.fairMarketPrice * 0.8;
  const max = pricing.marketMaxPrice || pricing.fairMarketPrice * 1.25;
  const current = pricing.offeredPrice;
  const fair = pricing.fairMarketPrice;

  // Calculate percentage along the gauge (clamped 0 to 100)
  const range = Math.max(max - min, 1);
  const currentPos = Math.min(Math.max(((current - min) / range) * 100, 0), 100);
  const fairPos = Math.min(Math.max(((fair - min) / range) * 100, 0), 100);

  const isBargain = pricing.isBelowMarket || pricing.priceDifferenceAmount < 0;
  const isOverpriced = pricing.priceDifferenceAmount > 0;

  // Determine badge styling based on deal score
  const getScoreBadge = () => {
    if (dealScore.score >= 80) {
      return {
        bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        icon: Sparkles,
        label: dealScore.ratingLabel || 'MEGA OKAZJA',
      };
    } else if (dealScore.score >= 65) {
      return {
        bg: 'bg-teal-950/80 border-teal-500/50 text-teal-300',
        icon: CheckCircle,
        label: dealScore.ratingLabel || 'DOBRA CENA',
      };
    } else if (dealScore.score >= 45) {
      return {
        bg: 'bg-blue-950/80 border-blue-500/50 text-blue-300',
        icon: CheckCircle,
        label: dealScore.ratingLabel || 'CENA RYNKOWA',
      };
    } else if (dealScore.score >= 25) {
      return {
        bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
        icon: AlertTriangle,
        label: dealScore.ratingLabel || 'LEKKO ZA DROGO',
      };
    } else {
      return {
        bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        icon: ShieldAlert,
        label: dealScore.ratingLabel || 'PRZEPŁACASZ / RYZYKO',
      };
    }
  };

  const badge = getScoreBadge();
  const BadgeIcon = badge.icon;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
      {/* Header with Title and Deal Score Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            {product.category || 'Wycena Rynkowa AI'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
            {product.identifiedName}
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Stan: <strong className="text-slate-200">{product.detectedCondition || 'Standardowy'}</strong></span>
            <span>•</span>
            <span className="text-slate-400">{product.specsSummary}</span>
            {product.stockAvailability && (
              <>
                <span>•</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  product.stockAvailability === 'in_stock' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  product.stockAvailability === 'low_stock' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  product.stockAvailability === 'out_of_stock' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {product.stockAvailability === 'in_stock' ? 'W MAGAZYNIE' : 
                   product.stockAvailability === 'low_stock' ? 'OSTATNIE SZTUKI' :
                   product.stockAvailability === 'out_of_stock' ? 'BRAK TOWARU' : 'DOSTĘPNOŚĆ NIEZNANA'}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Score Radial / Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] uppercase font-semibold text-slate-400">
              Wskaźnik Okazji
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
              {dealScore.score}<span className="text-sm text-slate-500 font-normal">/100</span>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wide ${badge.bg}`}>
            <BadgeIcon className="w-4 h-4 shrink-0" />
            <span>{badge.label}</span>
          </div>
        </div>
      </div>

      {/* Main Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-5 border-b border-slate-800">
        {/* Offered Price */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-medium">Cena w ofercie:</div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-1">
            {current.toLocaleString()} <span className="text-sm font-normal text-slate-400">{pricing.currency}</span>
          </div>
          <div className="mt-2 text-xs flex items-center gap-1.5 font-medium">
            {isBargain ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {Math.abs(pricing.priceDifferenceAmount).toLocaleString()} {pricing.currency} poniżej rynkowej ({pricing.priceDifferencePercentage}%)
              </span>
            ) : isOverpriced ? (
              <span className="text-rose-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +{pricing.priceDifferenceAmount.toLocaleString()} {pricing.currency} powyżej średniej (+{pricing.priceDifferencePercentage}%)
              </span>
            ) : (
              <span className="text-blue-400">Identyczna z normą rynkową</span>
            )}
          </div>
        </div>

        {/* Fair Market Benchmark */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-medium">Prawidłowa cena rynkowa (Benchmark):</div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 mt-1">
            {fair.toLocaleString()} <span className="text-sm font-normal text-slate-400">{pricing.currency}</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Mediana rynku: <strong className="text-slate-300 font-mono">{pricing.medianPrice?.toLocaleString() || fair.toLocaleString()} {pricing.currency}</strong>
          </div>
        </div>

        {/* Market Range */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-medium">Widełki rynkowe (Min – Max):</div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-200 mt-1.5">
            {min.toLocaleString()} – {max.toLocaleString()} <span className="text-xs font-normal text-slate-400">{pricing.currency}</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Zakres ofert na rynku wtórnym w Polsce
          </div>
        </div>
      </div>

      {/* Visual Price Comparison Bar */}
      <div className="pt-6 pb-2">
        <div className="flex justify-between text-xs text-slate-400 font-medium mb-2">
          <span>Tani dół rynku ({min.toLocaleString()} {pricing.currency})</span>
          <span className="text-emerald-400 font-semibold">Średnia: {fair.toLocaleString()} {pricing.currency}</span>
          <span>Góra rynku ({max.toLocaleString()} {pricing.currency})</span>
        </div>

        <div className="relative h-4 bg-slate-950 rounded-full overflow-visible border border-slate-800">
          {/* Gradient background track */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-rose-500/20" />

          {/* Fair benchmark line */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-emerald-400 z-10"
            style={{ left: `${fairPos}%` }}
            title="Prawidłowa średnia rynkowa"
          />

          {/* Offered price pin indicator */}
          <div 
            className="absolute -top-3.5 -bottom-3.5 flex flex-col items-center z-20 transition-all duration-500"
            style={{ left: `${currentPos}%`, transform: 'translateX(-50%)' }}
          >
            <div className="px-2 py-0.5 rounded-full bg-white text-slate-950 font-bold text-[10px] font-mono shadow-md border border-slate-300 whitespace-nowrap">
              Twoja oferta: {current.toLocaleString()} zł
            </div>
            <div className="w-2.5 h-2.5 bg-emerald-400 rotate-45 -mt-1 shadow-sm" />
          </div>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white font-semibold">Werdykt Analityka AI: </strong>
            {dealScore.rationale}
          </div>
        </div>

        {/* Raw Market Facts Panel */}
        {data.rawStats && (
          <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Surowe Fakty Rynkowe (Dane Analityczne)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block leading-none mb-1">Zmienność Rynku</span>
                  <span className={`text-xs font-bold uppercase ${
                    data.rawStats.marketVolatility === 'low' ? 'text-emerald-400' :
                    data.rawStats.marketVolatility === 'medium' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {data.rawStats.marketVolatility === 'low' ? 'Niska' :
                     data.rawStats.marketVolatility === 'medium' ? 'Umiarkowana' : 'Wysoka'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block leading-none mb-1">Popyt (Sygnały AI)</span>
                  <span className={`text-xs font-bold uppercase ${
                    data.rawStats.demandLevel === 'viral' ? 'text-rose-400' :
                    data.rawStats.demandLevel === 'high' ? 'text-orange-400' : 'text-blue-400'
                  }`}>
                    {data.rawStats.demandLevel === 'viral' ? 'BARDZO WYSOKI' :
                     data.rawStats.demandLevel === 'high' ? 'Wysoki' :
                     data.rawStats.demandLevel === 'moderate' ? 'Stabilny' : 'Niski'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block leading-none mb-1">Wiek ogłoszeń (śr.)</span>
                  <span className="text-xs font-bold text-white uppercase">
                    {data.rawStats.listingAgeAvgDays} Dni
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
