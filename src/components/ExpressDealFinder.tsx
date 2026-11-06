import React, { useState, useRef } from 'react';
import { 
  Search, 
  ExternalLink, 
  Zap, 
  ShoppingBag,
  Camera,
  X,
  Cpu,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  Clock,
  Info
} from 'lucide-react';
import { InstantDealResult, SimilarDealItem } from '../types';
import { SearchMode, ProductAlternative, Offer } from '../types/dealz';

interface ExpressDealFinderProps {
  onSearch: (query: string, price?: string, imageBase64?: string | null, mode?: SearchMode) => Promise<void>;
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
  const [searchMode, setSearchMode] = useState<SearchMode>('exact');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [selectedDealsForComparison, setSelectedDealsForComparison] = useState<SimilarDealItem[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
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
      onSearch(query.trim() || 'Szukanie po zdjęciu', priceInput.trim() || undefined, base64, searchMode);
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
    onSearch(query.trim(), priceInput.trim() || undefined, imagePreview, searchMode);
  };

  const toggleDealSelection = (deal: SimilarDealItem) => {
    setSelectedDealsForComparison((prev) => {
      const exists = prev.some((d) => d.url === deal.url);
      if (exists) {
        return prev.filter((d) => d.url !== deal.url);
      } else {
        if (prev.length >= 4) {
          alert('Możesz wybrać maksymalnie 4 oferty do jednoczesnego porównania.');
          return prev;
        }
        return [...prev, deal];
      }
    });
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
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Wyszukiwarka Ofert i Zamienników DealZ
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Weryfikacja cen na żywo</span>
            <span aria-hidden="true">·</span>
            <span>Zero fikcyjnych ofert</span>
            <span aria-hidden="true">·</span>
            <span>Allegro, OLX, Ceneo & Amazon</span>
          </div>
        </div>

        {/* Search Mode Toggle Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSearchMode('exact')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              searchMode === 'exact'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Dokładny Model</span>
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('alternative')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              searchMode === 'alternative'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Znajdź Zamienniki</span>
          </button>
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
            <span className="text-amber-400 font-medium">
              ✓ Uruchomiono analizę wizualną Google Lens:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imagePreview)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition shadow-sm text-[11px]"
              >
                <span>Google Lens</span>
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
              placeholder={
                searchMode === 'exact'
                  ? 'Wpisz nazwę przedmiotu, np. iPhone 15 128GB, Bosch GSB 13 RE...'
                  : 'Szukaj alternatywy dla: Dreame T30, dysk SSD 1TB...'
              }
              className="w-full min-h-[48px] px-4 pl-11 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-medium transition"
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
              className="w-full h-full min-h-[48px] px-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-xl text-amber-400 flex items-center justify-center cursor-pointer transition shadow-sm"
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
              placeholder="Cena max (zł)"
              className="w-full min-h-[48px] px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono font-semibold"
            />
          </div>

          {/* Submit Search Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={(!query.trim() && !imagePreview) || isLoading}
              className="w-full min-h-[48px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Szukam...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>{searchMode === 'exact' ? 'Szukaj Ofert' : 'Szukaj Zamienników'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Selected for side-by-side comparison bar */}
      {selectedDealsForComparison.length > 0 && (
        <div className="p-3.5 bg-cyan-950/70 border border-cyan-800/80 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-cyan-200 font-bold">
              Zaznaczono {selectedDealsForComparison.length} oferty do porównania side-by-side
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowComparisonModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-sm text-xs"
            >
              Otwórz Macierz Porównawczą ({selectedDealsForComparison.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDealsForComparison([])}
              className="p-1.5 text-cyan-400 hover:text-cyan-200"
              title="Wyczyść zaznaczenie"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <div className="py-12 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80">
          <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">
            {imagePreview ? 'Google Lens analizuje zdjęcie i szuka w sklepach...' : 'Przeszukuję polski rynek e-commerce na żywo...'}
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Weryfikuję bezpośrednie oferty, warianty i ceny na Allegro, OLX, Ceneo i Amazon.pl.
          </p>
        </div>
      )}

      {/* RESULT SECTION */}
      {result && !isLoading && (
        <div className="space-y-5 pt-2">
          {/* Main Verdict Card */}
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
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Semantic Alternatives Section (Etap 3) */}
          {result.dealzRanking?.alternatives && result.dealzRanking.alternatives.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-800/80 space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Rekomendowane Rynkowe Zamienniki i Alternatywy ({result.dealzRanking.alternatives.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.dealzRanking.alternatives.map((alt: ProductAlternative, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {alt.brand} {alt.model}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        {alt.price ? `${alt.price} ${alt.currency}` : 'Sprawdź cenę'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{alt.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{alt.reasoning}</p>

                    <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                      <div><strong className="text-emerald-400">Podobieństwa:</strong> {alt.similarities.join(', ')}</div>
                      <div><strong className="text-amber-400">Różnice:</strong> {alt.differences.join(', ')}</div>
                    </div>

                    <a
                      href={alt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 pt-1"
                    >
                      <span>Sprawdź ten zamiennik w {alt.sourceName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offers List */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Rzeczywiste Oferty Rynkowe ({result.similarDeals.length})</span>
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Wybierz pola wyboru, aby porównać side-by-side</span>
            </div>

            <div className="space-y-2.5">
              {result.similarDeals.map((deal, idx) => {
                const vBadge = getVerificationBadge(deal.verificationStatus);
                const isVerified = deal.verificationStatus === 'verified';
                const isSelected = selectedDealsForComparison.some((d) => d.url === deal.url);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md'
                        : isVerified
                        ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox for side-by-side comparison */}
                      <button
                        type="button"
                        onClick={() => toggleDealSelection(deal)}
                        className="mt-1 text-slate-500 hover:text-cyan-400 transition"
                        title="Zaznacz do porównania side-by-side"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>

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
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        {deal.price !== null && deal.price > 0 ? (
                          <div className="text-base sm:text-lg font-extrabold font-mono text-white">
                            {deal.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">{deal.currency}</span>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/60">
                            Sprawdź cenę
                          </div>
                        )}
                      </div>

                      <a
                        href={deal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
                      >
                        <span>PRZEJDŹ</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Drawer/Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                Macierz Porównawcza Oferty Side-by-Side ({selectedDealsForComparison.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono">
                    <th className="p-3">Parametr</th>
                    {selectedDealsForComparison.map((d, i) => (
                      <th key={i} className="p-3 text-white font-bold">
                        Oferta #{i + 1} ({d.platform})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Tytuł</td>
                    {selectedDealsForComparison.map((d, i) => (
                      <td key={i} className="p-3 font-bold text-white">{d.title}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Cena Jednostkowa</td>
                    {selectedDealsForComparison.map((d, i) => (
                      <td key={i} className="p-3 font-mono font-bold text-emerald-400 text-sm">
                        {d.price ? `${d.price} ${d.currency}` : 'Brak danych'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Koszt Wysyłki</td>
                    {selectedDealsForComparison.map((d, i) => (
                      <td key={i} className="p-3">
                        {d.shippingCost === 0 ? 'Darmowa dostawa' : d.shippingCost ? `${d.shippingCost} zł` : 'Nieznany'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Stan Produktu</td>
                    {selectedDealsForComparison.map((d, i) => (
                      <td key={i} className="p-3">{d.condition}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Status Weryfikacji</td>
                    {selectedDealsForComparison.map((d, i) => (
                      <td key={i} className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getVerificationBadge(d.verificationStatus).color}`}>
                          {getVerificationBadge(d.verificationStatus).label}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Sprzedawca</td>
                    {selectedDealsForComparison.map((d, i) => (
                      <td key={i} className="p-3">{d.seller || d.platform}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-400">Link Bezpośredni</td>
                    {selectedDealsForComparison.map((d, i) => (
                      <td key={i} className="p-3">
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 font-bold hover:underline"
                        >
                          Otwórz ofertę <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Zamknij Macierz Porównawczą
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
