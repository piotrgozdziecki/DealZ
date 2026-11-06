import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  ExternalLink, 
  Lightbulb, 
  HelpCircle,
  TrendingDown,
  ShieldCheck
} from 'lucide-react';
import { ShoppingAdvisorMessage, WebSource } from '../types';

interface ShoppingAdvisorCardProps {
  productTitle: string;
  currentPrice: string;
  messages: ShoppingAdvisorMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
}

export const ShoppingAdvisorCard: React.FC<ShoppingAdvisorCardProps> = ({
  productTitle,
  currentPrice,
  messages,
  onSendMessage,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');

  const quickPrompts = [
    'Czy ta cena w obecnej chwili naprawdę się opłaca?',
    'Znajdź mi 2-3 tańsze lub bardziej opłacalne alternatywy w tym budżecie',
    'Jakie są typowe wady tego modelu i na co uważać przed zakupem?',
    'Napisz dla mnie propozycję negocjacji ceny dla sprzedawcy',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const msg = inputText.trim();
    setInputText('');
    onSendMessage(msg);
  };

  const handleQuickPromptClick = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Asystent Zakupowy & Wyszukiwarka Alternatyw
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300">
                gemini-3.8-flash + Search
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Zapytaj AI czy oferta się opłaca, poproś o lepsze alternatywy lub radę negocjacyjną.
            </p>
          </div>
        </div>
      </div>

      {/* 1-Click Quick Prompts */}
      <div>
        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
          Szybkie pytania (kliknij, aby zapytać):
        </span>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickPromptClick(prompt)}
              className="text-left min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-xs text-slate-300 hover:text-white transition font-medium disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Message Stream */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400 py-6">
            <Bot className="w-7 h-7 text-purple-400/60 mx-auto mb-2" />
            <p className="font-medium text-slate-300">
              Asystent jest gotowy do oceny oferty dla: &quot;{productTitle || 'badany produkt'}&quot;
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Wybierz jedno z szybkich pytań powyżej lub wpisz własne zapytanie poniżej.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-xl text-xs leading-relaxed transition ${
                msg.role === 'user'
                  ? 'bg-purple-950/40 border border-purple-800/50 text-purple-100 ml-6'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 mr-6'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold mb-1 text-[11px] text-slate-400">
                {msg.role === 'user' ? (
                  <>
                    <User className="w-3.5 h-3.5 text-purple-300" />
                    <span>Ty:</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-purple-300">Doradca Zakupowy AI:</span>
                  </>
                )}
              </div>
              <div className="whitespace-pre-line">{msg.content}</div>

              {/* Citations / Web sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Źródła:</span>
                  {msg.sources.slice(0, 3).map((s, i) => (
                    <a
                      key={i}
                      href={s.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                    >
                      <span className="truncate max-w-[120px]">{s.title || 'Link'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span>Asystent sprawdza rynek i przygotowuje odpowiedź...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Wpisz pytanie (np. Czy opłaca się brać ten egzemplarz za 1900 zł?)..."
          className="flex-1 min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="min-h-[44px] px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-purple-600/20 shrink-0"
        >
          <span>Wyślij</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
