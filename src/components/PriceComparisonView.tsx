import React, { useState } from 'react';
import { 
  ShoppingBag, 
  ExternalLink, 
  Check, 
  Sparkles, 
  ArrowUpDown, 
  ShieldCheck, 
  Truck, 
  Star, 
  RefreshCw,
  TrendingDown,
  Layers
} from 'lucide-react';
import { PriceComparisonData, ComparisonStore } from '../types';
import { PriceHistoryChart } from './PriceHistoryChart';

interface PriceComparisonViewProps {
  data: PriceComparisonData | null;
  isLoading: boolean;
  onRefreshComparison: () => void;
  productName: string;
}

export const PriceComparisonView: React.FC<PriceComparisonViewProps> = ({
  data,
  isLoading,
  onRefreshComparison,
  productName,
}) => {
  const [filter, setFilter] = useState<'all' | 'new' | 'free_shipping'>('all');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc'>('price_asc');

  if (isLoading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm text-center py-12">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <h4 className="text-sm font-bold text-white">Porównywanie Cen na Rynku Polskim...</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Przeszukuję Allegro, Ceneo, Amazon.pl i OLX w czasie rzeczywistym dla: &quot;{productName}&quot;
        </p>
      </div>
    );
  }

  if (!data || !data.stores || data.stores.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm text-center py-8">
        <ShoppingBag className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-300">Brak Danych Porównywarki</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Wprowadź produkt i kliknij &quot;Uruchom Porównywarkę Cen&quot;, aby sprawdzić oferty z Allegro, Ceneo, Amazonu i OLX.
        </p>
        <button
          type="button"
          onClick={onRefreshComparison}
          className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-600/20"
        >
          Sprawdź Ceny w Sklepach
        </button>
      </div>
    );
  }

  // Filter and sort stores
  const filteredStores = data.stores
    .filter((s) => {
      if (filter === 'new') return s.condition.toLowerCase().includes('nowy');
      if (filter === 'free_shipping') return s.shipping.toLowerCase().includes('darmowa') || s.shipping.toLowerCase().includes('0 zł') || s.shipping.toLowerCase().includes('smart') || s.shipping.toLowerCase().includes('prime');
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      return b.price - a.price;
    });

  const getPlatformBadge = (platform: ComparisonStore['platform']) => {
    switch (platform) {
      case 'Allegro':
        return 'bg-orange-950/70 text-orange-300 border-orange-800/80';
      case 'Ceneo':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-800/80';
      case 'Amazon.pl':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/80';
      case 'OLX':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Porównywarka Cen Sklepów
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  Allegro • Ceneo • Amazon • OLX
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Rzeczywiste oferty z polskiego internetu uporządkowane od najtańszej.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshComparison}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Odśwież ceny</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Najniższa cena (Lider):</span>
          <span className="text-emerald-400 font-mono font-extrabold text-base sm:text-lg">
            {data.bestPrice.toLocaleString()} PLN
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Średnia na rynku:</span>
          <span className="text-slate-200 font-mono font-bold text-base sm:text-lg">
            {data.averagePrice.toLocaleString()} PLN
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Najdroższy sklep:</span>
          <span className="text-slate-400 font-mono font-bold text-base sm:text-lg">
            {data.worstPrice.toLocaleString()} PLN
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Maksymalna oszczędność:</span>
          <span className="text-cyan-400 font-mono font-extrabold text-base sm:text-lg flex items-center gap-1">
            <TrendingDown className="w-4 h-4" />
            do {data.savingsVsHighest.toLocaleString()} PLN
          </span>
        </div>
      </div>

      {/* D3.js 30-Day Historical Price Trend Line Chart */}
      <PriceHistoryChart
        data={data.priceHistory30d || []}
        currentPrice={data.bestPrice}
        currency="PLN"
        isAllTimeLow={data.isAllTimeLow}
      />

      {/* 1-Click Live Market Explore Bar */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Otwórz oferty w czasie rzeczywistym (posortowane od najniższej ceny):
          </span>
          <span className="hidden sm:inline text-slate-500">100% autentyczne linki</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <a
            href={`https://allegro.pl/listing?string=${encodeURIComponent(productName)}&order=p`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] px-3 py-2 rounded-lg bg-orange-950/60 hover:bg-orange-900/60 border border-orange-700/60 text-orange-200 font-semibold flex items-center justify-center gap-1.5 transition text-[11px]"
          >
            <span>Allegro (Na żywo)</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={`https://www.olx.pl/oferty/q-${encodeURIComponent(productName).replace(/%20/g, '-')}/?search%5Border%5D=filter_float_price%3Aasc`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] px-3 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-semibold flex items-center justify-center gap-1.5 transition text-[11px]"
          >
            <span>OLX (Przesyłka)</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={`https://www.ceneo.pl/;szukaj-${encodeURIComponent(productName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] px-3 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-200 font-semibold flex items-center justify-center gap-1.5 transition text-[11px]"
          >
            <span>Ceneo (100+ sklepów)</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={`https://www.amazon.pl/s?k=${encodeURIComponent(productName)}&s=price-asc-rank`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] px-3 py-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 text-amber-200 font-semibold flex items-center justify-center gap-1.5 transition text-[11px]"
          >
            <span>Amazon.pl Prime</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[36px] px-3 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-slate-800 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Wszystkie ({data.stores.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('new')}
            className={`min-h-[36px] px-3 rounded-lg font-medium transition ${
              filter === 'new'
                ? 'bg-slate-800 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tylko Nowe
          </button>
          <button
            type="button"
            onClick={() => setFilter('free_shipping')}
            className={`min-h-[36px] px-3 rounded-lg font-medium transition ${
              filter === 'free_shipping'
                ? 'bg-slate-800 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Darmowa Dostawa
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSortBy(sortBy === 'price_asc' ? 'price_desc' : 'price_asc')}
          className="min-h-[36px] flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium transition"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>{sortBy === 'price_asc' ? 'Cena: Od najniższej' : 'Cena: Od najwyższej'}</span>
        </button>
      </div>

      {/* Stores List: Mobile Card View on small screens (<768px), Table on desktop (>=768px) */}
      <div className="space-y-3">
        {/* Mobile Cards (Shown on mobile, hidden on md+) */}
        <div className="md:hidden space-y-2.5">
          {filteredStores.map((store, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition ${
                store.isBestPrice
                  ? 'bg-cyan-950/30 border-cyan-500/40 shadow-md'
                  : 'bg-slate-950/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPlatformBadge(store.platform)}`}>
                    {store.platform}
                  </span>
                  <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                    {store.seller}
                  </span>
                </div>

                {store.isBestPrice && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Najtaniej
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between mt-3">
                <div>
                  <div className="text-lg font-extrabold font-mono text-white">
                    {store.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">{store.currency}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-slate-500" />
                    <span>{store.shipping}</span>
                  </div>
                </div>

                <a
                  href={store.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shrink-0"
                >
                  <span>Przejdź</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Stan: <strong className="text-slate-300">{store.condition}</strong></span>
                <span>{store.availability || 'Dostępne'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (Hidden on mobile, shown on md+) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Platforma / Sklep</th>
                <th className="py-3 px-4">Stan</th>
                <th className="py-3 px-4">Dostawa</th>
                <th className="py-3 px-4">Dostępność</th>
                <th className="py-3 px-4 text-right">Cena</th>
                <th className="py-3 px-4 text-right">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {filteredStores.map((store, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/40 transition ${
                    store.isBestPrice ? 'bg-cyan-950/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPlatformBadge(store.platform)}`}>
                      {store.platform}
                    </span>
                    <span className="text-slate-200">{store.seller}</span>
                    {store.isBestPrice && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        HIT
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{store.condition}</td>
                  <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1.5 pt-4">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />
                    <span>{store.shipping}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{store.availability || 'Dostępne'}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-white">
                    {store.price.toLocaleString()} {store.currency}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={store.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white font-semibold transition"
                    >
                      <span>Oferta</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Verdict note */}
      {data.marketVerdict && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white font-semibold">Werdykt Porównywarki: </strong>
            {data.marketVerdict}
          </div>
        </div>
      )}
    </div>
  );
};
