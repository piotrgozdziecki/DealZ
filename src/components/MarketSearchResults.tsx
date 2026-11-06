import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ExternalLink, 
  Globe, 
  RefreshCw,
  ArrowUpDown,
  ShoppingBag
} from 'lucide-react';
import { MarketSearchResult } from '../types';
import { VisualImageComparator } from './VisualImageComparator';

interface MarketSearchResultsProps {
  results: MarketSearchResult | null;
  onRefresh: () => void;
  isLoading: boolean;
  productName: string;
  originalImage?: string | null;
}

export const MarketSearchResults: React.FC<MarketSearchResultsProps> = ({
  results,
  onRefresh,
  isLoading,
  productName,
  originalImage,
}) => {
  const [sortByPrice, setSortByPrice] = useState<'default' | 'asc'>('default');
  const [isNewSearchPulse, setIsNewSearchPulse] = useState(false);

  // Trigger border glow pulse when results update
  useEffect(() => {
    if (results) {
      setIsNewSearchPulse(true);
      const timer = setTimeout(() => {
        setIsNewSearchPulse(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [results]);

  if (!results && !isLoading) {
    return null;
  }

  const extractPrice = (title: string): number => {
    const match = title.match(/(\d[\d\s,.]*)\s*(?:zł|pln)/i);
    if (match) {
      return parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
    }
    return 0;
  };

  const sources = results?.sources || [];
  const sortedSources = [...sources];
  if (sortByPrice === 'asc') {
    sortedSources.sort((a, b) => {
      const priceA = extractPrice(a.title);
      const priceB = extractPrice(b.title);
      if (priceA > 0 && priceB > 0) return priceA - priceB;
      return a.title.localeCompare(b.title);
    });
  }

  return (
    <div className={`bg-slate-900/95 border rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-2xl space-y-6 transition-all duration-700 ${
      isNewSearchPulse 
        ? 'border-cyan-500/80 shadow-[0_0_35px_rgba(6,182,212,0.35)]' 
        : 'border-slate-800/90 shadow-2xl'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Rynek na Żywo (Google Search Grounding)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300">
                gemini-3.8-flash
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Rzeczywiste aukcje i punkty cenowe z polskiego internetu (Allegro, OLX, Ceneo).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <button
              type="button"
              onClick={() => setSortByPrice(sortByPrice === 'default' ? 'asc' : 'default')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition backdrop-blur-md ${
                sortByPrice === 'asc'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortByPrice === 'asc' ? 'Cena: od najniższej' : 'Sortuj po cenie'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Odśwież rynek</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-300 font-medium">Przeszukiwanie aktualnych aukcji w sieci...</p>
          <p className="text-[11px] text-slate-400 mt-1">Sprawdzam Ceneo, Allegro, OLX dla: &quot;{productName}&quot;</p>
        </div>
      ) : results ? (
        <div className="space-y-6">
          {/* Formatted Text Content */}
          <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 whitespace-pre-line backdrop-blur-2xl shadow-inner">
            {results.text}
          </div>

          {/* Web Sources Grounding Links in Deep Space Glassmorphic Cards with dynamic border-glow */}
          {sortedSources.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                <span>Zweryfikowane aukcje i oferty w sieci ({sortedSources.length}):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedSources.slice(0, 8).map((source, idx) => {
                  const getVerificationData = (uri: string) => {
                    const lowUri = uri.toLowerCase();
                    if (lowUri.includes('allegro.pl')) {
                      return { verified: true, reason: 'Największy polski marketplace z ochroną kupującego (Allegro Protect) i systemem ocen sprzedawców.' };
                    }
                    if (lowUri.includes('olx.pl')) {
                      return { verified: true, reason: 'Rynek lokalny i wtórny z weryfikacją numeru telefonu oraz systemem bezpiecznych Przesyłek OLX.' };
                    }
                    if (lowUri.includes('ceneo.pl')) {
                      return { verified: true, reason: 'Największa polska porównywarka cen agregująca oferty wyłącznie ze zweryfikowanych sklepów internetowych.' };
                    }
                    if (lowUri.includes('amazon.pl')) {
                      return { verified: true, reason: 'Globalny lider e-commerce z rygorystyczną polityką zwrotów i certyfikowanymi sprzedawcami zewnętrznymi.' };
                    }
                    const topStores = ['mediaexpert.pl', 'euro.com.pl', 'x-kom.pl', 'morele.net', 'rtveuroagd.pl', 'komputronik.pl'];
                    if (topStores.some(store => lowUri.includes(store))) {
                      return { verified: true, reason: 'Oficjalna dystrybucja w Polsce. Gwarancja fabryczna, serwis lokalny i pewność oryginalności produktu.' };
                    }
                    return { verified: false, reason: 'Źródło zewnętrzne wymagające manualnej weryfikacji reputacji sprzedawcy przed zakupem.' };
                  };

                  // Heuristic for stock status if not provided by API
                  const vData = getVerificationData(source.uri);
                  const isVerified = source.isVerified ?? vData.verified;
                  const reason = source.verificationReason ?? vData.reason;

                  // Heuristic for stock status if not provided by API
                  const getStockStatus = (title: string): { status: 'in_stock' | 'out_of_stock' | 'unknown', confidence: number } => {
                    const lowTitle = title.toLowerCase();
                    if (lowTitle.includes('brak') || lowTitle.includes('archiwalna') || lowTitle.includes('sprzedane')) return { status: 'out_of_stock', confidence: 95 };
                    if (lowTitle.includes('dostępny') || lowTitle.includes('w magazynie') || lowTitle.includes('kup teraz')) return { status: 'in_stock', confidence: 85 };
                    return { status: 'unknown', confidence: 0 };
                  };

                  const stockResult = source.availabilityStatus 
                    ? { status: source.availabilityStatus, confidence: 100 } 
                    : getStockStatus(source.title);
                  
                  const stockStatus = stockResult.status;
                  const isThirdParty = !['allegro.pl', 'olx.pl', 'ceneo.pl', 'amazon.pl'].some(d => source.uri.toLowerCase().includes(d));

                  return (
                    <div key={idx} className="relative group/source">
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900/95 border text-xs text-slate-200 transition-all duration-500 flex items-center justify-between gap-3 group shadow-2xl backdrop-blur-2xl h-full ${
                          isNewSearchPulse 
                            ? 'border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.25)] translate-y-[-2px]' 
                            : 'border-slate-800/90 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                        }`}
                      >
                        <div className="space-y-1.5 overflow-hidden flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-bold text-white group-hover:text-cyan-300 truncate block transition">
                              {source.title || 'Oferta w sieci'}
                            </span>
                            {isVerified && (
                              <span 
                                className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/40 uppercase tracking-tighter"
                                title="Zweryfikowane źródło"
                              >
                                VET
                              </span>
                            )}
                            {stockStatus !== 'unknown' && (
                              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${stockStatus === 'in_stock' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${stockStatus === 'in_stock' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                                {stockStatus === 'in_stock' ? 'DOSTĘPNY' : 'BRAK TOWARU'}
                                {isThirdParty && (
                                  <span className="ml-1 text-[8px] opacity-70 border-l border-current pl-1" title={`Confidence: ${stockResult.confidence}%`}>
                                    {stockResult.confidence}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono truncate block">
                            {source.uri}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition shadow-inner">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </a>

                      {/* Verification Rationale Popup (on Hover) */}
                      <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl invisible group-hover/source:visible opacity-0 group-hover/source:opacity-100 transition-all duration-300 z-50 pointer-events-none">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Weryfikacja rzetelności</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed italic">
                          "{reason}"
                        </p>
                        <div className="absolute -bottom-1 left-6 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 transform rotate-45" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visual Image Comparison using Canvas Overlay */}
          <VisualImageComparator
            originalImageBase64={originalImage}
            productName={productName}
          />
        </div>
      ) : null}
    </div>
  );
};
