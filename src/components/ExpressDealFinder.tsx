import React, { useState, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  ExternalLink, 
  Zap, 
  ShoppingBag,
  Camera,
  X,
  Image as ImageIcon,
  Cpu,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronUp
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
  const [showDiagnostics, setShowDiagnostics] = useState(false);
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
        return { label: 'DOSTĘPNOŚĆ: DO WERYFIKACJI', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' };
    }
  };

  const getVerificationBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return { label: 'WERYFIKACJA PEŁNA', color: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/40' };
      case 'partially_verified':
        return { label: 'CZĘŚCIOWA WERYFIKACJA', color: 'text-amber-300 bg-amber-950/80 border-amber-500/40' };
      case 'stale':
        return { label: 'OFERTA NIEAKTUALNA', color: 'text-rose-300 bg-rose-950/80 border-rose-500/40' };
      case 'unavailable':
        return { label: 'NIEDOSTĘPNA', color: 'text-slate-400 bg-slate-900 border-slate-700' };
      default:
        return { label: 'KANDYDAT', color: 'text-slate-300 bg-slate-900 border-slate-700' };
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
                      {result.benchmarkPrice !== null ? (result.isProfitable ? 'Twój zysk / oszczędność:' : 'Różnica do średniej:') : 'Porównanie rynkowe:'}
                    </span>
                    <span className={`text-xl sm:text-2xl font-extrabold font-mono ${vStyle.textColor}`}>
                      {result.benchmarkPrice !== null ? (
                        result.isProfitable 
                          ? `+${result.savingsAmount.toLocaleString()} PLN` 
                          : `-${Math.abs(result.savingsAmount).toLocaleString()} PLN`
                      ) : (
                        'Brak cen odniesienia'
                      )}
                    </span>
                    {result.benchmarkPrice !== null && (
                      <span className="text-[11px] text-slate-400 block font-mono">
                        ({result.savingsPercentage > 0 ? `-${result.savingsPercentage}%` : `+${Math.abs(result.savingsPercentage)}%`})
                      </span>
                    )}
                  </div>
                </div>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Cena wyjściowa:</span>
                    <span className="text-white font-mono font-bold text-sm">
                      {result.targetProduct.identifiedPrice !== null 
                        ? `${result.targetProduct.identifiedPrice.toLocaleString()} ${result.targetProduct.currency}` 
                        : 'Do ustalenia'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Średnia norma rynkowa:</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">
                      {result.benchmarkPrice !== null 
                        ? `${result.benchmarkPrice.toLocaleString()} ${result.targetProduct.currency}` 
                        : 'Brak zweryfikowanych cen'}
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
                        <span className="text-[10px] text-slate-500 uppercase block">Oferty z ceną</span>
                        <span className="text-sm font-mono font-bold text-white">{result.rawMarketStats.totalActiveOffers}</span>
                      </div>
                      <div className="space-y-1 border-l border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Mediana ceny</span>
                        <span className="text-sm font-mono font-bold text-white">
                          {result.rawMarketStats.medianPrice !== null ? `${result.rawMarketStats.medianPrice} PLN` : 'Brak'}
                        </span>
                      </div>
                      <div className="space-y-1 border-l border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Rozpiętość (Min-Max)</span>
                        <span className="text-sm font-mono font-bold text-white">
                          {result.rawMarketStats.minPrice !== null && result.rawMarketStats.maxPrice !== null 
                            ? `${result.rawMarketStats.minPrice}-${result.rawMarketStats.maxPrice} PLN` 
                            : 'Brak'}
                        </span>
                      </div>
                      <div className="space-y-1 border-l border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Ostatnia zmiana</span>
                        <span className="text-sm font-mono font-bold text-cyan-400">{result.rawMarketStats.lastPriceChange || 'Bieżące wyszukiwanie'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 2. Direct Matching Auctions List & Marketplace Search Links */}
          <div>
            {/* Separate Marketplace Search Links Section */}
            {(result.marketplaceSearchLinks?.length || result.exactLiveLinks) && (
              <div className="p-3.5 mb-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Linki nawigacyjne do wyszukiwarek platform (brak bezpośrednich ofert w oficjalnym API):
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {result.marketplaceSearchLinks && result.marketplaceSearchLinks.length > 0 ? (
                    result.marketplaceSearchLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold flex items-center justify-between gap-1.5 transition text-[11px]"
                      >
                        <span className="truncate">{link.platform} (Szukaj)</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                    ))
                  ) : result.exactLiveLinks ? (
                    <>
                      <a
                        href={result.exactLiveLinks.allegro}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 py-2 rounded-lg bg-orange-950/40 hover:bg-orange-900/50 border border-orange-800/50 text-orange-200 font-semibold flex items-center justify-between gap-1.5 transition text-[11px]"
                      >
                        <span>Allegro (Szukaj)</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <a
                        href={result.exactLiveLinks.olx}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-200 font-semibold flex items-center justify-between gap-1.5 transition text-[11px]"
                      >
                        <span>OLX (Szukaj)</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <a
                        href={result.exactLiveLinks.ceneo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 text-cyan-200 font-semibold flex items-center justify-between gap-1.5 transition text-[11px]"
                      >
                        <span>Ceneo (Szukaj)</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <a
                        href={result.exactLiveLinks.amazon}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 text-amber-200 font-semibold flex items-center justify-between gap-1.5 transition text-[11px]"
                      >
                        <span>Amazon.pl (Szukaj)</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Real Offers Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Rzeczywiste Oferty Rynkowe ({result.similarDeals.length})</span>
                  {result.similarDeals.some(d => d.verificationStatus === 'verified') && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                      Zweryfikowane źródła
                    </span>
                  )}
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Bezpośrednie przejścia do konkretnych ofert</span>
            </div>

            {/* Partitioned Offers: Verified First, then Candidates */}
            <div className="space-y-2.5">
              {result.similarDeals.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-400 text-sm">
                  Nie znaleziono bezpośrednich, aktywnych ofert dla tego zapytania. Sprawdź powyższe linki do platform handlowych.
                </div>
              ) : (
                result.similarDeals.map((deal, idx) => {
                  const vBadge = getVerificationBadge(deal.verificationStatus);
                  const isVerified = deal.verificationStatus === 'verified';
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isVerified
                          ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Platform, Verification & Title */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPlatformBadge(deal.platform)}`}>
                            {deal.platform}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${vBadge.color}`}>
                            {vBadge.label}
                          </span>
                          {deal.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              {deal.badge}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">{deal.condition}</span>
                        </div>

                        <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">
                          {deal.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1.5">
                          <span>
                            Dostawa:{' '}
                            <strong className="text-slate-300">
                              {deal.shippingCost !== null && deal.shippingCost !== undefined
                                ? (deal.shippingCost === 0 ? 'Darmowa dostawa' : `${deal.shippingCost} zł`)
                                : (deal.shippingSpeed || deal.shipping || 'Koszt nieznany')}
                            </strong>
                          </span>
                          {deal.seller && <span>Sprzedawca: <strong className="text-slate-300">{deal.seller}</strong></span>}
                          {deal.availabilityStatus && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStockBadge(deal.availabilityStatus).color}`}>
                              {getStockBadge(deal.availabilityStatus).label}
                            </span>
                          )}
                          {deal.matchAccuracy !== null && deal.matchAccuracy !== undefined && (
                            <span className="flex items-center gap-1">
                              Dopasowanie: 
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

                        {/* Total cost breakdown if known */}
                        {deal.isTotalCostKnown && deal.totalCost !== null && deal.totalCost !== undefined && (
                          <div className="mt-1 text-[11px] text-emerald-400 font-mono">
                            Całkowity koszt zakupu: <strong>{deal.totalCost.toLocaleString()} {deal.currency}</strong> (produkt + dostawa)
                          </div>
                        )}
                      </div>

                      {/* Right: Price & Direct Link button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <div className="text-left sm:text-right">
                          {deal.price !== null && deal.price > 0 ? (
                            <div className="text-base sm:text-lg font-extrabold font-mono text-white">
                              {deal.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">{deal.currency}</span>
                            </div>
                          ) : (
                            <div className="text-xs font-semibold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/60">
                              Sprawdź cenę w sklepie
                            </div>
                          )}
                          <span className={`text-[10px] block font-semibold mt-0.5 ${isVerified ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {isVerified ? '● źródło potwierdzone' : '○ kandydat do weryfikacji'}
                          </span>
                        </div>

                        <a
                          href={deal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-700/20 transition active:scale-95"
                        >
                          <span>{deal.price && deal.price > 0 ? 'PRZEJDŹ DO OFERTY' : 'SPRAWDŹ OFERTĘ'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DealZ Engine Diagnostics & Data Provenance Panel */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-xs text-slate-300 transition"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">DealZ Engine: Diagnostyka i Pochodzenie Danych (Data Provenance)</span>
                  {result.dealzRanking?.diagnostics?.providers && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-950 border border-emerald-800 text-emerald-300">
                      {result.dealzRanking.diagnostics.providers.filter(p => p.isConfigured).length} z {result.dealzRanking.diagnostics.providers.length} źródeł API aktywnych
                    </span>
                  )}
                </div>
                {showDiagnostics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showDiagnostics && (
                <div className="mt-2.5 p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-xs space-y-3 font-sans">
                  {/* Providers Table from ProviderRegistry */}
                  {result.dealzRanking?.diagnostics?.providers && result.dealzRanking.diagnostics.providers.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                        Status Adapterów Źródeł (ProviderRegistry):
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {result.dealzRanking.diagnostics.providers.map((p, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{p.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                                p.isConfigured 
                                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}>
                                {p.isConfigured ? 'Aktywny (zapytanie wykonane)' : 'Wyszukiwanie przez źródła pośrednie'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span>Czas: {p.latencyMs ?? 0} ms</span>
                              <span>Pobrane: {p.crawledCount} | Zweryfikowane: {p.verifiedCount} | Odrzucone: {p.rejectedCount}</span>
                            </div>
                            {p.health.lastError && (
                              <div className="text-[10px] text-rose-400 truncate">
                                Błąd: {p.health.lastError}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Breakdown & Identity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    {/* Left: Product Identity Resolver */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Product Identity Resolver (Tożsamość Produktu)</span>
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-1">
                        <div>Zidentyfikowano: <strong className="text-white">{result.targetProduct.title}</strong></div>
                        {result.dealzRanking?.recognizedProduct.brand && (
                          <div>Marka: <strong className="text-emerald-300">{result.dealzRanking.recognizedProduct.brand}</strong></div>
                        )}
                        {result.dealzRanking?.recognizedProduct.model && (
                          <div>Model: <strong className="text-emerald-300">{result.dealzRanking.recognizedProduct.model}</strong></div>
                        )}
                        <div>Pewność dopasowania AI: <strong className="text-white">{result.confidenceScore !== null ? `${result.confidenceScore}%` : 'Brak danych'}</strong></div>
                      </div>
                    </div>

                    {/* Right: Offer Verification Breakdown */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Offer Verification Engine (Statystyki Kandydatów)</span>
                      </div>
                      {result.dealzRanking?.diagnostics ? (
                        <div className="text-[11px] text-slate-400 space-y-1">
                          <div>Kandydaci ogółem: <strong className="text-white">{result.dealzRanking.diagnostics.totalCandidates}</strong></div>
                          <div>Z odczytaną ceną: <strong className="text-emerald-300">{result.dealzRanking.diagnostics.offersWithPrice}</strong></div>
                          <div>Zgodny wariant: <strong className="text-emerald-300">{result.dealzRanking.diagnostics.offersWithConfirmedVariant}</strong></div>
                          <div>W pełni zweryfikowane: <strong className="text-emerald-300">{result.dealzRanking.diagnostics.fullyVerifiedCount}</strong></div>
                          <div>Częściowa weryfikacja: <strong className="text-amber-300">{result.dealzRanking.diagnostics.partiallyVerifiedCount}</strong></div>
                          <div>Odrzucone kandydatury: <strong className="text-rose-400">{result.dealzRanking.diagnostics.rejectedCount}</strong></div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 space-y-1">
                          <div>Aktywne oferty rynkowe: <strong className="text-white">{result.similarDeals.length}</strong></div>
                          <div>Kalkulacja kosztu: <strong className="text-emerald-300">Cena + Koszt wysyłki (bez fikcyjnych zer)</strong></div>
                          <div>Wykrywanie duplikatów: <strong className="text-emerald-300">Aktywne (kanonizacja URL)</strong></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grounding sources links */}
                  {result.groundingSources && result.groundingSources.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                        Rzeczywiste źródła sieciowe (Google Search Grounding):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.groundingSources.slice(0, 6).map((src, i) => (
                          <a
                            key={i}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 hover:text-white flex items-center gap-1"
                          >
                            <span className="truncate max-w-[180px]">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
