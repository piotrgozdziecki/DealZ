/**
 * DEALZ RECHARTS PRICE TREND COMPONENT — ITERATION 2
 * ZERO FAKE DATA: Strictly renders genuine recorded historical observations.
 * When data has fewer than 2 points, explicitly communicates insufficient historical data.
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TrendingDown, TrendingUp, Calendar, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { PriceHistoryPoint } from '../types';

interface RechartsPriceTrendProps {
  data?: PriceHistoryPoint[];
  currentPrice: number;
  fairMarketPrice?: number;
  productName: string;
  currency?: string;
}

export const RechartsPriceTrend: React.FC<RechartsPriceTrendProps> = ({
  data,
  currentPrice,
  fairMarketPrice,
  productName,
  currency = 'PLN',
}) => {
  const [chartType, setChartType] = useState<'area' | 'line'>('area');

  // Strict: only use real provided data points
  const points = data || [];
  const hasSufficientHistory = points.length >= 2;

  const chartData = useMemo(() => {
    return points.map((pt) => {
      return {
        date: pt.date,
        displayDate: pt.date.slice(5).replace('-', '.'),
        price: pt.price,
        event: pt.event,
        myPrice: currentPrice > 0 ? currentPrice : undefined,
      };
    });
  }, [points, currentPrice]);

  const minHistPrice = points.length > 0 ? Math.min(...points.map((d) => d.price)) : currentPrice;
  const maxHistPrice = points.length > 0 ? Math.max(...points.map((d) => d.price)) : currentPrice;
  const avgHistPrice = points.length > 0
    ? Math.round(points.reduce((acc, d) => acc + d.price, 0) / points.length)
    : currentPrice;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-emerald-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-sans space-y-1.5 min-w-[200px]">
          <div className="text-slate-400 font-mono text-[11px] pb-1 border-b border-slate-800 flex justify-between items-center">
            <span>Data: {pData.date}</span>
            {pData.event && <span className="text-emerald-400 font-bold">{pData.event}</span>}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Cena zanotowana:</span>
            <span className="text-white font-mono font-bold">{pData.price.toLocaleString()} {currency}</span>
          </div>

          {currentPrice > 0 && (
            <div className="pt-1 border-t border-slate-800 flex justify-between items-center">
              <span className="text-cyan-300 font-bold">Twoja oferta:</span>
              <span className="text-cyan-400 font-mono font-extrabold">{currentPrice.toLocaleString()} {currency}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Historia Cen (Zweryfikowane Obserwacje)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                Faktyczne Pomiary
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zarejestrowane historyczne punkty cenowe dla: <strong className="text-slate-200">{productName}</strong>
          </p>
        </div>

        {hasSufficientHistory && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  chartType === 'area' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Obszar
              </button>
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  chartType === 'line' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Linia
              </button>
            </div>
          </div>
        )}
      </div>

      {!hasSufficientHistory ? (
        <div className="py-10 px-4 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
          <Database className="w-8 h-8 text-slate-500 mx-auto opacity-70" />
          <h4 className="text-sm font-bold text-slate-200">Brak wystarczających danych historycznych</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Zgodnie z zasadą <strong>ZERO ZMYŚLANIA DANYCH</strong>, DealZ nie generuje symulowanych wykresów ani sztucznych fal sinusoidalnych.
            Wykres trendu pojawi się automatycznie, gdy system zarejestruje co najmniej 2 rzeczywiste obserwacje w czasie.
          </p>
          {points.length === 1 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zarejestrowano 1 pomiar: {points[0].date} — {points[0].price} {currency}</span>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Zarejestrowane minimum:</span>
              <span className="text-emerald-400 font-mono font-bold text-base">
                {minHistPrice.toLocaleString()} {currency}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Średnia z pomiarów:</span>
              <span className="text-white font-mono font-bold text-base">
                {avgHistPrice.toLocaleString()} {currency}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Zarejestrowane maksimum:</span>
              <span className="text-slate-300 font-mono font-bold text-base">
                {maxHistPrice.toLocaleString()} {currency}
              </span>
            </div>
          </div>

          {/* Recharts Chart Area */}
          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rechartsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="displayDate" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#rechartsAreaGradient)"
                  />
                  {currentPrice > 0 && (
                    <ReferenceLine y={currentPrice} stroke="#06b6d4" strokeDasharray="4 4" label={{ value: 'Bieżąca', fill: '#06b6d4', fontSize: 10 }} />
                  )}
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="displayDate" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};
