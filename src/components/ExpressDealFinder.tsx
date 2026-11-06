import React, { useState, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  ExternalLink, 
  Zap, 
  ShoppingBag,
  Camera,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { InstantDealResult, SimilarDealItem } from '../types';

interface ExpressDealFinderProps {
  onSearch: (query: string, price?: string, imageBase64?: string | null) => Promise<void>;
  isLoading: boolean;
  result: InstantDealResult | null;
  onSelectDealForDeepAnalysis?: (deal: SimilarDealItem) => void;
}

export const ExpressDealFinder: React.FC<ExpressDealFinderProps> = ({
  onSearch,
  isLoading,
  result,
  onSelectDealForDeepAnalysis,
}) => {
  const [query, setQuery] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Proszę wybrać plik graficzny (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      // Automatically trigger search with image lens
      onSearch(query.trim() || 'Szukanie po zdjęciu', priceInput.trim() || undefined, base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!query.trim() && !imagePreview) || isLoading) return;
    onSearch(query.trim(), priceInput.trim() || undefined, imagePreview);
  };

  const getVerdictStyle = (verdict: InstantDealResult['verdict']) => {
    switch (verdict) {
      case 'BIERZ TERAZ':
        return {
          bg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
          badgeBg: 'bg-emerald-500 text-slate-950 font-black',
          glow: 'from-emerald-500/20 via-teal-500/10 to-transparent',
          textColor: 'text-emerald-400',
        };
      case 'NEGOCJUJ':
        return {
          bg: 'bg-blue-950/70 border-blue-500/50 text-blue-300',
          badgeBg: 'bg-blue-500 text-white font-black',
          glow: 'from-blue-500/20 via-cyan-500/10 to-transparent',
          textColor: 'text-blue-400',
        };
      case 'SZUKAJ DALEJ':
        return {
          bg: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
          badgeBg: 'bg-amber-500 text-slate-950 font-black',
          glow: 'from-amber-500/20 via-rose-500/10 to-transparent',
          textColor: 'text-amber-400',
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-800 text-slate-200',
          badgeBg: 'bg-slate-700 text-white',
          glow: 'from-slate-800/20 to-transparent',
          textColor: 'text-slate-300',
        };
    }
  };

  const getPlatformBadge = (platform: SimilarDealItem['platform']) => {
    switch (platform) {
      case 'Allegro':
        return 'bg-orange-950/80 text-orange-300 border-orange-800/80';
      case 'OLX':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
      case 'Ceneo':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80';
      case 'Amazon':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return { label: 'W MAGAZYNIE', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
      case 'low_stock':
        return { label: 'OSTATNIE SZTUKI', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
      case 'out_of_stock':
        return { label: 'BRAK TOWARU', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' };
      default:
        return { label: 'DOSTĘPNOŚĆ NIEZNANA', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' };
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Wyszukiwarka Ofert i Google Lens (Zdjęcie / Obiektyw)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                Allegro • OLX • Ceneo • Amazon
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Wpisz nazwę, wklej link lub dodaj zdjęcie produktu (jak Google Lens), aby natychmiast znaleźć identyczne aktywne oferty i ceny w Polsce.
          </p>
        </div>
      </div>

      {/* Image Preview if uploaded */}
      {imagePreview && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
          <div className="relative inline-block max-w-full">
            <img
              src={imagePreview}
              alt="Szukany przedmiot ze zdjęcia"
              className="max-h-40 rounded-lg object-contain mx-auto border border-slate-700"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg transition"
              title="Usuń zdjęcie"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
            <span className="text-emerald-400 font-medium">
              ✓ Zdjęcie załadowane. Użyj wyszukiwania wizualnego:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imagePreview)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 transition shadow-sm text-[11px]"
              >
                <span>Google Lens (Wyszukiwanie wizualne)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`https://allegro.pl/kategoria/wyszukiwanie-zdjeciem`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1.5 transition shadow-sm text-[11px]"
              >
                <span>Szukaj na Allegro po zdjęciu</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Search Input Form */}
      <form onSubmit={handleFormSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          {/* Main Query / Link input */}
          <div className="md:col-span-7 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Wpisz nazwę przedmiotu lub wklej link..."
              className="w-full min-h-[48px] px-4 pl-11 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-medium transition"
            />
            <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
          </div>

          {/* Google Lens Camera Upload Button */}
          <div className="md:col-span-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="express-lens-upload"
            />
            <label
              htmlFor="express-lens-upload"
              title="Szukaj po zdjęciu (Google Lens)"
              className="w-full h-full min-h-[48px] px-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/60 rounded-xl text-emerald-400 flex items-center justify-center cursor-pointer transition shadow-sm"
            >
              <Camera className="w-5 h-5" />
            </label>
          </div>

          {/* Optional Price input */}
          <div className="md:col-span-2">
            <input
              type="number"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="Cena (zł)"
              className="w-full min-h-[48px] px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono font-semibold"
            />
          </div>

          {/* Submit Search Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={(!query.trim() && !imagePreview) || isLoading}
              className="w-full min-h-[48px] px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Szukam...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Szukaj</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="py-12 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80">
          <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">
            {imagePreview ? 'Google Lens analizuje zdjęcie i szuka w sklepach...' : 'Przeszukuję polski rynek na żywo...'}
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Porównuję oferty na Allegro, OLX i Ceneo w czasie rzeczywistym.
          </p>
        </div>
      )}

      {/* RESULT SECTION */}
      {result && !isLoading && (
        <div className="space-y-5 pt-2">
          {/* 1. Main Clear Verdict Card */}
          {(() => {
            const vStyle = getVerdictStyle(result.verdict);
            return (
              <div className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-xl ${vStyle.bg}`}>
                <div className={`absolute inset-0 bg-gradient-to-r ${vStyle.glow} pointer-events-none`} />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-xl text-xs tracking-wider uppercase ${vStyle.badgeBg}`}>
                        {result.verdict}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Dla: <strong className="text-white">{result.targetProduct.title}</strong>
                      </span>
                      {result.confidenceScore && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-700/50">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">
                            Pewność AI: {result.confidenceScore}%
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm sm:text-base text-white font-medium mt-2 leading-relaxed">
                      {result.verdictReason}
                    </p>
                  </div>

                  {/* Profit / Savings Pill */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-right shrink-0">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                      {result.isProfitable ? 'Twój zysk / oszczędność:' : 'Różnica do średniej:'}
                    </span>
                    <span className={`text-xl sm:text-2xl font-extrabold font-mono ${vStyle.textColor}`}>
                      {result.isProfitable ? `+${result.savingsAmount.toLocaleString()} PLN` : `-${Math.abs(result.savingsAmount).toLocaleString()} PLN`}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      ({result.savingsPercentage > 0 ? `-${result.savingsPercentage}%` : `+${Math.abs(result.savingsPercentage)}%`})
                    </span>
                  </div>
                </div>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Cena wyjściowa:</span>
                    <span className="text-white font-mono font-bold text-sm">
                      {result.targetProduct.identifiedPrice.toLocaleString()} {result.targetProduct.currency}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Średnia norma rynkowa:</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">
                      {result.benchmarkPrice.toLocaleString()} {result.targetProduct.currency}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Wskazówka bezpieczeństwa:</span>
                    <span className="text-slate-300 truncate block font-medium" title={result.safetyTip}>
                      {result.safetyTip}
                    </span>
                  </div>
                </div>

                {/* Raw Market Stats Table */}
                {result.rawMarketStats && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Surowy Raport Rynkowy (Fakty & Liczby)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase block">Aktywne oferty</span>
                        <span className="text-sm font-mono font-bold text-white">{result.rawMarketStats.totalActiveOffers}</span>
                      </div>
                      <div className="space-y-1 border-l border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Mediana ceny</span>
                        <span className="text-sm font-mono font-bold text-white">{result.rawMarketStats.medianPrice} PLN</span>
                      </div>
                      <div className="space-y-1 border-l border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Rozpiętość (Min-Max)</span>
                        <span className="text-sm font-mono font-bold text-white">{result.rawMarketStats.minPrice}-{result.rawMarketStats.maxPrice}</span>
                      </div>
                      <div className="space-y-1 border-l border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Ostatnia zmiana</span>
                        <span className="text-sm font-mono font-bold text-cyan-400">{result.rawMarketStats.lastPriceChange || 'Dzisiaj'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 2. Direct Matching Auctions List with BUY NOW Buttons */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Aktualne Aukcje i Oferty na Żywo ({result.similarDeals.length})</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                    100% Prawdziwe Linki
                  </span>
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Bezpośrednie przejścia do zakupów i licytacji</span>
            </div>

            {/* Direct 1-Click Live Market Explore Bar */}
            {result.exactLiveLinks && (
              <div className="p-3 mb-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Sprawdź na żywo na polskich platformach (od najniższej ceny):
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <a
                    href={result.exactLiveLinks.allegro}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-orange-950/60 hover:bg-orange-900/60 border border-orange-700/60 text-orange-200 font-semibold flex items-center justify-center gap-1.5 transition text-[11px]"
                  >
                    <span>Allegro (Na żywo)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <a
                    href={result.exactLiveLinks.olx}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-semibold flex items-center justify-center gap-1.5 transition text-[11px]"
                  >
                    <span>OLX (Przesyłka)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <a
                    href={result.exactLiveLinks.ceneo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-200 font-semibold flex items-center justify-center gap-1.5 transition text-[11px]"
                  >
                    <span>Ceneo (100+ sklepów)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <a
                    href={result.exactLiveLinks.amazon}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 text-amber-200 font-semibold flex items-center justify-center gap-1.5 transition text-[11px]"
                  >
                    <span>Amazon.pl Prime</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {result.similarDeals.map((deal, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    deal.isCheaper
                      ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Platform & Title */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPlatformBadge(deal.platform)}`}>
                        {deal.platform}
                      </span>
                      {deal.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {deal.badge}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{deal.condition}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                      {deal.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                      <span>Wysyłka: <strong className="text-slate-300">{deal.shippingSpeed || deal.shipping}</strong></span>
                      {deal.seller && <span>Sprzedawca: <strong className="text-slate-300">{deal.seller}</strong></span>}
                      {deal.availabilityStatus && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStockBadge(deal.availabilityStatus).color}`}>
                          {getStockBadge(deal.availabilityStatus).label}
                        </span>
                      )}
                      {deal.matchAccuracy && (
                        <span className="flex items-center gap-1">
                          Dokładność: 
                          <span className={`font-bold ${deal.matchAccuracy > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {deal.matchAccuracy}%
                          </span>
                        </span>
                      )}
                      {deal.priceDifferenceVsTarget !== 0 && (
                        <span className={`font-mono font-bold ${deal.priceDifferenceVsTarget < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {deal.priceDifferenceVsTarget < 0
                            ? `(${Math.abs(deal.priceDifferenceVsTarget)} zł taniej!)`
                            : `(+${deal.priceDifferenceVsTarget} zł)`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Price & Direct Buy Now button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-base sm:text-lg font-extrabold font-mono text-white">
                        {deal.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">{deal.currency}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 block font-semibold">● oferta aktywna</span>
                    </div>

                    <a
                      href={deal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-700/20 transition active:scale-95"
                    >
                      <span>KUP TERAZ</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Google Search Grounding Sources (Transparency) */}
            {result.groundingSources && result.groundingSources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-semibold block mb-2">
                  Zweryfikowane źródła w polskim internecie (Google Search Grounding):
                </span>
                <div className="flex flex-wrap gap-2">
                  {result.groundingSources.slice(0, 5).map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-[11px] flex items-center gap-1.5 transition truncate max-w-[260px]"
                    >
                      <span className="truncate">{source.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-slate-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
