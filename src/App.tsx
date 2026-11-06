import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Radar, 
  Search,
  AlertCircle,
  ShoppingBag,
  ShieldCheck,
  MessageSquare,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { auth, googleProvider, db, syncUserProfile, testConnection, saveAnalyzedOfferToFirestore, saveChatMessageToFirestore } from './lib/firebase';
import { Navbar, ActiveWorkspaceTab } from './components/Navbar';
import { OfferInputForm } from './components/OfferInputForm';
import { PriceGauge } from './components/PriceGauge';
import { MarketSearchResults } from './components/MarketSearchResults';
import { SafetyFlagsCard } from './components/SafetyFlagsCard';
import { NegotiationCard } from './components/NegotiationCard';
import { HistorySidebar } from './components/HistorySidebar';
import { QuickScanCard } from './components/QuickScanCard';
import { PriceComparisonView } from './components/PriceComparisonView';
import { OfferCalendarCard } from './components/OfferCalendarCard';
import { ShoppingAdvisorCard } from './components/ShoppingAdvisorCard';
import { ExpressDealFinder } from './components/ExpressDealFinder';
import { RechartsPriceTrend } from './components/RechartsPriceTrend';
import { PriceAlertTracker } from './components/PriceAlertTracker';
import { MobileTabBar } from './components/MobileTabBar';
import { 
  OfferInput, 
  DeepAnalysisResult, 
  MarketSearchResult, 
  QuickScanResult, 
  HistoryItem,
  PriceComparisonData,
  DateFreshnessResult,
  ShoppingAdvisorMessage,
  InstantDealResult
} from './types';
import { SearchMode } from './types/dealz';

