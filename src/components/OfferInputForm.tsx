import React, { useState, useRef } from 'react';
import { 
  Link2, 
  Upload, 
  Sparkles, 
  Zap, 
  Search, 
  X, 
  Image as ImageIcon, 
  Tag, 
  Coins, 
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';
import { OfferInput } from '../types';

interface OfferInputFormProps {
  input: OfferInput;
  setInput: React.Dispatch<React.SetStateAction<OfferInput>>;
  onStartDeepAnalysis: () => void;
  onStartQuickScan: () => void;
  onStartQuickCompare?: () => void;
  isLoadingDeep: boolean;
  isLoadingQuick: boolean;
  isLoadingComparison?: boolean;
  lang: 'pl' | 'en';
}

export const OfferInputForm: React.FC<OfferInputFormProps> = ({
  input,
  setInput,
  onStartDeepAnalysis,
  onStartQuickScan,
  onStartQuickCompare,
  isLoadingDeep,
  isLoadingQuick,
  isLoadingComparison,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
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
      setInput((prev) => ({
        ...prev,
        imageBase64: base64,
        imageMimeType: file.type,
        // If title is empty, give a default prompt
        title: prev.title || 'Produkt ze zrzutu ekranu / zdjęcia',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setInput((prev) => ({
      ...prev,
      imageBase64: null,
      imageMimeType: 'image/jpeg',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isFormValid = Boolean(input.title.trim() || input.url.trim() || input.imageBase64);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-5 sm:p-7 relative overflow-hidden backdrop-blur-sm">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Live Market Grounding Status Bar */}
      <div className="mb-6 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold text-white">
            100% Weryfikacja na Żywo (Google Search Grounding):
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Wklej link lub wpisz dowolny produkt – sprawdzimy aktywne aukcje Allegro, OLX, Ceneo i Amazon.pl.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 shrink-0">
          Zero sztucznych danych
        </span>
      </div>

      {/* Tabs: Text/URL vs Image Upload */}
      <div className="flex border-b border-slate-800 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeTab === 'text'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2 className="w-4 h-4" />
          {lang === 'pl' ? 'Link lub Dane Oferty' : 'Link or Offer Details'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('image')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeTab === 'image'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          {lang === 'pl' ? 'Zdjęcie / Zrzut ekranu (Gemini 4 Vision)' : 'Screenshot / Photo (Gemini 4 Vision)'}
          {input.imageBase64 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {activeTab === 'image' && (
          <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-center">
            {imagePreview ? (
              <div className="relative inline-block max-w-full">
                <img
                  src={imagePreview}
                  alt="Podgląd oferty"
                  className="max-h-64 rounded-lg object-contain border border-slate-700 shadow-md mx-auto"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-3 -right-3 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg transition"
                  title="Usuń zdjęcie"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="mt-2 text-xs text-emerald-400 font-medium">
                  ✓ Zdjęcie załadowane. Model Gemini 4 Argon przeanalizuje stan wizualny i dane z oferty.
                </p>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload-input"
                />
                <label
                  htmlFor="image-upload-input"
                  className="cursor-pointer flex flex-col items-center justify-center py-6 px-4 hover:bg-slate-900/60 rounded-xl transition"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">
                    {lang === 'pl' ? 'Kliknij, aby dodać zrzut ekranu lub zdjęcie oferty' : 'Click to upload offer screenshot or photo'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    Obsługuje JPG, PNG, WebP z aukcji Allegro, OLX, Ceneo itp.
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* URL Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'pl' ? 'Link do oferty (Allegro, OLX, Ceneo, Otomoto, etc.)' : 'Offer Link (Allegro, OLX, Ceneo, etc.)'}
            </span>
            <span className="text-[11px] text-slate-400">Opcjonalnie</span>
          </label>
          <div className="relative">
            <input
              type="url"
              value={input.url}
              onChange={(e) => setInput({ ...input, url: e.target.value })}
              placeholder="https://www.olx.pl/d/oferta/... lub https://allegro.pl/oferta/..."
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Title and Price grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'pl' ? 'Nazwa produktu / Tytuł ogłoszenia' : 'Product Name / Listing Title'} *
            </label>
            <input
              type="text"
              value={input.title}
              onChange={(e) => setInput({ ...input, title: e.target.value })}
              placeholder="Wpisz nazwę przedmiotu lub tytuł ogłoszenia..."
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition font-medium"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'pl' ? 'Cena w ogłoszeniu' : 'Listed Price'}
            </label>
            <div className="flex rounded-xl overflow-hidden border border-slate-800 bg-slate-950 focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500">
              <input
                type="number"
                value={input.price}
                onChange={(e) => setInput({ ...input, price: e.target.value })}
                placeholder="2499"
                className="w-full px-3.5 py-2.5 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono font-semibold"
              />
              <select
                value={input.currency}
                onChange={(e) => setInput({ ...input, currency: e.target.value })}
                className="bg-slate-900 text-xs font-bold text-slate-300 px-3 py-2.5 border-l border-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="PLN">PLN (zł)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Condition, Location & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {lang === 'pl' ? 'Stan przedmiotu' : 'Condition'}
            </label>
            <input
              type="text"
              value={input.condition}
              onChange={(e) => setInput({ ...input, condition: e.target.value })}
              placeholder="np. Używany (bateria 92%) / Nowy"
              className="w-full min-h-[44px] px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {lang === 'pl' ? 'Data Wystawienia' : 'Listing Date'}
            </label>
            <input
              type="date"
              value={input.listingDate || ''}
              onChange={(e) => setInput({ ...input, listingDate: e.target.value })}
              className="w-full min-h-[44px] px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {lang === 'pl' ? 'Lokalizacja i Sprzedawca' : 'Location & Seller'}
            </label>
            <input
              type="text"
              value={input.location}
              onChange={(e) => setInput({ ...input, location: e.target.value })}
              placeholder="np. Warszawa, konto od 2019"
              className="w-full min-h-[44px] px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Description textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'pl' ? 'Opis oferty / Treść ogłoszenia' : 'Listing Description'}
            </span>
            <span className="text-[11px] text-slate-400">Pomaga wykryć ukryte wady i haczyki</span>
          </label>
          <textarea
            rows={2}
            value={input.description}
            onChange={(e) => setInput({ ...input, description: e.target.value })}
            placeholder="Wklej opis z ogłoszenia, aby model sprawdził stan baterii, blokady, dowód zakupu lub podejrzane warunki wysyłki..."
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center text-xs text-slate-400 gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {lang === 'pl' 
              ? 'Wycena rynkowa + Google Search + Analiza ryzyka + Audio dojazdu' 
              : 'Market valuation + Google Search + Risk audit + Commute audio'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Compare Button (Allegro, Ceneo, Amazon, OLX without full deep analysis) */}
          {onStartQuickCompare && (
            <button
              type="button"
              onClick={onStartQuickCompare}
              disabled={!isFormValid || isLoadingComparison || isLoadingDeep}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700 text-xs font-bold text-cyan-300 flex items-center justify-center gap-1.5 transition shadow-sm"
              title="Pobiera ceny tego przedmiotu na Allegro, Ceneo, Amazon.pl i OLX w czasie rzeczywistym bez pełnej analizy"
            >
              <Tag className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingComparison ? 'animate-spin' : ''}`} />
              {isLoadingComparison ? 'Porównuję...' : 'Szybkie Porównanie Sklepów'}
            </button>
          )}

          {/* Quick Scan Button (Low Latency via gemini-3.1-flash-lite) */}
          <button
            type="button"
            onClick={onStartQuickScan}
            disabled={!isFormValid || isLoadingQuick || isLoadingDeep}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 transition shadow-sm"
            title="Błyskawiczna odpowiedź w ułamku sekundy za pomocą gemini-3.1-flash-lite"
          >
            <Zap className={`w-3.5 h-3.5 ${isLoadingQuick ? 'animate-spin' : ''}`} />
            {isLoadingQuick ? 'Skanuję...' : 'Szybki Flash Scan (1s)'}
          </button>

          {/* Deep Comprehensive Analysis (Gemini 4 Argon with High Thinking + Live Search Grounding) */}
          <button
            type="button"
            onClick={onStartDeepAnalysis}
            disabled={!isFormValid || isLoadingDeep || isLoadingQuick}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
          >
            <Sparkles className={`w-4 h-4 ${isLoadingDeep ? 'animate-spin' : ''}`} />
            {isLoadingDeep ? (
              <span className="flex items-center gap-2">
                <span className="animate-pulse">Głęboka analiza z High Thinking...</span>
              </span>
            ) : (
              <span>Uruchom Radar i Wycenę AI</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
