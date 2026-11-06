/**
 * DEALZ D3.JS PRICE HISTORY CHART — ITERATION 2
 * ZERO FAKE DATA: Strictly renders genuine recorded historical observations.
 * When data has fewer than 2 points, explicitly communicates insufficient historical data.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TrendingDown, Sparkles, Calendar, Database, CheckCircle2 } from 'lucide-react';
import { PriceHistoryPoint } from '../types';

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[];
  currentPrice: number;
  currency?: string;
  isAllTimeLow?: boolean;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  data,
  currentPrice,
  currency = 'PLN',
  isAllTimeLow,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<PriceHistoryPoint | null>(null);

  const points = data || [];
  const hasSufficientHistory = points.length >= 2;

  const minPrice = points.length > 0 ? d3.min(points, (d) => d.price) || currentPrice : currentPrice;
  const maxPrice = points.length > 0 ? d3.max(points, (d) => d.price) || currentPrice : currentPrice;
  const avgPrice = points.length > 0 ? Math.round(d3.mean(points, (d) => d.price) || currentPrice) : currentPrice;
  const calculatedAllTimeLow = isAllTimeLow !== undefined ? isAllTimeLow : currentPrice <= minPrice * 1.01;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !hasSufficientHistory) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth || 600;
    const height = 240;
    const margin = { top: 25, right: 30, bottom: 35, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parsedData = points.map((d) => ({
      date: new Date(d.date),
      price: d.price,
      raw: d,
    }));

    const dateExtent = d3.extent(parsedData, (d) => d.date) as [Date, Date];

    const xScale = d3
      .scaleTime()
      .domain(dateExtent)
      .range([0, innerWidth]);

    const yMin = Math.max(0, minPrice * 0.95);
    const yMax = maxPrice * 1.05;

    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(4)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', '2,2');

    g.selectAll('.domain').remove();

    // Defs for gradients
    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'priceAreaGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.35);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.0);

    // Area
    const area = d3
      .area<{ date: Date; price: number }>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.price))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(parsedData)
      .attr('fill', 'url(#priceAreaGradient)')
      .attr('d', area);

    // Line generator
    const line = d3
      .line<{ date: Date; price: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.price))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(5, parsedData.length))
      .tickFormat((d) => d3.timeFormat('%d.%m')(d as Date));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => `${d} zł`);

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace');

    // Dots on every point
    g.selectAll('circle.point')
      .data(parsedData)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.price))
      .attr('r', 4.5)
      .attr('fill', '#10b981')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    // Overlay for hover
    const overlay = g
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    overlay.on('mousemove touchmove', function (event) {
      const [mouseX] = d3.pointer(event);
      const hoveredDate = xScale.invert(mouseX);
      const bisect = d3.bisector((d: { date: Date }) => d.date).center;
      const index = bisect(parsedData, hoveredDate);
      const selected = parsedData[index];
      if (selected) {
        setHoveredPoint(selected.raw);
      }
    });

    overlay.on('mouseleave touchend', function () {
      setHoveredPoint(null);
    });
  }, [points, hasSufficientHistory, minPrice, maxPrice]);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header & All-Time Low Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Historia Cen (Faktyczne Obserwacje) • D3.js
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tylko zweryfikowane pomiary cenowe zarejestrowane ze źródeł (zero sztucznych trendów).
          </p>
        </div>

        {hasSufficientHistory && calculatedAllTimeLow && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-extrabold shadow-sm animate-pulse">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>DOŁEK CENOWY (ALL-TIME LOW)</span>
          </div>
        )}
      </div>

      {!hasSufficientHistory ? (
        <div className="py-8 px-4 text-center bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2.5">
          <Database className="w-7 h-7 text-slate-500 mx-auto opacity-70" />
          <h4 className="text-sm font-bold text-slate-200">Brak wystarczających danych historycznych</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            DealZ nie generuje symulowanych wykresów ani sztucznych fal sinusoidalnych.
            Wykres pojawi się po zarejestrowaniu co najmniej 2 rzeczywistych pomiarów w czasie.
          </p>
          {points.length === 1 && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zanotowano 1 pomiar: {points[0].date} — {points[0].price} {currency}</span>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 30-Day Metric Strip */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Minimum:</span>
              <span className="text-cyan-400 font-mono font-bold text-sm">
                {minPrice.toLocaleString()} {currency}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Średnia:</span>
              <span className="text-slate-200 font-mono font-bold text-sm">
                {avgPrice.toLocaleString()} {currency}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Maksimum:</span>
              <span className="text-slate-400 font-mono font-bold text-sm">
                {maxPrice.toLocaleString()} {currency}
              </span>
            </div>
          </div>

          {/* Chart container */}
          <div ref={containerRef} className="relative w-full overflow-hidden">
            <svg ref={svgRef} className="w-full h-[240px]" />

            {/* Hovered point tooltip overlay */}
            {hoveredPoint && (
              <div className="absolute top-2 right-2 bg-slate-900/95 border border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs shadow-xl pointer-events-none font-mono">
                <div className="text-slate-400 text-[10px]">Data: {hoveredPoint.date}</div>
                <div className="text-white font-bold text-sm">
                  {hoveredPoint.price.toLocaleString()} {currency}
                </div>
                {hoveredPoint.event && (
                  <div className="text-emerald-400 text-[10px]">{hoveredPoint.event}</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
