import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sliders, 
  Eye, 
  Flame, 
  Layers, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Upload, 
  RotateCcw, 
  ShieldAlert, 
  Info,
  Maximize2
} from 'lucide-react';

interface VisualImageComparatorProps {
  originalImageBase64?: string | null;
  productName: string;
}

// Preset reference images (vector SVGs rendered to image data) demonstrating real vs altered listings
const createSampleImage = (type: 'original' | 'fake' | 'stock', label: string, details: string[]): string => {
  const bg = type === 'original' ? '#1e293b' : type === 'fake' ? '#0f172a' : '#111827';
  const accent = type === 'original' ? '#10b981' : type === 'fake' ? '#ef4444' : '#3b82f6';
  const tagColor = type === 'original' ? '#059669' : type === 'fake' ? '#dc2626' : '#2563eb';
  
  // SVG with realistic product silhouette, camera bump, serial number, and texture
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="${bg}"/>
    <defs>
      <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="metal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#64748b"/>
        <stop offset="50%" stop-color="#475569"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
    </defs>
    
    <!-- Phone / Device chassis -->
    <rect x="180" y="40" width="240" height="320" rx="28" fill="url(#metal)" stroke="${accent}" stroke-width="3"/>
    <rect x="192" y="52" width="216" height="296" rx="20" fill="url(#screenGrad)"/>
    
    <!-- Camera Island -->
    <rect x="205" y="65" width="85" height="95" rx="16" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <circle cx="230" cy="90" r="16" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
    <circle cx="230" cy="90" r="8" fill="#0284c7"/>
    <circle cx="265" cy="115" r="14" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
    <circle cx="265" cy="115" r="6" fill="#0284c7"/>
    <circle cx="230" cy="135" r="12" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
    
    <!-- Screen display / Brand -->
    <text x="300" y="210" fill="#f8fafc" font-size="18" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">
      ${label}
    </text>
    
    <!-- CE & Serial marking -->
    ${type === 'fake' 
      ? `<!-- Tampered / Edited region: Blurred CE logo and missing barcode -->
         <rect x="240" y="295" width="120" height="25" fill="#ef4444" opacity="0.3" rx="4"/>
         <text x="300" y="312" fill="#ef4444" font-size="11" font-family="monospace" text-anchor="middle">⚠️ RETUSZ / ZAMAZANE CE</text>` 
      : `<!-- Genuine regulatory stamp -->
         <text x="300" y="310" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif" text-anchor="middle">CE 2200 • Model PL/A • S/N: Y4810X92</text>`
    }
    
    <!-- Lighting artifact / scratch if altered -->
    ${type === 'fake' 
      ? `<path d="M 330 140 Q 370 170 350 240" stroke="#f43f5e" stroke-width="4" stroke-dasharray="4,4" fill="none"/>
         <circle cx="340" cy="180" r="18" fill="none" stroke="#f43f5e" stroke-width="2"/>
         <text x="375" y="185" fill="#f43f5e" font-size="10" font-family="sans-serif">Wymazana rysa</text>` 
      : ''
    }

    <!-- Label Pill -->
    <rect x="20" y="20" width="160" height="30" rx="8" fill="${tagColor}"/>
    <text x="100" y="40" fill="#ffffff" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">
      ${type === 'original' ? 'Oryginał Producenta' : type === 'fake' ? 'Podejrzana Oferta' : 'Wzornik Rynkowy'}
    </text>

    <!-- Diagnostics text -->
    <text x="30" y="375" fill="#94a3b8" font-size="11" font-family="sans-serif">
      ${details.join(' • ')}
    </text>
  </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

type CompareMode = 'slider' | 'heatmap' | 'blink' | 'side-by-side';

export const VisualImageComparator: React.FC<VisualImageComparatorProps> = ({
  originalImageBase64,
  productName,
}) => {
  // State for user image or selected preset
  const [userImage, setUserImage] = useState<string | null>(originalImageBase64 || null);
  const [referencePreset, setReferencePreset] = useState<'official' | 'suspicious' | 'market'>('suspicious');
  const [customRefImage, setCustomRefImage] = useState<string | null>(null);

  const [mode, setMode] = useState<CompareMode>('heatmap');
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0-100
  const [sensitivity, setSensitivity] = useState<number>(35); // 10-80
  const [blinkState, setBlinkState] = useState<'A' | 'B'>('A');
  const [anomalyStats, setAnomalyStats] = useState<{
    similarityPct: number;
    differencePixels: number;
    tamperedRegions: number;
    hasWatermarkTampering: boolean;
  }>({
    similarityPct: 91,
    differencePixels: 1420,
    tamperedRegions: 2,
    hasWatermarkTampering: true,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync if originalImageBase64 changes from parent props
  useEffect(() => {
    if (originalImageBase64) {
      setUserImage(originalImageBase64);
    }
  }, [originalImageBase64]);

  // Generate reference image based on preset or user upload
  const referenceImageSrc = customRefImage || (
    referencePreset === 'official'
      ? createSampleImage('original', productName || 'Oficjalny Egzemplarz', ['Czyste logo', 'Zgodne oznaczenia CE', 'Fabryczna matryca aparatów'])
      : referencePreset === 'suspicious'
      ? createSampleImage('fake', productName || 'Oferta ze Zmianami', ['Zamazany numer seryjny', 'Zamaskowana rysa', 'Niezgodny odcień szkła'])
      : createSampleImage('stock', productName || 'Zdjęcie Katalogowe', ['Brak fizycznych cech', 'Neutralne tło', 'Render 3D'])
  );

  const primaryImageSrc = userImage || createSampleImage('original', productName || 'Zdjęcie z Badanej Aukcji', ['Zdjęcie zgłoszone przez użytkownika', 'Analiza cech fizycznych']);

  // Canvas processing: compute pixel differences and overlay
  const renderComparisonCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgA = new Image();
    const imgB = new Image();
    imgA.crossOrigin = 'anonymous';
    imgB.crossOrigin = 'anonymous';

    let loadedCount = 0;
    const onBothLoaded = () => {
      loadedCount++;
      if (loadedCount < 2) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (mode === 'slider') {
        // Draw image B (reference) on full canvas
        ctx.drawImage(imgB, 0, 0, width, height);

        // Draw image A (original) clipped by sliderPos
        const clipWidth = (width * sliderPos) / 100;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, clipWidth, height);
        ctx.clip();
        ctx.drawImage(imgA, 0, 0, width, height);
        ctx.restore();

        // Draw separator line
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(clipWidth, 0);
        ctx.lineTo(clipWidth, height);
        ctx.stroke();

        // Draw handle circle
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(clipWidth, height / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◀ ▶', clipWidth, height / 2);

      } else if (mode === 'blink') {
        const currentImg = blinkState === 'A' ? imgA : imgB;
        ctx.drawImage(currentImg, 0, 0, width, height);

        // Stamp indicator
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(15, 15, 160, 28);
        ctx.fillStyle = blinkState === 'A' ? '#10b981' : '#06b6d4';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillText(blinkState === 'A' ? '● ZDJĘCIE A (Aukcja)' : '○ ZDJĘCIE B (Referencja)', 25, 33);

      } else if (mode === 'heatmap') {
        // Draw base image A
        ctx.drawImage(imgA, 0, 0, width, height);

        // Offscreen canvas for B to extract pixel arrays
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return;

        offCtx.drawImage(imgB, 0, 0, width, height);

        const dataA = ctx.getImageData(0, 0, width, height);
        const dataB = offCtx.getImageData(0, 0, width, height);

        const pixelsA = dataA.data;
        const pixelsB = dataB.data;
        const totalPixels = width * height;
        let diffCount = 0;

        // Overlay heatmap data
        const thresh = sensitivity * 2.5;

        for (let i = 0; i < pixelsA.length; i += 4) {
          const rDiff = Math.abs(pixelsA[i] - pixelsB[i]);
          const gDiff = Math.abs(pixelsA[i + 1] - pixelsB[i + 1]);
          const bDiff = Math.abs(pixelsA[i + 2] - pixelsB[i + 2]);
          const delta = (rDiff + gDiff + bDiff) / 3;

          if (delta > thresh) {
            diffCount++;
            // Paint neon magenta/crimson anomaly aura
            pixelsA[i] = 244;     // R
            pixelsA[i + 1] = 63;  // G
            pixelsA[i + 2] = 94;  // B
            pixelsA[i + 3] = Math.min(240, 120 + delta * 1.5); // Alpha intensity
          }
        }

        ctx.putImageData(dataA, 0, 0);

        // Update anomaly calculations
        const diffRatio = diffCount / totalPixels;
        const similarity = Math.max(10, Math.min(99.5, Math.round((1 - diffRatio * 1.8) * 100)));
        setAnomalyStats({
          similarityPct: similarity,
          differencePixels: diffCount,
          tamperedRegions: diffRatio > 0.08 ? 3 : diffRatio > 0.03 ? 2 : diffRatio > 0.005 ? 1 : 0,
          hasWatermarkTampering: diffCount > 800,
        });

      } else if (mode === 'side-by-side') {
        const halfWidth = width / 2;
        ctx.drawImage(imgA, 0, 0, halfWidth, height);
        ctx.drawImage(imgB, halfWidth, 0, halfWidth, height);

        // Dividing border
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(halfWidth, 0);
        ctx.lineTo(halfWidth, height);
        ctx.stroke();

        // Labels
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(10, 10, 140, 24);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('A: Badana Oferta', 20, 26);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(halfWidth + 10, 10, 150, 24);
        ctx.fillStyle = '#06b6d4';
        ctx.fillText('B: Wzornik Rynkowy', halfWidth + 20, 26);
      }
    };

    imgA.onload = onBothLoaded;
    imgB.onload = onBothLoaded;
    imgA.src = primaryImageSrc;
    imgB.src = referenceImageSrc;
  }, [mode, sliderPos, sensitivity, blinkState, primaryImageSrc, referenceImageSrc]);

  // Blink interval toggle when in blink mode
  useEffect(() => {
    if (mode !== 'blink') return;
    const interval = setInterval(() => {
      setBlinkState((prev) => (prev === 'A' ? 'B' : 'A'));
    }, 450);
    return () => clearInterval(interval);
  }, [mode]);

  // Re-render canvas whenever parameters change
  useEffect(() => {
    renderComparisonCanvas();
  }, [renderComparisonCanvas]);

  // Mouse / Touch Slider handlers
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'slider') return;
    isDraggingRef.current = true;
    handleSliderMove(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || mode !== 'slider') return;
    handleSliderMove(e.clientX);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (mode !== 'slider' || !e.touches[0]) return;
    handleSliderMove(e.touches[0].clientX);
  };

  // Upload custom user image
  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setUserImage(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Wizualna Weryfikacja Zdjęć (Forensic Image Diff)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300">
                Wykrywanie Retuszu & Podróbek
              </span>
            </h4>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Porównaj zdjęcie oferty z oryginałem lub wzornikiem za pomocą nakładki Canvas. Wykrywa usunięte rysy, zamazane numery seryjne i fotomontaże.
          </p>
        </div>

        {/* Upload Custom Photo Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCustomUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 font-semibold flex items-center gap-1.5 transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-rose-400" />
            <span>Wgraj inne zdjęcie</span>
          </button>
        </div>
      </div>

      {/* Mode Select Tabs & Sensitivity Slider */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-xs">
        {/* Modes */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setMode('heatmap')}
            className={`min-h-[36px] px-3 rounded-lg font-bold flex items-center gap-1.5 transition ${
              mode === 'heatmap'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Mapa Anomalii (Heatmap)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('slider')}
            className={`min-h-[36px] px-3 rounded-lg font-bold flex items-center gap-1.5 transition ${
              mode === 'slider'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Przesuwak (Wipe)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('blink')}
            className={`min-h-[36px] px-3 rounded-lg font-bold flex items-center gap-1.5 transition ${
              mode === 'blink'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Stroboskop (Blink)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('side-by-side')}
            className={`min-h-[36px] px-3 rounded-lg font-bold flex items-center gap-1.5 transition ${
              mode === 'side-by-side'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Obok Siebie</span>
          </button>
        </div>

        {/* Sensitivity slider (active in heatmap mode) */}
        {mode === 'heatmap' && (
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="text-slate-400 text-[11px] font-medium">Czułość detekcji:</span>
            <input
              type="range"
              min="10"
              max="70"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <span className="font-mono text-rose-400 font-bold text-[11px]">{sensitivity}%</span>
          </div>
        )}
      </div>

      {/* Preset Reference Selector */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium text-[11px]">Porównaj ofertę z:</span>
        <button
          type="button"
          onClick={() => { setReferencePreset('suspicious'); setCustomRefImage(null); }}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
            referencePreset === 'suspicious' && !customRefImage
              ? 'bg-rose-950/70 border-rose-600 text-rose-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚠️ Test Wykrywania (Ukryta rysa & zamazany numer)
        </button>

        <button
          type="button"
          onClick={() => { setReferencePreset('official'); setCustomRefImage(null); }}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
            referencePreset === 'official' && !customRefImage
              ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          ✓ Fabryczny Wzornik Producenta
        </button>

        <button
          type="button"
          onClick={() => { setReferencePreset('market'); setCustomRefImage(null); }}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
            referencePreset === 'market' && !customRefImage
              ? 'bg-blue-950/70 border-blue-600 text-blue-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          📸 Typowe Zdjęcie Katalogowe
        </button>
      </div>

      {/* Interactive Canvas Viewer Area */}
      <div
        ref={sliderContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        className="relative w-full aspect-[16/10] max-h-[420px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 cursor-crosshair select-none flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={380}
          className="w-full h-full object-contain block"
        />

        {/* Floating guidance overlay */}
        {mode === 'slider' && (
          <div className="absolute bottom-2 left-2 right-2 text-center pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-emerald-300 font-mono text-[10px] shadow-lg">
              Przesuwaj w lewo/prawo aby porównać warstwy zdjęć
            </span>
          </div>
        )}

        {mode === 'heatmap' && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-700/80 text-rose-300 text-[10px] font-bold flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Różnice zaznaczone kolorem neonowym</span>
            </div>
          </div>
        )}
      </div>

      {/* Forensic Diagnostics & Anomaly Score Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Zgodność pikselowa:</span>
          <span className={`font-mono font-extrabold text-base ${
            anomalyStats.similarityPct > 85 ? 'text-emerald-400' : anomalyStats.similarityPct > 70 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {anomalyStats.similarityPct}%
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Wykryte modyfikacje:</span>
          <span className={`font-mono font-bold text-sm ${
            anomalyStats.tamperedRegions > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {anomalyStats.tamperedRegions} {anomalyStats.tamperedRegions === 1 ? 'strefa' : 'strefy'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Rozbieżność matrycy:</span>
          <span className="text-slate-200 font-mono font-bold text-sm">
            {anomalyStats.differencePixels.toLocaleString()} px
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Wskaźnik autentyczności:</span>
          <span className="text-cyan-400 font-semibold text-xs flex items-center gap-1 mt-0.5">
            {anomalyStats.tamperedRegions > 1 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300">Wymaga weryfikacji</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Spójne z normą</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Forensic Findings Explanation */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-white block">
            Wnioski z analizy graficznej:
          </span>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {anomalyStats.tamperedRegions > 0 
              ? `Wykryto ${anomalyStats.tamperedRegions} obszary o nienaturalnym kontraście lub rozmyciu krawędzi (zaznaczone na czerwono). Zwróć szczególną uwagę na spójność oznaczeń CE/modelu oraz brak wyretuszowanych uszkodzeń obudowy przed przelaniem środków.`
              : 'Nie wykryto agresywnego retuszu ani manipulacji pikseli. Egzemplarz wykazuje zgodność geometryczną i kolorystyczną z bazowym wzorcem.'}
          </p>
        </div>
      </div>
    </div>
  );
};