const LOCAL_STORAGE_KEY = 'dealradar_history_v1';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [lang, setLang] = useState<'pl' | 'en'>('pl');
  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('search');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showDetailedForm, setShowDetailedForm] = useState(false);

  // Form input state
  const todayStr = new Date().toISOString().split('T')[0];
  const [input, setInput] = useState<OfferInput>({
    url: '',
    title: '',
    price: '',
    currency: 'PLN',
    condition: '',
    description: '',
    location: '',
    sellerType: '',
    listingDate: todayStr,
    imageBase64: null,
    imageMimeType: 'image/jpeg',
  });

  // Results state
  const [quickScan, setQuickScan] = useState<QuickScanResult | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysisResult | null>(null);
  const [marketSearch, setMarketSearch] = useState<MarketSearchResult | null>(null);
  const [priceComparison, setPriceComparison] = useState<PriceComparisonData | null>(null);
  const [freshnessResult, setFreshnessResult] = useState<DateFreshnessResult | null>(null);
  const [advisorMessages, setAdvisorMessages] = useState<ShoppingAdvisorMessage[]>([]);
  const [instantDealResult, setInstantDealResult] = useState<InstantDealResult | null>(null);
  const [isLoadingInstantDeals, setIsLoadingInstantDeals] = useState(false);

  // Loading states
  const [isLoadingDeep, setIsLoadingDeep] = useState(false);
  const [isLoadingQuick, setIsLoadingQuick] = useState(false);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [isLoadingFreshness, setIsLoadingFreshness] = useState(false);
  const [isLoadingAdvisor, setIsLoadingAdvisor] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Firebase Auth & test database connection
  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        syncUserProfile(user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync History with Firestore if user is logged in
  useEffect(() => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'users', currentUser.uid, 'offers'));
      const unsub = onSnapshot(q, (snapshot) => {
        const firestoreOffers: HistoryItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const offeredP = Number(data.price) || 0;
          const estMarketP = Number(data.estimatedMarketPrice) || offeredP;
          const diffAmt = estMarketP - offeredP;
          const diffPct = estMarketP > 0 ? Math.round((diffAmt / estMarketP) * 100) : 0;
          
          return {
            id: data.id || docSnap.id,
            timestamp: new Date(data.createdAt || Date.now()).getTime(),
            title: data.title,
            price: String(offeredP),
            currency: 'PLN',
            verdict: data.verdict || 'SZUKAJ DALEJ',
            score: data.dealScore || 50,
            analysis: {
              product: {
                identifiedName: data.title,
                category: 'Elektronika / Przedmiot',
                detectedCondition: 'Używany / Sprawdzony',
                specsSummary: 'Oferta zapisana w Firestore',
                stockAvailability: 'unknown'
              },
              pricing: {
                offeredPrice: offeredP,
                fairMarketPrice: estMarketP,
                marketMinPrice: Math.round(estMarketP * 0.9),
                marketMaxPrice: Math.round(estMarketP * 1.1),
                medianPrice: estMarketP,
                priceDifferenceAmount: diffAmt,
                priceDifferencePercentage: diffPct,
                currency: 'PLN',
                isBelowMarket: diffAmt > 0
              },
              dealScore: {
                score: data.dealScore || 50,
                ratingLabel: data.verdict || 'SZUKAJ DALEJ',
                recommendation: data.verdict === 'BIERZ TERAZ' ? 'KUPUJ' : 'NEGOCJUJ',
                rationale: 'Zapisano w bazie Firestore'
              },
              safetyAndRedFlags: [],
              negotiationStrategy: {
                suggestedOffer: Math.round(offeredP * 0.9),
                maxWalkingPrice: offeredP,
                leveragePoints: ['Rynkowy dołek cenowy', 'Brak akcesoriów'],
                readyMessageToSeller: `Dzień dobry, proponuję ${Math.round(offeredP * 0.9)} PLN.`
              },
              depreciationForecast: 'Stabilna rynkowo',
              audioBriefingScript: ''
            }
          };
        });
        if (firestoreOffers.length > 0) {
          setHistory(firestoreOffers);
        }
      }, (err) => {
        console.warn('Firestore offers subscription warning:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Could not setup Firestore offers snapshot', e);
    }
  }, [currentUser]);

  // Load history from localStorage as fallback
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load history from localStorage', e);
    }
  }, []);

  // Save history to localStorage & Firestore
  const saveToHistory = (item: HistoryItem) => {
    setHistory((prev) => {
      const updated = [item, ...prev.filter((i) => i.id !== item.id)].slice(0, 20);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save to localStorage', e);
      }
      return updated;
    });

    if (currentUser) {
      saveAnalyzedOfferToFirestore(currentUser.uid, {
        id: item.id,
        title: item.title,
        url: input.url,
        price: Number(item.price) || 0,
        estimatedMarketPrice: item.analysis.pricing.fairMarketPrice,
        verdict: item.analysis.dealScore.ratingLabel as any,
        dealScore: item.score
      }).catch(err => console.warn('Firestore offer save error:', err));
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setDeepAnalysis(item.analysis);
    setInput({
      url: '',
      title: item.title,
      price: item.price,
      currency: item.currency,
      condition: item.analysis.product.detectedCondition || '',
      description: '',
      location: '',
      sellerType: '',
      listingDate: todayStr,
      imageBase64: null,
      imageMimeType: 'image/jpeg',
    });
    setActiveTab('forensics');
  };

  const handleLoginWithGoogle = async () => {
    try {
      setErrorMessage(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google Auth popup warning:', err);
      setErrorMessage('Logowanie z Google nie mogło zostać ukończone.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Logout error:', err);
    }
  };

  // 1. FAST SCAN
  const handleQuickScan = async () => {
    try {
      setErrorMessage(null);
      setIsLoadingQuick(true);
      const res = await fetch('/api/quick-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          price: input.price,
          currency: input.currency,
          url: input.url,
          description: input.description,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Błąd szybkiego skanowania.');
      }

      setQuickScan(json.data);
    } catch (err: any) {
      console.error('Quick scan error:', err);
      setErrorMessage(err.message || 'Wystąpił problem z szybkim skanem.');
    } finally {
      setIsLoadingQuick(false);
    }
  };

  // 2. LIVE MARKET SEARCH
  const fetchMarketSearch = async (productQuery: string, currentPrice?: string): Promise<string> => {
    try {
      setIsLoadingMarket(true);
      const res = await fetch('/api/search-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productQuery,
          currentPrice,
          currency: input.currency,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMarketSearch({
          text: json.text,
          sources: json.sources || [],
        });
        return json.text || '';
      }
      return '';
    } catch (err) {
      console.warn('Market search failed:', err);
      return '';
    } finally {
      setIsLoadingMarket(false);
    }
  };

  // 3. MULTI-STORE PRICE COMPARATOR
  const fetchPriceComparison = async (productName: string, targetPrice?: string) => {
    try {
      setIsLoadingComparison(true);
      const res = await fetch('/api/compare-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          targetPrice: targetPrice || input.price,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setPriceComparison(json.data);
      }
    } catch (err) {
      console.warn('Compare prices failed:', err);
    } finally {
      setIsLoadingComparison(false);
    }
  };

  const handleStartQuickCompare = async () => {
    const term = input.title.trim() || input.url.trim() || 'Przedmiot';
    if (!term) return;
    setActiveTab('compare');
    await fetchPriceComparison(term, input.price);
  };

  // 4. DATE & FRESHNESS VERIFICATION
  const checkDateFreshness = async (dateStr: string) => {
    try {
      setIsLoadingFreshness(true);
      const res = await fetch('/api/check-date-freshness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingDate: dateStr,
          title: input.title,
          price: input.price,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setFreshnessResult(json.data);
      }
    } catch (err) {
      console.warn('Date freshness failed:', err);
    } finally {
      setIsLoadingFreshness(false);
    }
  };

  // 4b. INSTANT FIND DEALS
  const handleInstantFindDeals = async (searchTerm: string, targetPrice?: string, imageBase64?: string | null, mode?: SearchMode) => {
    try {
      setErrorMessage(null);
      setIsLoadingInstantDeals(true);

      const res = await fetch('/api/instant-find-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchTerm,
          price: targetPrice,
          imageBase64,
          mode: mode || 'exact',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Błąd wyszukiwania okazji.');
      }

      const resData: InstantDealResult = json.data;
      setInstantDealResult(resData);

      setInput((prev) => ({
        ...prev,
        title: resData.targetProduct.title || searchTerm,
        price: targetPrice || String(resData.targetProduct.identifiedPrice),
        url: searchTerm.startsWith('http') ? searchTerm : prev.url,
      }));

      if (resData.verdict === 'BIERZ TERAZ') {
        try {
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#fbbf24', '#38bdf8'],
          });
        } catch (e) {
          // ignore
        }
      }
    } catch (err: any) {
      console.error('Instant find deals error:', err);
      setErrorMessage(err.message || 'Wystąpił błąd przy wyszukiwaniu ofert na żywo.');
    } finally {
      setIsLoadingInstantDeals(false);
    }
  };

  // 5. INTERACTIVE SHOPPING ADVISOR CHAT
  const handleSendAdvisorMessage = async (messageText: string) => {
    const userMsg: ShoppingAdvisorMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };

    setAdvisorMessages((prev) => [...prev, userMsg]);
    setIsLoadingAdvisor(true);

    if (currentUser) {
      saveChatMessageToFirestore(currentUser.uid, {
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content
      }).catch(err => console.warn('Firestore chat save warning:', err));
    }

    try {
      const res = await fetch('/api/shopping-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          productContext: deepAnalysis?.product?.identifiedName || input.title,
          currentPrice: input.price,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const assistantMsg: ShoppingAdvisorMessage = {
          id: 'asst_' + Date.now(),
          role: 'assistant',
          content: json.answer,
          timestamp: Date.now(),
          sources: json.sources || [],
        };
        setAdvisorMessages((prev) => [...prev, assistantMsg]);

        if (currentUser) {
          saveChatMessageToFirestore(currentUser.uid, {
            id: assistantMsg.id,
            role: assistantMsg.role,
            content: assistantMsg.content
          }).catch(err => console.warn('Firestore chat save warning:', err));
        }
      } else {
        throw new Error(json.error || 'Błąd odpowiedzi asystenta.');
      }
    } catch (err: any) {
      const errorMsg: ShoppingAdvisorMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: 'Przepraszam, wystąpił chwilowy problem z siecią: ' + (err.message || 'Brak połączenia'),
        timestamp: Date.now(),
      };
      setAdvisorMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoadingAdvisor(false);
    }
  };

  // 6. DEEP ANALYSIS
  const handleStartDeepAnalysis = async () => {
    try {
      setErrorMessage(null);
      setIsLoadingDeep(true);

      const targetTitle = input.title || 'elektronika / przedmiot aukcji';

      const [liveMarketContext] = await Promise.all([
        fetchMarketSearch(targetTitle, input.price),
        fetchPriceComparison(targetTitle, input.price),
        checkDateFreshness(input.listingDate || todayStr),
      ]);

      const res = await fetch('/api/deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          price: input.price,
          currency: input.currency,
          url: input.url,
          description: input.description,
          condition: input.condition,
          location: input.location,
          sellerType: input.sellerType,
          imageBase64: input.imageBase64,
          imageMimeType: input.imageMimeType,
          liveMarketContext,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Błąd głębokiej analizy.');
      }

      const result: DeepAnalysisResult = json.data;
      setDeepAnalysis(result);
      setActiveTab('forensics');

      if (result.dealScore.score >= 80) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#fbbf24', '#38bdf8'],
          });
        } catch (e) {
          // ignore
        }
      }

      const historyItem: HistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: Date.now(),
        title: result.product.identifiedName || input.title || 'Aukcja',
        price: input.price || String(result.pricing.offeredPrice),
        currency: input.currency,
        verdict: result.dealScore.ratingLabel,
        score: result.dealScore.score,
        analysis: result,
      };
      saveToHistory(historyItem);

      setAdvisorMessages([]);

      setTimeout(() => {
        const el = document.getElementById('analysis-results-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 200);
    } catch (err: any) {
      console.error('Deep analysis error:', err);
      setErrorMessage(err.message || 'Wystąpił problem podczas szczegółowej analizy oferty.');
    } finally {
      setIsLoadingDeep(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200 pb-20 md:pb-8 relative overflow-x-hidden">
      {/* Background Subtle Ambient Lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-amber-500/5 via-slate-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Unified Navigation Bar */}
      <Navbar
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        lang={lang}
        onToggleLang={() => setLang(lang === 'pl' ? 'en' : 'pl')}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        currentUser={currentUser}
        onLoginWithGoogle={handleLoginWithGoogle}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Executive Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3 pt-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Wyszukiwarka i Wyceniarka Zakupowa{' '}
            <span className="text-amber-400">
              DealZ
            </span>
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 max-w-2xl mx-auto">
            <span>Analiza ofert na żywo</span>
            <span aria-hidden="true">·</span>
            <span>Porównywarka cen w sklepach</span>
            <span aria-hidden="true">·</span>
            <span>Weryfikacja autentyczności i zamienniki</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-400 hover:text-white px-2 py-1 rounded"
            >
              Zamknij
            </button>
          </div>
        )}

        {/* Desktop Workspace Segment Control Bar */}
        <div className="hidden md:flex items-center justify-center pt-2">
          <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800/80 backdrop-blur-xl shadow-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'search'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Wyszukiwarka Ofert</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('compare')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'compare'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Porównywarka Sklepów</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('forensics')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'forensics'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Analiza & Forensics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('advisor')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'advisor'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Doradca AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alert')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'alert'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Alert Cenowy</span>
            </button>
          </div>
        </div>

        {/* WORKSPACE VIEW 1: WYSZUKIWARKA OFERT */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <ExpressDealFinder
              onSearch={handleInstantFindDeals}
              isLoading={isLoadingInstantDeals}
              result={instantDealResult}
            />

            {/* Toggle for Deep Inspection / Custom Form */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDetailedForm(!showDetailedForm)}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between transition shadow-md"
              >
                <span>Formularz Głębocizny i Wyceniarki Aukcji (Wklej własny opis / stan / link)</span>
                {showDetailedForm ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showDetailedForm && (
                <div className="mt-4">
                  <OfferInputForm
                    input={input}
                    setInput={setInput}
                    onStartDeepAnalysis={handleStartDeepAnalysis}
                    onStartQuickScan={handleQuickScan}
                    onStartQuickCompare={handleStartQuickCompare}
                    isLoadingDeep={isLoadingDeep}
                    isLoadingQuick={isLoadingQuick}
                    isLoadingComparison={isLoadingComparison}
                    lang={lang}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* WORKSPACE VIEW 2: PORÓWNYWARKA SKLEPÓW */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <PriceComparisonView
              data={priceComparison}
              isLoading={isLoadingComparison}
              onRefreshComparison={() => fetchPriceComparison(input.title || input.url || 'Przedmiot', input.price)}
              productName={input.title || input.url || 'Przedmiot'}
            />
          </div>
        )}

        {/* WORKSPACE VIEW 3: ANALIZA & FORENSICS */}
        {activeTab === 'forensics' && (
          <div id="analysis-results-section" className="space-y-6">
            {deepAnalysis ? (
              <>
                {/* Primary Price Gauge & Score Card */}
                <PriceGauge data={deepAnalysis} lang={lang} />

                {/* Recharts Price Trend Chart Section */}
                <RechartsPriceTrend
                  data={priceComparison?.priceHistory30d}
                  currentPrice={deepAnalysis.pricing.offeredPrice}
                  fairMarketPrice={deepAnalysis.pricing.fairMarketPrice}
                  productName={deepAnalysis.product.identifiedName}
                  currency={deepAnalysis.pricing.currency}
                />

                {/* Two-Column Grid: Safety Flags vs Negotiation Strategy */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Safety & Scam Audit */}
                  <SafetyFlagsCard
                    flags={deepAnalysis.safetyAndRedFlags}
                    recommendation={deepAnalysis.dealScore.recommendation}
                    lang={lang}
                  />

                  {/* Negotiation Strategy & Copy Template */}
                  <NegotiationCard
                    data={deepAnalysis}
                    lang={lang}
                  />
                </div>

                {/* Real-Time Market Search Results with Grounding Links & Visual Image Diff */}
                <MarketSearchResults
                  results={marketSearch}
                  onRefresh={() => fetchMarketSearch(deepAnalysis.product.identifiedName, String(deepAnalysis.pricing.offeredPrice))}
                  isLoading={isLoadingMarket}
                  productName={deepAnalysis.product.identifiedName}
                  originalImage={input.imageBase64}
                />
              </>
            ) : (
              <div className="py-12 px-4 text-center bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
                <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">Brak aktywnej głębokiej analizy</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Wpisz przedmiot lub link w zakładce Wyszukiwarka Ofert i kliknij "Uruchom Radar i Wycenę AI", aby uzyskać kompletny raport opłacalności.
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-md"
                >
                  Przejdź do Wyszukiwarki
                </button>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE VIEW 4: DORADCA AI */}
        {activeTab === 'advisor' && (
          <div className="space-y-6">
            <ShoppingAdvisorCard
              productTitle={deepAnalysis?.product?.identifiedName || input.title || 'Przedmiot'}
              currentPrice={input.price}
              messages={advisorMessages}
              onSendMessage={handleSendAdvisorMessage}
              isLoading={isLoadingAdvisor}
            />
          </div>
        )}

        {/* WORKSPACE VIEW 5: ALERT CENOWY & FRESHNESS */}
        {activeTab === 'alert' && (
          <div className="space-y-6">
            <PriceAlertTracker
              currentProductTitle={deepAnalysis?.product?.identifiedName || input.title || 'Przedmiot'}
              currentProductPrice={deepAnalysis?.pricing?.offeredPrice || Number(input.price) || 0}
              currentProductUrl={input.url}
              userId={currentUser?.uid}
            />

            <OfferCalendarCard
              currentListingDate={input.listingDate || todayStr}
              onDateChange={(d) => setInput((prev) => ({ ...prev, listingDate: d }))}
              freshnessResult={freshnessResult}
              onCheckFreshness={checkDateFreshness}
              isLoadingFreshness={isLoadingFreshness}
              productTitle={deepAnalysis?.product?.identifiedName || input.title || 'Przedmiot'}
            />
          </div>
        )}

        {/* Fast Low-Latency Scan Card */}
        {quickScan && (
          <QuickScanCard
            result={quickScan}
            onDismiss={() => setQuickScan(null)}
            lang={lang}
          />
        )}
      </main>

      {/* History Drawer */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={history}
        onSelectItem={handleSelectHistoryItem}
        onClearHistory={handleClearHistory}
        onDeleteSingleItem={handleDeleteHistoryItem}
        lang={lang}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileTabBar
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        hasComparisonData={Boolean(priceComparison)}
        historyCount={history.length}
      />

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Radar className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-300">DealZ AI Engine</span>
            <span>• Inteligentna Wyszukiwarka i Wyceniarka Zakupowa</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-500">
            <span>Powered by Gemini 4 Argon · Gemini 3.8 Flash · Firestore DB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

